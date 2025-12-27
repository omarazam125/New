import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { LayoutContent } from "@/components/layout-content"

export const metadata: Metadata = {
  title: "Almoayyed - Customer Service Dashboard",
  description:
    "Professional customer service management dashboard for Yusuf Khalil Almoayyed & Sons - A leading company in the Kingdom of Bahrain",
  generator: "v0.app",
}

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" dir="ltr" className={`${inter.className} ${jetbrainsMono.className}`}>
      <body className="font-sans">
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  )
}
