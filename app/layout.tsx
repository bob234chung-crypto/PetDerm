import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";
import { BrandMark } from "@/components/BrandMark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { getRole } from "@/lib/auth";
import { isCaptureRole } from "@/lib/constants";
import { HTML_LANG } from "@/lib/i18n/locale";
import { getLocale } from "@/lib/i18n/server";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PetDerm 手機相片研究原型",
  description: "犬隻皮膚／皮下腫塊手機相片研究分流原型。非診斷工具。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const role = await getRole();
  const locale = await getLocale();
  const captureShell = isCaptureRole(role);

  return (
    <html lang={HTML_LANG[locale]}>
      <body className={`${nunito.className} ${nunito.variable} ${fraunces.variable}`}>
        <div className={captureShell ? "mx-auto min-h-screen max-w-phone phone-shell" : "min-h-screen bg-paper"}>
          <header className="px-5 pb-2 pt-5">
            <div className="flex items-center justify-between gap-3">
              <BrandMark compact />
              <div className="flex items-start gap-2">
                <LanguageSwitcher locale={locale} />
                <RoleSwitcher role={role} locale={locale} />
              </div>
            </div>
          </header>
          <main className={captureShell ? "px-5 pb-10 pt-2" : "mx-auto max-w-5xl px-5 py-6"}>{children}</main>
        </div>
      </body>
    </html>
  );
}
