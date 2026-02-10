import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AccessibilityProvider } from "@/components/a11y/AccessibilityContext";
import AccessibilityWidget from "@/components/a11y/AccessibilityWidget";
import KeyboardNavigation from "@/components/a11y/KeyboardNavigation";
import VoiceCommandNavigation from "@/components/a11y/VoiceCommandNavigation";
import ScreenReader from "@/components/a11y/ScreenReader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sales Pulse - Forecast Commander 2026",
  description: "Plataforma de Inteligencia de Ventas con proyecciones ponderadas y detección de riesgos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <AccessibilityProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[21000] focus:px-4 focus:py-2 focus:bg-yellow-400 focus:text-black focus:font-bold focus:rounded-md focus:outline-none focus:ring-4 focus:ring-black"
          >
            Saltar al contenido principal
          </a>
          <main id="main-content">
            {children}
          </main>
          <AccessibilityWidget />
          <KeyboardNavigation />
          <VoiceCommandNavigation />
          <ScreenReader />
        </AccessibilityProvider>
      </body>
    </html>
  );
}
