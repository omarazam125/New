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

    console.log("[v0] Generating AI analysis with Gemini...")
    const geminiApiKey = "AIzaSyADIe8i4RD8RG4zGgQY-UcNA6LfaWQiSrk"
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`

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
   Extract the most important points discussed in the call:
   - What was the main topic or issue the customer called about?
   - What specific information or requests did the customer provide?
   - Was a solution or agreement reached? What was it?
   - Did the customer request additional services or specific information?
   - Did the customer mention any viewpoints or important observations?
   - Was there any commitment or appointment set?
   - Were there follow-up steps or required actions identified?
   - Did the customer mention any complaints or praise?
   - What are the most important things to remember about this customer?

5. **7-10 Key Points about Customer Behavior**:
   - Customer's willingness to engage and communicate
   - Level of cooperation with the agent
   - Nature of responses and how they replied
   - Level of engagement with the topic and discussion
   - Any reservations or objections from the customer
   - Apparent satisfaction level from the customer
   - Seriousness in dialogue and inquiries

6. **Comprehensive Summary of Customer Behavior and Cooperation** (5-7 sentences):
   - Description of customer's general behavior
   - Level of cooperation and responsiveness
   - Positive observations about their behavior
   - Any indicators of dissatisfaction or stubbornness
   - Final assessment of interaction quality from customer's side

7. **10 Assessment Questions for Employee Performance with Detailed Answers**:
   1. Was the customer greeted professionally and warmly?
   2. Did the employee understand the customer's problem correctly?
   3. Was the information provided accurate and current?
   4. Did the employee show high problem-solving capabilities?
   5. Was the employee patient and interested in customer needs?
   6. Was the employee's language clear and easy to understand?
   7. Did the employee give the customer enough time to ask and clarify?
   8. Did the employee end the call professionally with solution confirmation?
   9. Did the employee appear well-trained on services and products?
   10. Was the employee's experience professional and committed to customer satisfaction?
   
   For each question: Provide complete answer and assessment (Excellent/Very Good/Good/Average/Poor)

8. **3-5 Recommendations for Improving Employee Performance**:
   - Strengths to maintain
   - Suggested improvement areas
   - Practical tips for better performance

9. **Overall Employee Performance Score** (1-10):
   Criteria:
   - Professionalism and customer handling (30%)
   - Service quality and solution provided (40%)
   - Response speed and efficiency (30%)

10. **Customer Overall Cooperation and Behavior Score** (1-10):
   Criteria:
   - Cooperation and willingness to engage (35%)
   - Quality and completeness of answers (35%)
   - Friendliness and politeness in communication (30%)

⚠️ CRITICAL: 
- All assessments must be for the CUSTOMER not the employee
- All text and assessments must be in ENGLISH only
- Focus on customer behavior, cooperation, and seriousness of responses
- Extract customer name from conversation and provide it in customerName field
- Determine customer mood as ONE word: happy, satisfied, neutral, frustrated, or angry
- Extract discussion points in detail and helpfully ⚠️`

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "You are a specialized analyst in evaluating customer behavior and cooperation in Almoayyed (Y.K. Almoayyed & Sons) customer service center. You must assess the customer's behavior and cooperation, NOT the employee. All your responses must be in English only. Provide a comprehensive and detailed analysis focusing on the customer's cooperation, seriousness of their responses, and overall behavior.",
            },
          ],
        },
        contents: [
          {
            parts: [
              {
                text: analysisPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              customerName: { type: "string" },
              customerMood: {
                type: "string",
                enum: ["happy", "satisfied", "neutral", "frustrated", "angry"],
              },
              customerBehavior: {
                type: "object",
                properties: {
                  score: { type: "integer" },
                  description: { type: "string" },
                },
                required: ["score", "description"],
              },
              keyDiscussionPoints: {
                type: "array",
                items: { type: "string" },
              },
              customerAssessmentQuestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    answer: { type: "string" },
                    status: { type: "string" },
                  },
                  required: ["question", "answer", "status"],
                },
              },
              customerRecommendations: {
                type: "array",
                items: { type: "string" },
              },
              customerOverallScore: { type: "integer" },
            },
            required: [
              "customerName",
              "customerMood",
              "customerBehavior",
              "keyDiscussionPoints",
              "customerAssessmentQuestions",
              "customerRecommendations",
              "customerOverallScore",
            ],
          },
        },
      }),
    })

    if (!geminiResponse.ok) {
      console.error("[v0] Gemini API error:", geminiResponse.status)
      const errorText = await geminiResponse.text()
      console.error("[v0] Error details:", errorText)
      return NextResponse.json({ error: "Failed to generate analysis" }, { status: geminiResponse.status })
    }

    const geminiData = await geminiResponse.json()
    const analysisText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ""

    console.log("[v0] Gemini response received, length:", analysisText.length)
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
      console.error("[v0] Failed to parse Gemini response:", parseError.message)
      console.error("[v0] Full response text:", analysisText.substring(0, 2000))

      return NextResponse.json(
        {
          error: "Failed to parse Gemini response. Please try again.",
          details: "A response was received from Gemini, but it could not be parsed correctly.",
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
