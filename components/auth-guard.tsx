"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated")
    const isLoggedIn = authStatus === "true"

    setIsAuthenticated(isLoggedIn)

    // Handle redirects based on auth status
    if (!isLoggedIn && pathname !== "/login") {
      router.push("/login")
    } else if (isLoggedIn && pathname === "/login") {
      router.push("/")
    } else {
      setIsChecking(false)
    }
  }, [pathname, router])

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00664d] border-t-transparent" />
          <p className="mt-4 font-sans text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
