import { usesBlobStorage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ blob: usesBlobStorage() });
}
