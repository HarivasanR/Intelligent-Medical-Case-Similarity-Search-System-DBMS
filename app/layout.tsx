import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "MedMatch | Medical Case Similarity", description: "Synthetic medical case search for DBMS academic demonstration" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
