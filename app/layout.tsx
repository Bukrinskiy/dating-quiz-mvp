import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dating Quiz MVP',
  description: 'MVP funnel skeleton with 8 routes'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
