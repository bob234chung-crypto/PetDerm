import { getRole } from "@/lib/auth";
import { captureOwnsConsent } from "@/lib/access";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { readObject } from "@/lib/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ photoId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const role = await getRole();
  if (!role) return jsonError("未授權", 403);
  const { photoId } = await ctx.params;
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { session: { include: { lesion: { include: { dog: true } } } } },
  });
  if (!photo) return jsonError("找不到相片", 404);
  if (!(await captureOwnsConsent(photo.session.lesion.dog.consentId))) {
    return jsonError("未授權存取此相片", 403);
  }

  try {
    const bytes = await readObject(photo.researchPath);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return jsonError("檔案不存在", 404);
  }
}
