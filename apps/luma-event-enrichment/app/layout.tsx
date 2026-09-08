import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luma event enrichment | Weft example",
  description: "Turn a public Luma event page into structured data with Weft.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="grid" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
