import { NextResponse } from "next/server";
import { CONSENT_VERSION } from "@/lib/constants";
import { cookieOpts } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const signerName = String(body.signerName ?? "").trim();
  if (!signerName) {
    return NextResponse.json({ error: "請填寫簽署人" }, { status: 400 });
  }
  const consent = await prisma.consent.create({
    data: {
      version: CONSENT_VERSION,
      signerName,
      secondaryUse: Boolean(body.secondaryUse),
    },
  });
  const response = NextResponse.json({ id: consent.id, version: consent.version });
  response.cookies.set("petderm-consent", consent.id, cookieOpts(true));
  return response;
}

