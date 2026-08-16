import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import { BusinessProvider } from "@/lib/business-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VenturePilot AI | Your AI team, in motion",
  description: "An autonomous AI operating system that coordinates six specialized agents across your business.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <BusinessProvider>
          <AppShell>{children}</AppShell>
        </BusinessProvider>
      </body>
    </html>
  );
}
