export type QuizQuestion = {
  key: string;
  title: string;
  options: string[];
};

export type QuizBlock = {
  id: 1 | 2 | 3 | 4 | 5;
  postbackStatus: string;
  nextPath: string;
  questions: QuizQuestion[];
};

export const quizBlockMeta: Array<Pick<QuizBlock, "id" | "postbackStatus" | "nextPath">> = [
  { id: 1, postbackStatus: "block1_completed", nextPath: "/block-2" },
  { id: 2, postbackStatus: "block2_completed", nextPath: "/block-3" },
  { id: 3, postbackStatus: "block3_completed", nextPath: "/block-4" },
  { id: 4, postbackStatus: "block4_completed", nextPath: "/block-5" },
  { id: 5, postbackStatus: "block5_completed", nextPath: "/block-6" },
];
