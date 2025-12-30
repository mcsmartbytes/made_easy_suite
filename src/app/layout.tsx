import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserModeProvider } from "@/contexts/UserModeContext";
import { IndustryProvider } from "@/contexts/IndustryContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Made Easy Suite | All-in-One Business Management",
  description: "Complete business management platform - CRM, Jobs, Expenses, Invoicing, and more. Everything you need to run your business, made easy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <IndustryProvider>
            <UserModeProvider>
              {children}
            </UserModeProvider>
          </IndustryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
