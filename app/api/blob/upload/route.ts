import { NextResponse } from "next/server";
import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { getRole } from "@/lib/auth";
import { isCaptureRole } from "@/lib/constants";
import { PHOTO_QC } from "@/lib/photo-protocol";

export const runtime = "nodejs";

const IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/*",
];

export async function POST(request: Request) {
  const role = await getRole();
  if (!isCaptureRole(role)) {
    return NextResponse.json({ error: "僅一般用戶或診所人員可上傳" }, { status: 403 });
  }

  const body = (await request.json()) as HandleUploadPresignedBody;

  try {
    const jsonResponse = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: IMAGE_TYPES,
          maximumSizeInBytes: PHOTO_QC.maxFileBytes,
        });
        return {
          token,
          urlOptions: {
            addRandomSuffix: true,
            allowedContentTypes: IMAGE_TYPES,
            maximumSizeInBytes: PHOTO_QC.maxFileBytes,
          },
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("blob upload", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "blob upload failed" },
      { status: 400 },
    );
  }
}
