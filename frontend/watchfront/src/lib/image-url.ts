export function normalizeImageURL(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const url = value.trim();
  if (!url) {
    return "";
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  return url.startsWith("/") ? url : `https://${url}`;
}
