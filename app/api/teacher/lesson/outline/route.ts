import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassById } from "@/lib/classes";
import { getKnowledgePoints } from "@/lib/content";
import { generateLessonOutline } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    classId?: string;
    subject?: string;
    grade?: string;
    topic?: string;
    knowledgePointIds?: string[];
  };
  if (!body.topic) {
    return NextResponse.json({ error: "missing topic" }, { status: 400 });
  }

  let subject = body.subject ?? "math";
  let grade = body.grade ?? "4";
  let className = "";

  if (body.classId) {
    const klass = await getClassById(body.classId);
    if (!klass || klass.teacherId !== user.id) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    subject = klass.subject;
    grade = klass.grade;
    className = klass.name;
  }

  const knowledgePoints = await getKnowledgePoints();
  const kpTitles = Array.isArray(body.knowledgePointIds)
    ? knowledgePoints
        .filter((kp) => body.knowledgePointIds?.includes(kp.id))
        .map((kp) => kp.title)
    : [];

  const outline =
    (await generateLessonOutline({
      subject,
      grade,
      topic: body.topic,
      knowledgePoints: kpTitles
    })) ?? {
      objectives: ["明确知识点含义", "掌握关键步骤", "能独立完成同类型题目"],
      keyPoints: kpTitles.length ? kpTitles : ["核心概念", "常见误区"],
      slides: [
        { title: "导入与目标", bullets: ["情境引入", "学习目标"] },
        { title: "概念讲解", bullets: ["定义与例子", "注意事项"] },
        { title: "例题示范", bullets: ["分步讲解", "易错点提示"] },
        { title: "课堂练习", bullets: ["巩固练习", "即时反馈"] }
      ],
      blackboardSteps: ["写出关键概念", "列出解题步骤", "标注易错点", "总结方法"]
    };

  return NextResponse.json({
    data: {
      className,
      subject,
      grade,
      topic: body.topic,
      outline
    }
  });
}
