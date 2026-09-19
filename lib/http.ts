export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function cookieOpts(httpOnly: boolean) {
  return {
    httpOnly,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.VERCEL === "1" || process.env.NODE_ENV === "production",
  };
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
