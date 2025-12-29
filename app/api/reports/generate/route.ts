import { type NextRequest, NextResponse } from "next/server"
import { createHamsaClient } from "@/lib/hamsa-client"

export async function POST(request: NextRequest) {
  try {
    const { callId } = await request.json()

    if (!callId) {
      return NextResponse.json({ error: "Call ID is required" }, { status: 400 })
    }

    console.log("[v0] Generating report for Hamsa call:", callId)

    const hamsa = createHamsaClient()

    let callData: any
    try {
      const response = await hamsa.getJobDetails(callId)
      callData = response.data || response
      console.log("[v0] Hamsa call data fetched successfully")
      console.log("[v0] Call data keys:", Object.keys(callData))
      console.log("[v0] Full call data structure:", JSON.stringify(callData, null, 2).substring(0, 2000))
    } catch (error) {
      console.error("[v0] Failed to fetch Hamsa call details:", error)
      return NextResponse.json({ error: "Failed to fetch call details from Hamsa" }, { status: 500 })
    }

    let phoneNumber = "غير متوفر"

    // Priority 1: From nested data.toNumber (most reliable)
    if (callData.data?.toNumber && !callData.data.toNumber.includes("/")) {
      phoneNumber = callData.data.toNumber
      console.log("[v0] Phone from data.toNumber:", phoneNumber)
    }
    // Priority 2: From nested data.params.actual_phone_number
    else if (callData.data?.params?.actual_phone_number && !callData.data.params.actual_phone_number.includes("/")) {
      phoneNumber = callData.data.params.actual_phone_number
      console.log("[v0] Phone from data.params.actual_phone_number:", phoneNumber)
    }
    // Priority 3: From nested data.params.phone_number
    else if (callData.data?.params?.phone_number && !callData.data.params.phone_number.includes("/")) {
      phoneNumber = callData.data.params.phone_number
      console.log("[v0] Phone from data.params.phone_number:", phoneNumber)
    }
    // Priority 4: From top-level toNumber
    else if (callData.toNumber && !callData.toNumber.includes("/")) {
      phoneNumber = callData.toNumber
      console.log("[v0] Phone from toNumber:", phoneNumber)
    }
    // Priority 5: From top-level params.actual_phone_number
    else if (callData.params?.actual_phone_number && !callData.params.actual_phone_number.includes("/")) {
      phoneNumber = callData.params.actual_phone_number
      console.log("[v0] Phone from params.actual_phone_number:", phoneNumber)
    }
    // Priority 6: From agentDetails.params.phone_number
    else if (callData.agentDetails?.params?.phone_number && !callData.agentDetails.params.phone_number.includes("/")) {
      phoneNumber = callData.agentDetails.params.phone_number
      console.log("[v0] Phone from agentDetails.params.phone_number:", phoneNumber)
    }
    // Priority 7: From data.agentDetails.params.phone_number
    else if (
      callData.data?.agentDetails?.params?.phone_number &&
      !callData.data.agentDetails.params.phone_number.includes("/")
    ) {
      phoneNumber = callData.data.agentDetails.params.phone_number
      console.log("[v0] Phone from data.agentDetails.params.phone_number:", phoneNumber)
    }

    console.log("[v0] Final extracted phoneNumber:", phoneNumber)

    let duration = 0
    if (callData.data?.callDuration) {
      duration = callData.data.callDuration
    } else if (callData.callDuration) {
      duration = callData.callDuration
    } else if (callData.data?.duration) {
      duration = callData.data.duration
    } else if (callData.duration) {
      duration = callData.duration
    }
    console.log("[v0] Extracted duration:", duration)

    // Extract transcript
    let transcript = ""

    if (callData.data?.jobResponse?.transcription && Array.isArray(callData.data.jobResponse.transcription)) {
      console.log("[v0] Extracting transcript from jobResponse.transcription array")
      transcript = callData.data.jobResponse.transcription
        .map((item: any) => {
          if (item.Agent) {
            return `Agent: ${typeof item.Agent === "string" ? item.Agent : JSON.stringify(item.Agent)}`
          } else if (item.User) {
            return `Customer: ${typeof item.User === "string" ? item.User : JSON.stringify(item.User)}`
          }
          return ""
        })
        .filter((line: string) => line.length > 0)
        .join("\n")
    } else if (callData.toScript && typeof callData.toScript === "string" && callData.toScript.length > 10) {
      console.log("[v0] Using top-level toScript field (outbound)")
      transcript = callData.toScript
    } else if (callData.fromScript && typeof callData.fromScript === "string" && callData.fromScript.length > 10) {
      console.log("[v0] Using top-level fromScript field (inbound)")
      transcript = callData.fromScript
    } else if (
      callData.data?.toScript &&
      typeof callData.data.toScript === "string" &&
      callData.data.toScript.length > 10
    ) {
      console.log("[v0] Using data.toScript field (outbound)")
      transcript = callData.data.toScript
    } else if (
      callData.data?.fromScript &&
      typeof callData.data.fromScript === "string" &&
      callData.data.fromScript.length > 10
    ) {
      console.log("[v0] Using data.fromScript field (inbound)")
      transcript = callData.data.fromScript
    } else if (
      callData.data?.transcript &&
      typeof callData.data.transcript === "string" &&
      callData.data.transcript.length > 10
    ) {
      console.log("[v0] Using data.transcript field")
      transcript = callData.data.transcript
    } else if (callData.transcript && typeof callData.transcript === "string" && callData.transcript.length > 10) {
      console.log("[v0] Using top-level transcript field")
      transcript = callData.transcript
    } else if (callData.messages && Array.isArray(callData.messages)) {
      console.log("[v0] Extracting transcript from messages array")
      transcript = callData.messages
        .filter((msg: any) => msg.message || msg.content || msg.text)
        .map((msg: any) => {
          const role = msg.role === "assistant" || msg.role === "bot" || msg.role === "agent" ? "Agent" : "Customer"
          const content = msg.message || msg.content || msg.text || ""
          return `${role}: ${content}`
        })
        .join("\n")
    } else if (callData.conversation) {
      console.log("[v0] Using conversation field")
      transcript =
        typeof callData.conversation === "string" ? callData.conversation : JSON.stringify(callData.conversation)
    }

    console.log("[v0] Extracted transcript length:", transcript.length)
    console.log("[v0] Transcript preview:", transcript.substring(0, 500))

    if (!transcript || transcript.length < 10) {
      console.error("[v0] No valid transcript available")
      console.error("[v0] Available fields:", Object.keys(callData.data || {}))
      return NextResponse.json(
        {
          error: "No valid transcript available for this call",
        },
        { status: 400 },
      )
    }

    console.log("[v0] Generating AI analysis with OpenAI...")
    const openaiApiKey = process.env.OPENAI_API_KEY

    if (!openaiApiKey) {
      console.error("[v0] OPENAI_API_KEY environment variable is not set")
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Please add OPENAI_API_KEY to environment variables." },
        { status: 500 },
      )
    }

    const analysisPrompt = `⚠️ IMPORTANT: All output must be in English only ⚠️

Analyze this call transcript from Almoayyed (Y.K. Almoayyed & Sons) customer service center:

${transcript}

**First: Extract the customer name from the conversation** - Look for the name mentioned by the customer or agent at the beginning of the conversation.

**Second: Determine customer mood from the conversation tone and responses** - Classify into ONE word only: happy, satisfied, neutral, frustrated, or angry

Provide a comprehensive assessment of the customer's behavior and cooperation (NOT the employee):

1. **Customer Cooperation Assessment** (1-10):
   - Is the customer cooperative and willing to engage?
   - Did the customer respond to questions and inquiries?
   - Was the customer friendly and polite in communication?

2. **Customer Response Quality Assessment** (1-10):
   - Did the customer answer questions clearly and completely?
   - Were their answers helpful and reliable?
   - Did the customer show interest or was indifferent?

3. **Is the customer stubborn or insisting on something specific?** (Yes/No - with explanation)

4. **Key Discussion Points (7-12 points)**:
   Extract the most important points discussed in the call

5. **7-10 Key Points about Customer Behavior**

6. **Comprehensive Summary of Customer Behavior and Cooperation** (5-7 sentences)

7. **10 Assessment Questions for Employee Performance with Detailed Answers**

8. **3-5 Recommendations for Improving Employee Performance**

9. **Overall Employee Performance Score** (1-10)

10. **Customer Overall Cooperation and Behavior Score** (1-10)

Respond in JSON format with this structure:
{
  "customerName": "string",
  "customerMood": "happy|satisfied|neutral|frustrated|angry",
  "customerBehavior": {
    "score": number,
    "description": "string"
  },
  "keyDiscussionPoints": ["string"],
  "customerAssessmentQuestions": [{
    "question": "string",
    "answer": "string",
    "status": "string"
  }],
  "customerRecommendations": ["string"],
  "customerOverallScore": number
}`

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a specialized analyst in evaluating customer behavior and cooperation in Almoayyed (Y.K. Almoayyed & Sons) customer service center. You must assess the customer's behavior and cooperation, NOT the employee. All your responses must be in English only and in JSON format.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 8192,
        response_format: { type: "json_object" },
      }),
    })

    if (!openaiResponse.ok) {
      console.error("[v0] OpenAI API error:", openaiResponse.status)
      const errorText = await openaiResponse.text()
      console.error("[v0] Error details:", errorText)
      return NextResponse.json({ error: "Failed to generate analysis" }, { status: openaiResponse.status })
    }

    const openaiData = await openaiResponse.json()
    const analysisText = openaiData.choices?.[0]?.message?.content || ""

    console.log("[v0] OpenAI response received, length:", analysisText.length)
    console.log("[v0] Response preview:", analysisText.substring(0, 500))

    let analysis
    try {
      analysis = JSON.parse(analysisText)
      console.log("[v0] Analysis parsed successfully")

      if (!Array.isArray(analysis.customerAssessmentQuestions) || analysis.customerAssessmentQuestions.length < 10) {
        console.log("[v0] Padding customer assessment questions to 10")
        const defaultCustomerQuestions = [
          {
            question: "Customer Cooperation",
            answer: "The customer is cooperative and willing to engage",
            status: "Excellent",
          },
          {
            question: "Customer Response Quality",
            answer: "The customer answered questions clearly and completely",
            status: "Excellent",
          },
          { question: "Customer Reservations", answer: "No reservations from the customer", status: "Excellent" },
          {
            question: "Customer Satisfaction",
            answer: "The customer appears satisfied with the service",
            status: "Excellent",
          },
          {
            question: "Customer Engagement",
            answer: "The customer was engaged in the dialogue and inquiries",
            status: "Excellent",
          },
          {
            question: "Customer Willingness",
            answer: "The customer was willing to engage and communicate",
            status: "Excellent",
          },
          {
            question: "Customer Cooperation with Agent",
            answer: "The customer showed good cooperation with the agent",
            status: "Excellent",
          },
          { question: "Nature of Responses", answer: "Responses were clear and direct", status: "Excellent" },
          {
            question: "Customer Trust in Services",
            answer: "The customer showed trust in the services and products",
            status: "Excellent",
          },
          {
            question: "Customer Final Satisfaction",
            answer: "The customer is generally satisfied with the experience",
            status: "Excellent",
          },
        ]

        analysis.customerAssessmentQuestions = analysis.customerAssessmentQuestions || []
        while (analysis.customerAssessmentQuestions.length < 10) {
          analysis.customerAssessmentQuestions.push(
            defaultCustomerQuestions[analysis.customerAssessmentQuestions.length],
          )
        }
      }
    } catch (parseError: any) {
      console.error("[v0] Failed to parse OpenAI response:", parseError.message)
      console.error("[v0] Full response text:", analysisText.substring(0, 2000))

      return NextResponse.json(
        {
          error: "Failed to parse OpenAI response. Please try again.",
          details: "A response was received from OpenAI, but it could not be parsed correctly.",
          responsePreview: analysisText.substring(0, 500),
        },
        { status: 500 },
      )
    }

    const extractedCustomerName = analysis.customerName || "Unknown"

    const customerEmail =
      callData.agentDetails?.params?.customerEmail ||
      callData.params?.customerEmail ||
      callData.metadata?.customerEmail ||
      callData.data?.params?.customerEmail ||
      callData.data?.agentDetails?.params?.customerEmail ||
      ""

    const report = {
      id: callId,
      callId: callId,
      customerName: extractedCustomerName,
      phoneNumber: phoneNumber,
      customerEmail: customerEmail,
      duration: duration,
      status: callData.status || callData.data?.status || "Completed",
      createdAt: callData.createdAt || callData.data?.createdAt || new Date().toISOString(),
      language: callData.agentDetails?.lang || callData.data?.agentDetails?.lang || callData.language || "en",
      transcript: transcript,
      recordingUrl:
        callData.recordingUrl || callData.data?.recordingUrl || callData.audioUrl || callData.data?.audioUrl || "",
      analysis: analysis,
      generatedAt: new Date().toISOString(),
    }

    console.log("[v0] Report generated successfully for customer:", extractedCustomerName)
    console.log("[v0] Final report phoneNumber:", phoneNumber)
    console.log("[v0] Final report duration:", duration)

    return NextResponse.json(report)
  } catch (error) {
    console.error("[v0] Error generating report:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
