import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/components/AppShell";
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
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}>
        <AppShell panelUser={panelUser}>{children}</AppShell>
        <AppTour />
      </body>
    </html>
  );
}
