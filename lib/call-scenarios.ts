export interface ScenarioField {
  id: string
  label: string
  labelEn: string
  type: "text" | "number" | "email" | "textarea" | "select" | "ai-questions"
  placeholder: string
  placeholderEn: string
  required: boolean
  options?: { value: string; label: string; labelEn: string }[]
}

export interface CallScenario {
  id: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  icon: string
  fields: ScenarioField[]
  agentId: string
  systemPromptAr?: string
  systemPromptEn?: string
  firstMessageAr?: string
  firstMessageEn?: string
}

export const ALMOAYYED_SCENARIOS: CallScenario[] = [
  {
    id: "after-sales-followup",
    name: "متابعة ما بعد البيع",
    nameEn: "After Sales Follow-up",
    description: "متابعة العميل بعد الخدمة لقياس رضاه وجمع الملاحظات",
    descriptionEn: "Follow up with customer after service to measure satisfaction and collect feedback",
    icon: "📞",
    agentId: "ac90bc4a-7e12-43c0-8009-9d462d15896c",
    fields: [
      {
        id: "customer_name",
        label: "اسم العميل",
        labelEn: "Customer Name",
        type: "text",
        placeholder: "أدخل اسم العميل",
        placeholderEn: "Enter customer name",
        required: true,
      },
      {
        id: "phoneNumber",
        label: "رقم الهاتف",
        labelEn: "Phone Number",
        type: "text",
        placeholder: "+973 XXXX XXXX",
        placeholderEn: "+973 XXXX XXXX",
        required: true,
      },
      {
        id: "service_date",
        label: "تاريخ الخدمة",
        labelEn: "Service Date",
        type: "text",
        placeholder: "مثال: 15 ديسمبر 2024",
        placeholderEn: "e.g., December 15, 2024",
        required: true,
      },
      {
        id: "note",
        label: "ملاحظات إضافية للوكيل",
        labelEn: "Additional Notes for Agent",
        type: "textarea",
        placeholder: "أي تعليمات خاصة للوكيل (اختياري)",
        placeholderEn: "Any special instructions for the agent (optional)",
        required: false,
      },
      {
        id: "questions",
        label: "الأسئلة",
        labelEn: "Questions",
        type: "ai-questions",
        placeholder: "اضغط على 'توليد أسئلة' لإنشاء مجموعة أسئلة تلقائياً",
        placeholderEn: "Click 'Generate Questions' to create a question set automatically",
        required: true,
      },
    ],
  },
  {
    id: "service-reminder",
    name: "تذكير الخدمة",
    nameEn: "Service Reminder",
    description: "تذكير العميل بموعد صيانة أو خدمة قادمة (غير مفعّل حالياً)",
    descriptionEn: "Remind customer about upcoming maintenance or service appointment (not active)",
    icon: "🔔",
    agentId: "dummy-agent-id-placeholder",
    fields: [
      {
        id: "customer_name",
        label: "اسم العميل",
        labelEn: "Customer Name",
        type: "text",
        placeholder: "حقل غير مفعّل",
        placeholderEn: "Field not active",
        required: false,
      },
      {
        id: "phoneNumber",
        label: "رقم الهاتف",
        labelEn: "Phone Number",
        type: "text",
        placeholder: "حقل غير مفعّل",
        placeholderEn: "Field not active",
        required: false,
      },
      {
        id: "note",
        label: "ملاحظات",
        labelEn: "Notes",
        type: "textarea",
        placeholder: "هذا السيناريو غير مفعّل حالياً - حقول وهمية فقط",
        placeholderEn: "This scenario is not active currently - dummy fields only",
        required: false,
      },
    ],
  },
]

export const OMANTEL_SCENARIOS = ALMOAYYED_SCENARIOS

export function getScenarioById(id: string): CallScenario | undefined {
  return ALMOAYYED_SCENARIOS.find((s) => s.id === id)
}

export function buildPrompt(scenario: CallScenario, language: "ar" | "en", variables: Record<string, string>): string {
  let prompt = language === "ar" ? scenario.systemPromptAr : scenario.systemPromptEn

  if (!prompt) return ""

  Object.entries(variables).forEach(([key, value]) => {
    const doublePlaceholder = `{{${key}}}`
    const singlePlaceholder = `{${key}}`
    const replacementValue = value || (language === "ar" ? "غير متوفر" : "N/A")
    prompt = prompt.replaceAll(doublePlaceholder, replacementValue)
    prompt = prompt.replaceAll(singlePlaceholder, replacementValue)
  })

  return prompt
}

export function getFirstMessage(
  scenario: CallScenario,
  language: "ar" | "en",
  variables: Record<string, string>,
): string {
  let message = language === "ar" ? scenario.firstMessageAr : scenario.firstMessageEn

  if (!message) return ""

  Object.entries(variables).forEach(([key, value]) => {
    const doublePlaceholder = `{{${key}}}`
    const singlePlaceholder = `{${key}}`
    const replacementValue = value || (language === "ar" ? "غير متوفر" : "N/A")
    message = message.replaceAll(doublePlaceholder, replacementValue)
    message = message.replaceAll(singlePlaceholder, replacementValue)
  })

  return message
}

export function getAllScenarios(): CallScenario[] {
  return [...ALMOAYYED_SCENARIOS, ...getCustomScenarios()]
}

export function getCustomScenarios(): CallScenario[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem("customScenarios")
  return stored ? JSON.parse(stored) : []
}

export function saveCustomScenario(scenario: CallScenario): void {
  const customScenarios = getCustomScenarios()
  customScenarios.push(scenario)
  localStorage.setItem("customScenarios", JSON.stringify(customScenarios))
}

export function deleteCustomScenario(id: string): void {
  const customScenarios = getCustomScenarios().filter((s) => s.id !== id)
  localStorage.setItem("customScenarios", JSON.stringify(customScenarios))
}
