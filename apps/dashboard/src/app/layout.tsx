import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'jobabai Dashboard',
  description: 'Seller & Admin Dashboard for jobabai',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
