import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

async function callAI(messages: Array<{ role: string; content: string }>) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured.");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add funds in Settings to continue.");
  if (!res.ok) {
    const text = await res.text();
    console.error("AI gateway error", res.status, text);
    throw new Error("AI request failed. Please try again.");
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    // Sometimes models wrap JSON in markdown fences
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse AI response.");
  }
}

// ---------- Extract mark scheme from the model answer paper ----------

export const extractMarkScheme = createServerFn({ method: "POST" })
  .inputValidator(z.object({ modelText: z.string().min(10).max(120000) }))
  .handler(async ({ data }) => {
    const result = await callAI([
      {
        role: "system",
        content:
          "You are an exam paper analyst. You read a model answer key / question paper and extract a structured mark scheme. " +
          "Return ONLY valid JSON with this exact shape: " +
          '{"examTotalMarks": number, "groups": [{"name": string, "choose": number}], "questions": [{"number": string, "text": string, "maxMarks": number, "group": string|null}]}. ' +
          "Rules: 'number' is the question label (e.g. '1', '2a', 'Q3'). 'text' is a short summary of what the question asks (max 140 chars). " +
          "'maxMarks' is the marks allocated to that question. " +
          "If the paper offers a choice (e.g. 'attempt any 2 of the following', optional questions), put those questions in a group with 'choose' set to how many must be answered, and reference the group name in each question's 'group' field. " +
          "Questions with no choice have group=null. 'examTotalMarks' is the total achievable marks for the whole paper. If unclear, sum the required questions.",
      },
      {
        role: "user",
        content: `Extract the mark scheme from this model answer paper:\n\n${data.modelText}`,
      },
    ]);

    return result as {
      examTotalMarks: number;
      groups: Array<{ name: string; choose: number }>;
      questions: Array<{ number: string; text: string; maxMarks: number; group: string | null }>;
    };
  });

// ---------- Grade a student's answers against the mark scheme ----------

const QuestionSchema = z.object({
  number: z.string(),
  text: z.string(),
  maxMarks: z.number(),
  group: z.string().nullable(),
});

export const gradeAnswers = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      modelText: z.string().min(10).max(120000),
      studentText: z.string().min(1).max(120000),
      questions: z.array(QuestionSchema).min(1).max(200),
    }),
  )
  .handler(async ({ data }) => {
    const result = await callAI([
      {
        role: "system",
        content:
          "You are a fair, rigorous exam grader. You compare a student's answers against the model answer key and award marks per question. " +
          "For each question in the provided mark scheme, judge the student's answer on accuracy and completeness versus the model answer. " +
          "Return ONLY valid JSON: " +
          '{"results": [{"number": string, "awarded": number, "feedback": string, "attempted": boolean}]}. ' +
          "Rules: 'awarded' must be between 0 and the question's maxMarks (decimals allowed for partial credit). " +
          "'attempted' is false if the student did not answer that question at all (awarded must be 0). " +
          "'feedback' is 1-2 concise sentences explaining what was correct and what was missing or wrong. " +
          "Be objective and base judgement strictly on the model answer key.",
      },
      {
        role: "user",
        content:
          `MODEL ANSWER KEY:\n${data.modelText}\n\n` +
          `MARK SCHEME (questions to grade):\n${JSON.stringify(data.questions)}\n\n` +
          `STUDENT'S ANSWERS:\n${data.studentText}`,
      },
    ]);

    return result as {
      results: Array<{ number: string; awarded: number; feedback: string; attempted: boolean }>;
    };
  });
