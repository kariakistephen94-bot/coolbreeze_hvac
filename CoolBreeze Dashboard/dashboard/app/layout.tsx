import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CoolBreeze · Lead desk",
  description:
    "A focused workspace for HVAC leads, conversations, and appointments. Demonstration data.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
