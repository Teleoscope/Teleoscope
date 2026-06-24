function normalizeBaseUrl(value: string | undefined | null): string {
  return (value ?? "").trim().replace(/\/+$/, "");
}

function normalizePath(path: string): string {
  if (!path) {
    return "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
}

export function getProductBaseUrl(): string {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_PRODUCT_BASE_URL);
}

export function productRoute(path: string): string {
  const normalizedPath = normalizePath(path);
  const baseUrl = getProductBaseUrl();
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}
