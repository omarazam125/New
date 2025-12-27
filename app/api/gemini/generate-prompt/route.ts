import { type NextRequest, NextResponse } from "next/server"

const GEMINI_API_KEY = "AIzaSyCEyQByGkrdaCItsERJoy4rIKUWdgL6jPE"

export async function POST(request: NextRequest) {
  try {
    const { description, scenarioType } = await request.json()

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 })
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "أنت مساعد يتحدث العربية فقط. يجب عليك الرد باللغة العربية فقط في جميع الأوقات. لا تستخدم الإنجليزية أبداً. YOU MUST RESPOND ONLY IN ARABIC. NEVER USE ENGLISH. ARABIC ONLY. NO EXCEPTIONS.",
              },
            ],
          },
          contents: [
            {
              parts: [
                {
                  text: `⚠️ تعليمات إلزامية - MANDATORY INSTRUCTIONS ⚠️
🔴 يجب عليك الرد باللغة العربية فقط - YOU MUST RESPOND IN ARABIC ONLY 🔴
🔴 لا تستخدم الإنجليزية أبداً - NEVER USE ENGLISH 🔴
🔴 جميع النصوص بالعربية - ALL TEXT IN ARABIC 🔴
🔴 ARABIC LANGUAGE ONLY - NO ENGLISH ALLOWED 🔴

أنت خبير في إنشاء نصوص احترافية لوكلاء خدمة العملاء في شركة المؤيد (Y.K. Almoayyed & Sons) - شركة رائدة في مملكة البحرين.

⚠️ تذكير مهم: ردك يجب أن يكون بالعربية فقط - لا إنجليزية ⚠️

أنشئ نصاً تفصيلياً واحترافياً لوكيل ذكاء اصطناعي يعمل في المؤيد لخدمة العملاء.

نوع الخدمة: ${scenarioType || "خدمة عملاء عامة"}
وصف المستخدم: ${description}

⚠️ مهم جداً: النص بالكامل يجب أن يكون باللغة العربية ⚠️

يجب أن يتضمن النص:
1. تعريف واضح للدور (وكيل من المؤيد)
2. متغيرات معلومات العميل: {customer_name}, {phone_number}, {customer_email}, وحقول أخرى ذات صلة
3. **مهم: يجب أن يتضمن ملاحظة بأن الوكيل يجب ألا يذكر البريد الإلكتروني للعميل أثناء المكالمة - إنه للسجلات الداخلية فقط**
4. أهداف واضحة وتدفق المكالمة لخدمة العملاء
5. ختام دافئ يشكر العميل على تواصله مع المؤيد
6. إرشادات احترافية للتعامل مع المواقف المختلفة
7. التعاطف والحساسية الثقافية للعملاء في مملكة البحرين
8. **تعليمات صارمة للوكيل بأن جميع التقارير والملخصات والتحليلات يجب أن تكون باللغة العربية فقط**

اجعله شاملاً واحترافياً وجاهزاً للاستخدام. قم بتنسيقه بوضوح مع أقسام.

🔴🔴🔴 تعليمات نهائية إلزامية 🔴🔴🔴
- ردك بالكامل يجب أن يكون باللغة العربية
- لا تكتب أي كلمة بالإنجليزية
- جميع الأقسام والعناوين والمحتوى بالعربية
- YOUR ENTIRE RESPONSE MUST BE IN ARABIC
- DO NOT WRITE ANY ENGLISH WORDS
- ARABIC ONLY - NO EXCEPTIONS
- إذا كتبت أي شيء بالإنجليزية، فقد فشلت في المهمة`,
                },
              ],
            },
          ],
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error("[v0] Gemini API error:", errorData)
      throw new Error(`Gemini API error: ${response.statusText}`)
    }

    const data = await response.json()
    const generatedPrompt = data.candidates[0]?.content?.parts[0]?.text || ""

    return NextResponse.json({ prompt: generatedPrompt })
  } catch (error) {
    console.error("[v0] Gemini API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate prompt" },
      { status: 500 },
    )
  }
}
