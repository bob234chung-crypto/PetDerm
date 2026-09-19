import { cookies } from "next/headers";
import { getRole } from "./auth";
import { isCaptureRole } from "./constants";

export async function captureOwnsConsent(consentId: string) {
  const role = await getRole();
  if (!isCaptureRole(role)) return true;
  const cookie = (await cookies()).get("petderm-consent")?.value;
  return Boolean(cookie && cookie === consentId);
}
