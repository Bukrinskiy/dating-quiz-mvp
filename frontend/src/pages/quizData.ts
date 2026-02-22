import { MobiSlonEvent, type MobiSlonEvent as MobiSlonEventType } from "../shared/lib/mobiSlonEvents";

export type QuizQuestion = {
  key: string;
  title: string;
  options: string[];
};

export type QuizBlock = {
  id: 1 | 2 | 3 | 4 | 5;
  postbackStatus: MobiSlonEventType;
  nextPath: string;
  questions: QuizQuestion[];
};

export const quizBlockMeta: Array<Pick<QuizBlock, "id" | "postbackStatus" | "nextPath">> = [
  { id: 1, postbackStatus: MobiSlonEvent.BLOCK1_COMPLETED, nextPath: "/block-2" },
  { id: 2, postbackStatus: MobiSlonEvent.BLOCK2_COMPLETED, nextPath: "/block-3" },
  { id: 3, postbackStatus: MobiSlonEvent.BLOCK3_COMPLETED, nextPath: "/block-4" },
  { id: 4, postbackStatus: MobiSlonEvent.BLOCK4_COMPLETED, nextPath: "/block-5" },
  { id: 5, postbackStatus: MobiSlonEvent.BLOCK5_COMPLETED, nextPath: "/block-6" },
];
