import { NextResponse } from "next/server";
import { cookieOpts } from "@/lib/http";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/locale";

export async function POST(request: Request) {
  const body = await request.json();
  const locale = String(body.locale ?? "");
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "unknown locale" }, { status: 400 });
  }
  const response = NextResponse.json({ locale });
  response.cookies.set(LOCALE_COOKIE, locale, cookieOpts(false));
  return response;
}
