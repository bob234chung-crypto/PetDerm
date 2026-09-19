"use client";

import { useRouter } from "next/navigation";
import { ROLES, type Role } from "@/lib/constants";
import { t, type Locale } from "@/lib/i18n";

export function RoleSwitcher({ role, locale }: { role: Role; locale: Locale }) {
  const router = useRouter();

  async function onChange(next: Role) {
    await fetch("/api/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    if (next === "reviewer") router.push("/review/pathology");
    else if (next === "monitor") router.push("/monitor");
    else router.push("/");
    router.refresh();
  }

  return (
    <label className="block text-right text-[10px] font-extrabold tracking-wide text-mist">
      {t(locale, "role")}
      <select
        className="mt-1 block rounded-full border-0 bg-cream px-3 py-1.5 text-xs font-bold text-ink"
        value={role}
        onChange={(event) => onChange(event.target.value as Role)}
      >
        {ROLES.map((item) => (
          <option key={item} value={item}>
            {t(locale, `roles.${item}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
