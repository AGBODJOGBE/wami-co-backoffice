const requiredPublic = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export const env = {
  apiBaseUrl: requiredPublic(
    "NEXT_PUBLIC_API_BASE_URL",
    "http://localhost:3001",
  ).replace(/\/$/, ""),
  isProd: process.env.NODE_ENV === "production",
};
