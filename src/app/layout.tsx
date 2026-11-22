import type { Metadata } from "next";
import "./globals.css";
import { brand } from "@/config/brand";
export const metadata: Metadata = {
  title: { default: brand.name, template: `%s | ${brand.name}` },
  description: brand.description,
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
