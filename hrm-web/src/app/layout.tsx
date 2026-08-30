import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Enterprise HRM & Payroll Engine',
  description: 'Next.js 16 + .NET 10 NetTopologySuite, QuestPDF, ClosedXML & Hangfire Engine',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
