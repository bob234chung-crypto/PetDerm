import { cookies } from "next/headers";
import { ROLE_COOKIE, ROLES, type Role } from "./constants";

export async function getRole(): Promise<Role> {
  const jar = await cookies();
  const value = jar.get(ROLE_COOKIE)?.value;
  if (value && (ROLES as readonly string[]).includes(value)) {
    return value as Role;
  }
  return "user";
}

export function assertRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) {
    const err = new Error("角色無權限存取此資源") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
}
