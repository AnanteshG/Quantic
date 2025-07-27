import type { Metadata } from "next";
import { Quantico } from "next/font/google";
import "./globals.css";

const quantico = Quantico({
  variable: "--font-quantico",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Quantic - AI newsletter for busy professionals",
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
        {children}
      </body>
    </html>
  );
}
