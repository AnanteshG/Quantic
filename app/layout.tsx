import type { Metadata } from "next";
import { Quantico } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./components/toast";
import { Analytics } from '@vercel/analytics/react';

const quantico = Quantico({
  variable: "--font-quantico",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "QuanticDaily - AI newsletter for busy professionals",
  description: "Stay ahead with AI news in your inbox. Curated AI & software news, expert summaries, and actionable insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${quantico.variable} antialiased`}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
