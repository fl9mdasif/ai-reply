import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "jobabai — ফেসবুকে অর্ডার নিন, আমরা সামলাই",
  description:
    "jobabai আপনার Facebook Page-এর কাস্টমারদের প্রশ্নের উত্তর দেয়, অর্ডার নেয়, এবং COD রিস্ক স্ক্রিন করে — স্বয়ংক্রিয়ভাবে।",
  openGraph: {
    title: "jobabai — AI-powered auto-reply for your Facebook store",
    description:
      "Automate customer replies, collect COD orders, and screen fake orders — all inside Facebook Messenger.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
