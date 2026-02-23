import { retrieveKnowledgePoints, retrieveSimilarQuestion } from "./rag";

export type AssistPayload = {
  question: string;
  subject?: string;
  grade?: string;
};

export type AssistResponse = {
  answer: string;
  steps: string[];
  hints: string[];
  sources: string[];
  provider: string;
};

export type QuestionDraft = {
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
};

export type GenerateQuestionPayload = {
  subject: string;
  grade: string;
  knowledgePointTitle: string;
  chapter?: string;
};

const SYSTEM_PROMPT =
  "你是小学课后辅导老师。请用简洁、清晰、分步骤的方式讲解，避免直接给出复杂推理。";

const GENERATE_PROMPT =
  "你是小学人教版出题老师。只输出严格 JSON，不要附加解释或代码块。";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function callCustomLLM(prompt: string) {
  const endpoint = process.env.LLM_ENDPOINT;
  if (!endpoint) return null;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": process.env.LLM_API_KEY ?? "" },
    body: JSON.stringify({ prompt })
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data.text ?? null;
}

async function callChatCompletions(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
}) {
  const { baseUrl, apiKey, model, messages, temperature } = params;
  const path = process.env.LLM_CHAT_PATH ?? "/chat/completions";
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: temperature ?? 0.4,
      stream: false
    })
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === "string" ? text : null;
}

async function callZhipuLLM(messages: ChatMessage[]) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;
  const baseUrl = process.env.LLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";
  const model = process.env.LLM_MODEL ?? "glm-4.7";
  return callChatCompletions({ baseUrl, apiKey, model, messages });
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

function normalizeDraft(input: any): QuestionDraft | null {
  if (!input || typeof input !== "object") return null;
  const stem = String(input.stem ?? "").trim();
  const explanation = String(input.explanation ?? "").trim();
  const rawOptions = Array.isArray(input.options) ? input.options : [];
  const options = rawOptions.map((item: any) => String(item).trim()).filter(Boolean);
  if (!stem || !explanation || options.length < 3) return null;

  const normalizedOptions = options.slice(0, 4);
  let answer = String(input.answer ?? "").trim();
  if (!answer) return null;

  const letterMap = { A: 0, B: 1, C: 2, D: 3 } as const;
  const upper = answer.toUpperCase();
  if (upper in letterMap) {
    const idx = letterMap[upper as keyof typeof letterMap];
    if (normalizedOptions[idx]) {
      answer = normalizedOptions[idx];
    }
  }

  if (!normalizedOptions.includes(answer)) {
    return null;
  }

  return { stem, options: normalizedOptions, answer, explanation };
}

export async function generateQuestionDraft(payload: GenerateQuestionPayload) {
  const provider = process.env.LLM_PROVIDER ?? "mock";
  if (provider === "mock") return null;

  const context = [
    `学科：${payload.subject}`,
    `年级：${payload.grade}`,
    `知识点：${payload.knowledgePointTitle}`,
    payload.chapter ? `章节：${payload.chapter}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `${context}\n请生成 1 道四选一选择题，字段为: stem, options, answer, explanation。\n要求: options 为 4 个简短选项，answer 必须完全等于其中一个选项文本。`;

  let text: string | null = null;
  if (provider === "zhipu" || provider === "compatible") {
    text = await callZhipuLLM([
      { role: "system", content: GENERATE_PROMPT },
      { role: "user", content: userPrompt }
    ]);
  } else if (provider === "custom") {
    text = await callCustomLLM(`${GENERATE_PROMPT}\n${userPrompt}`);
  }

  if (!text) return null;
  const parsed = extractJson(text);
  return normalizeDraft(parsed);
}

export async function generateAssistAnswer(payload: AssistPayload): Promise<AssistResponse> {
  const provider = process.env.LLM_PROVIDER ?? "mock";
  const question = payload.question.trim();
  const subject = payload.subject;
  const grade = payload.grade;

  const relatedQuestion = await retrieveSimilarQuestion(question, subject, grade);
  const relatedKps = await retrieveKnowledgePoints(question, subject, grade);

  const contextLines = [];
  if (relatedQuestion) {
    contextLines.push(`参考题目：${relatedQuestion.stem}`);
    contextLines.push(`参考解析：${relatedQuestion.explanation}`);
  }
  if (relatedKps.length) {
    contextLines.push(`相关知识点：${relatedKps.map((kp) => kp.title).join("、")}`);
  }

  const userPrompt = `问题：${question}\n${contextLines.join("\n")}\n请用 3-5 句话讲清楚思路。`;

  if (provider === "zhipu" || provider === "compatible") {
    const text = await callZhipuLLM([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ]);
    if (text) {
      return {
        answer: text,
        steps: ["识别题干关键点", "匹配知识点", "给出清晰步骤"],
        hints: ["先理解题意", "注意单位一致"],
        sources: relatedKps.map((kp) => kp.title),
        provider
      };
    }
  }

  if (provider === "custom") {
    const prompt = `${SYSTEM_PROMPT}\n${userPrompt}`;
    const text = await callCustomLLM(prompt);
    if (text) {
      return {
        answer: text,
        steps: ["识别题干关键点", "匹配知识点", "给出清晰步骤"],
        hints: ["先理解题意", "注意单位一致"],
        sources: relatedKps.map((kp) => kp.title),
        provider
      };
    }
  }

  if (relatedQuestion) {
    return {
      answer: relatedQuestion.explanation,
      steps: ["看清题目条件", "列出关键关系", "逐步计算"],
      hints: ["先把题目中的已知量圈出来", "分步检查"],
      sources: [relatedQuestion.knowledgePointId],
      provider: "mock"
    };
  }

  const kpNames = relatedKps.map((kp) => kp.title);
  const fallback = kpNames.length
    ? `这道题可能属于：${kpNames.join("、")}。建议先回顾该知识点，再按步骤解题。`
    : "先找出题目中的数量关系，然后一步步推理。";

  return {
    answer: fallback,
    steps: ["找出已知条件", "确定目标", "逐步推导"],
    hints: ["画图或列式", "检查是否需要通分"],
    sources: kpNames,
    provider: "mock"
  };
}
