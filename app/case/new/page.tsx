import { CaseForm } from "@/components/CaseForm";
import { getRole } from "@/lib/auth";
import { isCaptureRole } from "@/lib/constants";
import { deviceFromRequestHeaders } from "@/lib/device";
import { getT } from "@/lib/i18n/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function NewCasePage() {
  const role = await getRole();
  if (!isCaptureRole(role)) redirect("/");
  const consentId = (await cookies()).get("petderm-consent")?.value;
  if (!consentId) redirect("/");
  const { locale, t } = await getT();
  const detectedDevice = deviceFromRequestHeaders(await headers());

  return (
    <div className="space-y-3">
      <p className="page-kicker">{t("newCase.kicker")}</p>
      <h2 className="page-title">{t("newCase.title")}</h2>
      <CaseForm role={role} locale={locale} detectedDevice={detectedDevice} />
    </div>
  );
}
