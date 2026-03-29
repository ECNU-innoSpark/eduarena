#!/usr/bin/env python3

import hashlib
import hmac
import json
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class AuthError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def trim_text(value):
    return value.strip() if isinstance(value, str) else ""


def read_json(file_path, fallback=None):
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def ensure_dir(path):
    path.mkdir(parents=True, exist_ok=True)


@dataclass(frozen=True)
class UserAuthPaths:
    root: Path
    users_file: Path


class UserAuthStore:
    def __init__(self, paths):
        self.paths = paths

    def read_users_file(self):
        return read_json(self.paths.users_file, {"version": 1, "updatedAt": None, "users": {}})

    def write_users_file(self, payload):
        ensure_dir(self.paths.users_file.parent)
        self.paths.users_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def hash_password(self, password, salt):
        return hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt),
            120000,
        ).hex()

    def verify_password(self, password, salt, expected_hash):
        actual_hash = self.hash_password(password, salt)
        return hmac.compare_digest(actual_hash, expected_hash)

    def build_public_user(self, user):
        return {
            "name": user.get("name"),
            "email": user.get("email"),
            "createdAt": user.get("createdAt"),
            "updatedAt": user.get("updatedAt"),
            "lastLoginAt": user.get("lastLoginAt"),
        }

    def authenticate_or_create_user(self, payload):
        if not isinstance(payload, dict):
            raise AuthError("Invalid auth payload")

        name = trim_text(payload.get("name"))
        email = trim_text(payload.get("email")).lower()
        password = str(payload.get("password") or "")

        if not name:
            raise AuthError("Missing user name")
        if not EMAIL_PATTERN.match(email):
            raise AuthError("Invalid email")
        if len(password) < 4:
            raise AuthError("Password must be at least 4 characters")

        current_file = self.read_users_file()
        users = dict(current_file.get("users", {}))
        existing_user = users.get(email)
        now = datetime.now(timezone.utc).isoformat()

        if existing_user:
            password_salt = trim_text(existing_user.get("password_salt"))
            password_hash = trim_text(existing_user.get("password_hash"))
            if not password_salt or not password_hash or not self.verify_password(password, password_salt, password_hash):
                raise AuthError("Invalid email or password", status=401)

            next_user = {
                **existing_user,
                "name": name,
                "email": email,
                "updatedAt": now,
                "lastLoginAt": now,
            }
            is_new_user = False
        else:
            password_salt = secrets.token_hex(16)
            next_user = {
                "name": name,
                "email": email,
                "password_salt": password_salt,
                "password_hash": self.hash_password(password, password_salt),
                "createdAt": now,
                "updatedAt": now,
                "lastLoginAt": now,
            }
            is_new_user = True

        users[email] = next_user
        next_file = {
            "version": current_file.get("version", 1),
            "updatedAt": now,
            "users": users,
        }
        self.write_users_file(next_file)

        return {
            "user": self.build_public_user(next_user),
            "isNewUser": is_new_user,
        }


def create_default_auth_store(root=None):
    base_root = (root or Path(__file__).resolve().parent).resolve()
    paths = UserAuthPaths(
        root=base_root,
        users_file=base_root / "data/qualitative/users.json",
    )
    return UserAuthStore(paths)
