import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

// Temporarily disable Google Fonts for CI environment
// const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sustainable Transport Planner",
  description: "Plan eco-friendly routes and compare different transport methods",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}
