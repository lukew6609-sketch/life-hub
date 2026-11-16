import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life Hub",
  description: "Bills, renewals, documents and everything else in one place",
  appleWebApp: { capable: true, title: "Life Hub", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#111a2c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="antialiased">{children}</body>
    </html>
  );
}
