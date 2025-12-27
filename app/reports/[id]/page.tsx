"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Phone,
  Clock,
  Calendar,
  Mail,
  User,
  FileText,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

interface CallReport {
  id: string
  callId: string
  customerName: string
  phoneNumber: string
  customerEmail: string
  duration: number
  status: string
  createdAt: string
  language: string
  transcript: string
  recordingUrl: string
  generatedAt: string
  analysis?: {
    customerBehavior: { score: number; description: string }
    keyDiscussionPoints?: string[]
    customerAssessmentQuestions: Array<{
      question: string
      answer: string
      status: string
    }>
    customerRecommendations: string[]
    customerOverallScore: number
  }
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [report, setReport] = useState<CallReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReport()
  }, [params.id])

  const loadReport = async () => {
    try {
      console.log("[v0] Loading report from Supabase for ID:", params.id)
      const supabase = createBrowserClient()

      const { data: supabaseReport, error } = await supabase
        .from("call_reports")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error) {
        console.error("[v0] Error loading report from Supabase:", error)
      } else if (supabaseReport) {
        console.log("[v0] Report loaded from Supabase successfully")

        // Transform Supabase data to match the expected format
        const transformedReport: CallReport = {
          id: supabaseReport.id,
          callId: supabaseReport.call_id || supabaseReport.id,
          customerName: supabaseReport.customer_name || "Unknown",
          phoneNumber: supabaseReport.phone_number || "N/A",
          customerEmail: supabaseReport.customer_email || "",
          duration: parseDuration(supabaseReport.duration),
          status: supabaseReport.status || "completed",
          createdAt: supabaseReport.created_at || new Date().toISOString(),
          language: supabaseReport.language || "en",
          transcript: supabaseReport.transcript || "",
          recordingUrl: supabaseReport.recording_url || "",
          generatedAt: supabaseReport.updated_at || supabaseReport.created_at || new Date().toISOString(),
          analysis: supabaseReport.analysis || {},
        }

        setReport(transformedReport)
        return
      }

      // Fallback to localStorage if not found in Supabase
      const storedReports = localStorage.getItem("call-reports")
      if (storedReports) {
        const reports = JSON.parse(storedReports)
        const foundReport = reports.find((r: CallReport) => r.id === params.id)
        setReport(foundReport || null)
      }
    } catch (error) {
      console.error("[v0] Error loading report:", error)
    } finally {
      setLoading(false)
    }
  }

  const parseDuration = (duration: any): number => {
    if (typeof duration === "number") return duration
    if (typeof duration === "string") {
      const parts = duration.split(":")
      if (parts.length === 2) {
        return Number.parseInt(parts[0]) * 60 + Number.parseInt(parts[1])
      }
    }
    return 0
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500"
    if (score >= 6) return "text-yellow-500"
    return "text-red-500"
  }

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes("ممتاز") || statusLower.includes("جيد") || statusLower.includes("positive")) {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />
    }
    if (statusLower.includes("ضعيف") || statusLower.includes("متوسط") || statusLower.includes("negative")) {
      return <XCircle className="w-5 h-5 text-red-500" />
    }
    return <AlertCircle className="w-5 h-5 text-yellow-500" />
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <DashboardHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading report...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <DashboardHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Report Not Found</h3>
            <p className="text-muted-foreground mb-4">This report may have been deleted or doesn't exist.</p>
            <Button onClick={() => router.push("/logs")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customer Records
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <DashboardHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Button onClick={() => router.push("/logs")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customer Records
            </Button>
            <Badge variant="outline">{report.language === "ar" ? "Arabic" : "English"}</Badge>
          </div>

          {/* Call Overview */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold mb-2">Almoayyed Call Report</h1>
                <p className="text-muted-foreground">Detailed analysis of customer behavior and cooperation</p>
              </div>
              {report.analysis && (
                <div className="text-right">
                  <div className={`text-4xl font-bold ${getScoreColor(report.analysis.customerOverallScore ?? 0)}`}>
                    {report.analysis.customerOverallScore ?? 0}/10
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Score</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Customer</div>
                  <div className="font-semibold">{report.customerName}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-semibold">{report.phoneNumber}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Duration</div>
                  <div className="font-semibold">{formatDuration(report.duration)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Date</div>
                  <div className="font-semibold">{new Date(report.createdAt).toLocaleDateString("en-US")}</div>
                </div>
              </div>
            </div>

            {report.customerEmail && (
              <div className="mt-4 flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-semibold">{report.customerEmail}</div>
                </div>
              </div>
            )}
          </Card>

          {/* AI Analysis */}
          {report.analysis ? (
            <>
              {/* Summary */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Customer Assessment Summary
                </h2>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Customer Behavior and Cooperation</h3>
                    <div
                      className={`text-2xl font-bold ${getScoreColor(report.analysis.customerBehavior?.score ?? 0)}`}
                    >
                      {report.analysis.customerBehavior?.score ?? 0}/10
                    </div>
                  </div>
                  <p className="text-foreground leading-relaxed">
                    {report.analysis.customerBehavior?.description ?? "No data available"}
                  </p>
                </div>
              </Card>

              {/* Key Discussion Points */}
              {report.analysis.keyDiscussionPoints && report.analysis.keyDiscussionPoints.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Key Discussion Points
                  </h2>
                  <ul className="space-y-3">
                    {report.analysis.keyDiscussionPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-foreground leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Assessment Questions */}
              {report.analysis.customerAssessmentQuestions &&
                report.analysis.customerAssessmentQuestions.length > 0 && (
                  <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">
                      Customer Behavior and Cooperation Assessment (10 Criteria)
                    </h2>
                    <div className="space-y-4">
                      {report.analysis.customerAssessmentQuestions.map((q, index) => (
                        <div key={index} className="border-b pb-4 last:border-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-start gap-3 flex-1">
                              {getStatusIcon(q.status)}
                              <div className="flex-1">
                                <h3 className="font-semibold mb-1">
                                  {index + 1}. {q.question}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium">Answer:</span> {q.answer}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={
                                q.status.toLowerCase().includes("excellent") || q.status.toLowerCase().includes("good")
                                  ? "default"
                                  : q.status.toLowerCase().includes("poor") || q.status.toLowerCase().includes("weak")
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {q.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

              {/* Recommendations */}
              {report.analysis.customerRecommendations && report.analysis.customerRecommendations.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Recommendations Based on Customer Behavior</h2>
                  <ul className="space-y-2">
                    {report.analysis.customerRecommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <TrendingUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-6">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>AI analysis has not been generated for this report yet.</p>
              </div>
            </Card>
          )}

          {/* Transcript */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Conversation Transcript</h2>
            <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {report.transcript || "No transcript available"}
              </pre>
            </div>
          </Card>

          {/* Recording */}
          {report.recordingUrl && (
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Call Recording</h2>
              <audio controls className="w-full">
                <source src={report.recordingUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
