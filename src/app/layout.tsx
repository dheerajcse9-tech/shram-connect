import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { 
  title: "Shram Connect - Skills Meet Opportunities", 
  description: "Trusted hiring and skill verification platform for India's skilled workforce",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { 
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  ); 
}
