"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Simulate a small delay to show proper validation
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Check credentials
    if (username === "admin" && password === "Amloayyed_admin12") {
      // Store authentication in localStorage
      localStorage.setItem("isAuthenticated", "true")
      localStorage.setItem("username", username)

      // Redirect to dashboard
      router.push("/")
    } else {
      setError("Invalid username or password")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center gap-4">
          <Image
            src="/images/almoayyed-logo.jpg"
            alt="Almoayyed Logo"
            width={200}
            height={110}
            className="object-contain"
          />
          <div className="text-center">
            <h1 className="font-sans text-2xl font-bold text-[#00664d]">Welcome Back</h1>
            <p className="mt-2 font-sans text-sm text-gray-600">Sign in to access the Almoayyed Dashboard</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username" className="font-sans text-sm font-medium text-gray-700">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 border-gray-200 bg-white font-sans text-sm placeholder:text-gray-400 focus-visible:border-[#00664d] focus-visible:ring-[#00664d]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="font-sans text-sm font-medium text-gray-700">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 border-gray-200 bg-white font-sans text-sm placeholder:text-gray-400 focus-visible:border-[#00664d] focus-visible:ring-[#00664d]"
              required
            />
          </div>

          {error && <div className="rounded-lg bg-red-50 px-4 py-3 font-sans text-sm text-red-700">{error}</div>}

          <Button
            type="submit"
            disabled={isLoading}
            className="h-12 w-full bg-[#00664d] font-sans text-base font-medium text-white hover:bg-[#005541] disabled:opacity-50"
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  )
}
