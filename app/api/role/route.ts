import { cookieOpts } from "@/lib/http";
import { NextResponse } from "next/server";
import { ROLE_COOKIE, ROLES } from "@/lib/constants";

export async function POST(request: Request) {
  const body = await request.json();
  const role = body.role;
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "未知角色" }, { status: 400 });
  }
  const response = NextResponse.json({ role });
  response.cookies.set(ROLE_COOKIE, role, cookieOpts(false));
  return response;
}

