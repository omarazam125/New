"use client"

import type React from "react"

import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Suspense } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { usePathname } from "next/navigation"

export function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <ConditionalLayout>{children}</ConditionalLayout>
      </Suspense>
    </AuthGuard>
  )
}

function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
