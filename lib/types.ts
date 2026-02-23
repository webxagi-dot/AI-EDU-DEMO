export type Subject = "math" | "chinese" | "english";

export type KnowledgePoint = {
  id: string;
  subject: Subject;
  grade: string;
  title: string;
  chapter: string;
};

export type Question = {
  id: string;
  subject: Subject;
  grade: string;
  knowledgePointId: string;
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
};
