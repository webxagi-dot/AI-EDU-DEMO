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

export type KnowledgePointDraft = {
  title: string;
  chapter: string;
};

export type KnowledgeTreeDraft = {
  units: {
    title: string;
    chapters: {
      title: string;
      points: { title: string }[];
    }[];
  }[];
};

export type GenerateQuestionPayload = {
  subject: string;
  grade: string;
  knowledgePointTitle: string;
  chapter?: string;
  difficulty?: "easy" | "medium" | "hard";
  questionType?: string;
};

export type WrongExplanation = {
  analysis: string;
  hints: string[];
};

export type WritingFeedback = {
  scores: {
    structure: number;
    grammar: number;
    vocab: number;
  };
  summary: string;
  strengths: string[];
  improvements: string[];
  corrected?: string;
};

export type GenerateKnowledgePointsPayload = {
  subject: string;
  grade: string;
  chapter?: string;
  count?: number;
};

export type GenerateKnowledgeTreePayload = {
  subject: string;
  grade: string;
  edition?: string;
  volume?: string;
  unitCount?: number;
  chaptersPerUnit?: number;
  pointsPerChapter?: number;
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

function normalizeOption(text: string) {
  return text
    .replace(/^[A-Da-d][\\.、\\)）:：]\\s*/, "")
    .replace(/^选项\\s*[A-Da-d]\\s*[:：]/, "")
    .trim();
}

function normalizeTitle(text: string) {
  return text
    .replace(/^\\d+[\\.、\\)]\\s*/, "")
    .replace(/^第[一二三四五六七八九十]+[单元章节]\\s*/, "")
    .trim();
}

function normalizeDraft(input: any): QuestionDraft | null {
  if (!input || typeof input !== "object") return null;
  const stem = String(input.stem ?? "").trim();
  const explanation = String(input.explanation ?? "").trim();
  const rawOptions = Array.isArray(input.options) ? input.options : [];
  const options = rawOptions
    .map((item: any) => normalizeOption(String(item)))
    .filter(Boolean);
  if (!stem || !explanation || options.length < 4) return null;

  const uniqueOptions: string[] = [];
  options.forEach((opt: string) => {
    if (!uniqueOptions.includes(opt)) uniqueOptions.push(opt);
  });
  if (uniqueOptions.length < 4) return null;
  const normalizedOptions = uniqueOptions.slice(0, 4);
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
    payload.chapter ? `章节：${payload.chapter}` : "",
    payload.difficulty ? `难度：${payload.difficulty}` : "",
    payload.questionType ? `题型：${payload.questionType}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `${context}\n请生成 1 道四选一选择题，字段为: stem, options, answer, explanation。\n要求: options 为 4 个简短选项，answer 必须完全等于其中一个选项文本，不要包含 A/B/C/D 前缀。`;

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

export async function generateWrongExplanation(payload: {
  subject: string;
  grade: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  explanation?: string;
  knowledgePointTitle?: string;
}) {
  const provider = process.env.LLM_PROVIDER ?? "mock";
  if (provider === "mock") return null;

  const context = [
    `学科：${payload.subject}`,
    `年级：${payload.grade}`,
    payload.knowledgePointTitle ? `知识点：${payload.knowledgePointTitle}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `${context}\n题目：${payload.question}\n学生答案：${payload.studentAnswer}\n正确答案：${payload.correctAnswer}\n已有解析：${payload.explanation ?? ""}\n请指出学生可能的错误原因，并用简洁语言给出纠正讲解与 2-3 条提示。返回 JSON：{\"analysis\":\"...\",\"hints\":[\"...\",\"...\"]}。不要输出多余文本。`;

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
  if (!parsed || typeof parsed !== "object") return null;
  const analysis = String((parsed as any).analysis ?? "").trim();
  const hintsRaw = Array.isArray((parsed as any).hints) ? (parsed as any).hints : [];
  const hints = hintsRaw.map((item: any) => String(item).trim()).filter(Boolean);
  if (!analysis) return null;
  return { analysis, hints: hints.slice(0, 3) };
}

export async function generateVariantDrafts(payload: {
  subject: string;
  grade: string;
  knowledgePointTitle: string;
  chapter?: string;
  seedQuestion: string;
  count?: number;
  difficulty?: "easy" | "medium" | "hard";
}) {
  const provider = process.env.LLM_PROVIDER ?? "mock";
  if (provider === "mock") return null;

  const count = Math.min(Math.max(Number(payload.count) || 2, 1), 4);
  const context = [
    `学科：${payload.subject}`,
    `年级：${payload.grade}`,
    `知识点：${payload.knowledgePointTitle}`,
    payload.chapter ? `章节：${payload.chapter}` : "",
    payload.difficulty ? `难度：${payload.difficulty}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `${context}\n参考题目：${payload.seedQuestion}\n请生成 ${count} 道同类型变式选择题，返回 JSON：{\"items\":[{\"stem\":\"...\",\"options\":[\"...\"],\"answer\":\"...\",\"explanation\":\"...\"}]}。要求选项为 4 个，答案必须等于某个选项文本，不要附加 A/B/C/D。不要输出多余文本。`;

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
  if (!parsed) return null;
  const rawItems = Array.isArray((parsed as any).items) ? (parsed as any).items : Array.isArray(parsed) ? parsed : [];
  if (!rawItems.length) return null;

  const drafts: QuestionDraft[] = [];
  rawItems.forEach((item: any) => {
    const draft = normalizeDraft(item);
    if (draft) drafts.push(draft);
  });

  return drafts.length ? drafts.slice(0, count) : null;
}

export async function generateWritingFeedback(payload: {
  subject: string;
  grade: string;
  title?: string;
  content: string;
}) {
  const provider = process.env.LLM_PROVIDER ?? "mock";
  if (provider === "mock") return null;

  const context = [`学科：${payload.subject}`, `年级：${payload.grade}`, payload.title ? `题目：${payload.title}` : ""]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `${context}\n写作内容：${payload.content}\n请给出结构、语法、词汇三个维度的评分（0-100），并提供简短总结、优点、改进建议。返回 JSON：{\"scores\":{\"structure\":80,\"grammar\":78,\"vocab\":75},\"summary\":\"...\",\"strengths\":[\"...\"],\"improvements\":[\"...\"],\"corrected\":\"...\"}。不要输出多余文本。`;

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
  if (!parsed || typeof parsed !== "object") return null;

  const scores = (parsed as any).scores ?? {};
  const normalizeScore = (value: any) => {
    const num = Number(value);
    if (Number.isNaN(num)) return 0;
    return Math.max(0, Math.min(100, Math.round(num)));
  };

  const summary = String((parsed as any).summary ?? "").trim();
  const strengths = Array.isArray((parsed as any).strengths)
    ? (parsed as any).strengths.map((item: any) => String(item).trim()).filter(Boolean)
    : [];
  const improvements = Array.isArray((parsed as any).improvements)
    ? (parsed as any).improvements.map((item: any) => String(item).trim()).filter(Boolean)
    : [];
  const corrected = String((parsed as any).corrected ?? "").trim();

  return {
    scores: {
      structure: normalizeScore(scores.structure),
      grammar: normalizeScore(scores.grammar),
      vocab: normalizeScore(scores.vocab)
    },
    summary: summary || "已完成基础批改，请参考评分与建议进行修改。",
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
    corrected: corrected || undefined
  } as WritingFeedback;
}

export async function generateKnowledgePointsDraft(payload: GenerateKnowledgePointsPayload) {
  const provider = process.env.LLM_PROVIDER ?? "mock";
  if (provider === "mock") return null;

  const count = Math.min(Math.max(Number(payload.count) || 5, 1), 10);
  const context = [
    `学科：${payload.subject}`,
    `年级：${payload.grade}`,
    payload.chapter ? `章节：${payload.chapter}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `${context}\n请生成 ${count} 个知识点名称，返回 JSON。格式: {\"items\":[{\"title\":\"...\",\"chapter\":\"...\"}]}。\n要求: title 简洁准确，chapter 如果已提供则使用，否则给出合理章节名。不要输出多余文本。`;

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
  if (!parsed) return null;

  const rawItems = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : [];
  if (!rawItems.length) return null;

  const seen = new Set<string>();
  const items: KnowledgePointDraft[] = [];

  for (const item of rawItems) {
    const title = normalizeTitle(String(item?.title ?? "")).trim();
    const chapter = String(item?.chapter ?? payload.chapter ?? "未归类").trim();
    if (!title) continue;
    const key = `${title}|${chapter}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ title, chapter });
    if (items.length >= count) break;
  }

  return items.length ? items : null;
}

export async function generateKnowledgeTreeDraft(payload: GenerateKnowledgeTreePayload) {
  const provider = process.env.LLM_PROVIDER ?? "mock";
  if (provider === "mock") return null;

  const unitCount = Math.min(Math.max(Number(payload.unitCount) || 6, 1), 12);
  const chaptersPerUnit = Math.min(Math.max(Number(payload.chaptersPerUnit) || 2, 1), 4);
  const pointsPerChapter = Math.min(Math.max(Number(payload.pointsPerChapter) || 4, 2), 8);
  const edition = payload.edition ?? "人教版";
  const volume = payload.volume ?? "上册";

  const context = [
    `学科：${payload.subject}`,
    `年级：${payload.grade}`,
    `教材版本：${edition}`,
    `册次：${volume}`
  ].join("\n");

  const userPrompt = `${context}\n请输出整本书的知识点树，按“单元->章节->知识点”分层，返回 JSON：{\"units\":[{\"title\":\"第一单元\",\"chapters\":[{\"title\":\"...\",\"points\":[{\"title\":\"...\"}]}]}]}。\n单元数量约 ${unitCount} 个，每单元 ${chaptersPerUnit} 章，每章 ${pointsPerChapter} 个知识点。不要输出多余文本。`;

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
  if (!parsed) return null;

  const rawUnits = Array.isArray(parsed.units) ? parsed.units : Array.isArray(parsed) ? parsed : [];
  if (!rawUnits.length) return null;

  const units: KnowledgeTreeDraft["units"] = [];

  for (const rawUnit of rawUnits) {
    const unitTitle = normalizeTitle(String(rawUnit?.title ?? "")).trim();
    if (!unitTitle) continue;
    const rawChapters = Array.isArray(rawUnit?.chapters) ? rawUnit.chapters : [];
    const chapters: KnowledgeTreeDraft["units"][number]["chapters"] = [];

    for (const rawChapter of rawChapters) {
      const chapterTitle = normalizeTitle(String(rawChapter?.title ?? "")).trim();
      if (!chapterTitle) continue;
      const rawPoints = Array.isArray(rawChapter?.points) ? rawChapter.points : [];
      const points = rawPoints
        .map((point: any) => ({ title: normalizeTitle(String(point?.title ?? "")).trim() }))
        .filter((point: any) => point.title);

      if (!points.length) continue;
      const trimmedPoints = points.slice(0, pointsPerChapter);
      chapters.push({ title: chapterTitle, points: trimmedPoints });
      if (chapters.length >= chaptersPerUnit) break;
    }

    if (!chapters.length) continue;
    units.push({ title: unitTitle, chapters });
    if (units.length >= unitCount) break;
  }

  return units.length ? { units } : null;
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
