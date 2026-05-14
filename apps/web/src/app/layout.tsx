import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { AppNav } from "@/components/AppNav";
import { AppTour } from "@/components/AppTour";
import { fetchPanelMe } from "@/lib/server-api";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Agent Reservas · Console",
  description: "Panel ejecutivo para conversaciones, citas y configuración (Twilio + FastAPI + Calendar)",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const panelUser = await fetchPanelMe();
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${plusJakarta.variable} min-h-screen antialiased`}
      >
        <AppNav panelUser={panelUser} />
        <AppTour />
        {children}
      </body>
    </html>
  );
}
