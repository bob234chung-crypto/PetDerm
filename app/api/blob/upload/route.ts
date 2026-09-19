import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getRole } from "@/lib/auth";
import { isCaptureRole } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const role = await getRole();
  if (!isCaptureRole(role)) {
    return NextResponse.json({ error: "僅一般用戶或診所人員可上傳" }, { status: 403 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/jpg"],
        addRandomSuffix: true,
        maximumSizeInBytes: 12 * 1024 * 1024,
      }),
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "blob upload failed" },
      { status: 400 },
    );
  }
}
