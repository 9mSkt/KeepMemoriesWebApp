import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keep Memories",
  description: "Snap wedding photos with a vintage film look and send them to the couple's album.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FBF7F0",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(stored) ? stored : "en";
  return (
    <html lang={locale} className={fontVariables}>
      <body className="antialiased">
        <I18nProvider initialLocale={locale}>
          {/* Mobile-first; on desktop the app sits in a centred 430 px column. */}
          <div className="mx-auto min-h-dvh w-full max-w-[430px]">{children}</div>
        </I18nProvider>
      </body>
    </html>
  );
}
