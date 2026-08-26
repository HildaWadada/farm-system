import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cliff's Farm",
  description: "Farm activity, stock, and sales tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
