import "./globals.css";

// <html> and <body> live in [locale]/layout.tsx so `lang` follows the locale.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
