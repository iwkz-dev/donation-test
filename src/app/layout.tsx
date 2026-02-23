import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Donasi — IWKZ",
  description:
    "Platform donasi modern untuk mendukung program-program kebaikan IWKZ. Mudah, aman, dan transparan.",
  openGraph: {
    title: "Donasi — IWKZ",
    description: "Platform donasi modern untuk mendukung program-program kebaikan IWKZ.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} font-sans antialiased bg-gray-50`}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: "1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
            },
          }}
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
