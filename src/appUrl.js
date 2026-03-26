function getAppBaseUrl() {
  if (typeof window === "undefined") {
    return import.meta.env.BASE_URL || "/";
  }

  const currentUrl = new URL(window.location.href);
  currentUrl.search = "";
  currentUrl.hash = "";

  if (!currentUrl.pathname.endsWith("/")) {
    currentUrl.pathname = `${currentUrl.pathname}/`;
  }

  return currentUrl.toString();
}

export function appUrl(path) {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return new URL(normalizedPath, getAppBaseUrl()).toString();
}
