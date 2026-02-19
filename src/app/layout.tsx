import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Finance Perkasa",
  description: "Sistem Keuangan & Penggajian PSB Perkasa",
  icons: {
    icon: [
      { url: "/uploads/favicon.png" },
      { url: "/uploads/favicon.png", sizes: "32x32" },
    ],
    shortcut: "/uploads/favicon.png",
    apple: "/uploads/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script 
          src="/suppress-logs.js" 
          strategy="beforeInteractive" 
        />
      </head>
      <body
        className="antialiased"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
