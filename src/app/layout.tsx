import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Perkasa",
  description: "Sistem Keuangan & Penggajian PSB Perkasa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
