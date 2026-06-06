// Fully client-side grading — calls the Google Gemini API directly from the
// browser using a key the user provides. No backend involved.

const STORAGE_KEY = "markwise_gemini_key";
const MODEL = "gemini-2.5-flash";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setApiKey(key: string) {
  if (typeof window === "undefined") return;
  if (key) window.localStorage.setItem(STORAGE_KEY, key.trim());
  else window.localStorage.removeItem(STORAGE_KEY);
}

async function callAI(system: string, user: string): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Add your Google Gemini API key to continue.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(
    apiKey,
  )}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (res.status === 400 || res.status === 401 || res.status === 403) {
    throw new Error("Your API key was rejected. Check it and try again.");
  }
  if (res.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
  if (!res.ok) {
    const text = await res.text();
    console.error("Gemini error", res.status, text);
    throw new Error("AI request failed. Please try again.");
  }

  const json = await res.json();
  const content: string =
    json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse AI response.");
  }
}

// ---------- Extract mark scheme from the model answer paper ----------

export async function extractMarkScheme(modelText: string): Promise<{
  examTotalMarks: number;
  groups: Array<{ name: string; choose: number }>;
  questions: Array<{ number: string; text: string; maxMarks: number; group: string | null }>;
}> {
  return callAI(
    "You are an exam paper analyst. You read a model answer key / question paper and extract a structured mark scheme. " +
      "Return ONLY valid JSON with this exact shape: " +
      '{"examTotalMarks": number, "groups": [{"name": string, "choose": number}], "questions": [{"number": string, "text": string, "maxMarks": number, "group": string|null}]}. ' +
      "Rules: 'number' is the question label (e.g. '1', '2a', 'Q3'). 'text' is a short summary of what the question asks (max 140 chars). " +
      "'maxMarks' is the marks allocated to that question. " +
      "If the paper offers a choice (e.g. 'attempt any 2 of the following', optional questions), put those questions in a group with 'choose' set to how many must be answered, and reference the group name in each question's 'group' field. " +
      "Questions with no choice have group=null. 'examTotalMarks' is the total achievable marks for the whole paper. If unclear, sum the required questions.",
    `Extract the mark scheme from this model answer paper:\n\n${modelText}`,
  );
}

// ---------- Grade a student's answers against the mark scheme ----------

export async function gradeAnswers(input: {
  modelText: string;
  studentText: string;
  questions: Array<{ number: string; text: string; maxMarks: number; group: string | null }>;
}): Promise<{
  results: Array<{ number: string; awarded: number; feedback: string; attempted: boolean }>;
}> {
  return callAI(
    "You are a fair, rigorous exam grader. You compare a student's answers against the model answer key and award marks per question. " +
      "For each question in the provided mark scheme, judge the student's answer on accuracy and completeness versus the model answer. " +
      "Return ONLY valid JSON: " +
      '{"results": [{"number": string, "awarded": number, "feedback": string, "attempted": boolean}]}. ' +
      "Rules: 'awarded' must be between 0 and the question's maxMarks (decimals allowed for partial credit). " +
      "'attempted' is false if the student did not answer that question at all (awarded must be 0). " +
      "'feedback' is 1-2 concise sentences explaining what was correct and what was missing or wrong. " +
      "Be objective and base judgement strictly on the model answer key.",
    `MODEL ANSWER KEY:\n${input.modelText}\n\n` +
      `MARK SCHEME (questions to grade):\n${JSON.stringify(input.questions)}\n\n` +
      `STUDENT'S ANSWERS:\n${input.studentText}`,
  );
}
