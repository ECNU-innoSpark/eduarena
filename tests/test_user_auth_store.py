import json
import tempfile
import unittest
from pathlib import Path

from user_auth_store import AuthError, UserAuthPaths, UserAuthStore


def build_store(root: Path) -> UserAuthStore:
    return UserAuthStore(
        UserAuthPaths(
            root=root,
            users_file=root / "users.json",
        )
    )


class UserAuthStoreTest(unittest.TestCase):
    def test_authenticate_or_create_user_persists_hashed_password(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            store = build_store(Path(tmp_dir))

            result = store.authenticate_or_create_user(
                {"name": "Alice", "email": " Alice@Example.com ", "password": "secret"}
            )

            self.assertTrue(result["isNewUser"])
            self.assertEqual(result["user"]["email"], "alice@example.com")
            saved = json.loads(store.paths.users_file.read_text(encoding="utf-8"))
            user = saved["users"]["alice@example.com"]
            self.assertEqual(user["name"], "Alice")
            self.assertEqual(user["email"], "alice@example.com")
            self.assertNotIn("password", user)
            self.assertNotEqual(user["password_hash"], "secret")
            self.assertTrue(user["password_salt"])

    def test_authenticate_existing_user_requires_correct_password(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            store = build_store(Path(tmp_dir))
            store.authenticate_or_create_user(
                {"name": "Alice", "email": "alice@example.com", "password": "secret"}
            )

            result = store.authenticate_or_create_user(
                {"name": "Alice 2", "email": "alice@example.com", "password": "secret"}
            )
            self.assertFalse(result["isNewUser"])
            self.assertEqual(result["user"]["name"], "Alice 2")

            with self.assertRaises(AuthError) as context:
                store.authenticate_or_create_user(
                    {"name": "Alice", "email": "alice@example.com", "password": "wrong"}
                )

            self.assertEqual(context.exception.status, 401)


if __name__ == "__main__":
    unittest.main()
