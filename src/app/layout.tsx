import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { getSystemSettings } from "@/lib/repositories/systemSettings";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "ParkSpace - Car Space Renting System",
  description: "Find and rent parking spaces easily",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    title: "ParkSpace - Car Space Renting System",
    description: "Find and rent parking spaces easily",
    type: "website",
  },
};

function getSessionRoleFromCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as { user?: { role?: string } };
    return parsed.user?.role ?? null;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RootLayoutInner>{children}</RootLayoutInner>;
}

async function RootLayoutInner({ children }: { children: React.ReactNode }) {
  const [cookieStore, settings] = await Promise.all([cookies(), getSystemSettings()]);
  const role = getSessionRoleFromCookie(cookieStore.get("parkspace_session")?.value);
  const maintenanceMode = settings.maintenanceMode === true;
  const isAdmin = role === "admin";
  const showMaintenance = maintenanceMode && !isAdmin;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ReactQueryProvider>
          {showMaintenance ? (
            <main className="min-h-screen flex items-center justify-center px-6">
              <div className="max-w-xl w-full rounded-2xl border border-white/20 bg-slate-950/80 p-8 text-center">
                <h1 className="text-3xl font-bold text-white mb-3">We&apos;ll be back soon</h1>
                <p className="text-white/80">
                  {settings.siteName} is currently under scheduled maintenance. Please check back shortly.
                </p>
              </div>
            </main>
          ) : (
            <>
              <Navigation />
              {children}
              <Footer />
            </>
          )}
        </ReactQueryProvider>
      </body>
    </html>
  );
}
