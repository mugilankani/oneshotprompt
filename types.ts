
export enum QuestionType {
  MCQ = 'MCQ',
  MATCH = 'MATCH',
}

export interface MCQOption {
  id: string; // Plain text unique ID
  text: string; // Base64 encoded
}

export interface MatchPair {
  id: string; // Plain text unique ID
  item: string; // Base64 encoded item (e.g., column A)
  match: string; // Base64 encoded match (e.g., column B)
}

export interface Question {
  id: string; // Plain text unique ID
  type: QuestionType;
  text: string; // Base64 encoded
  timePerQuestion?: number; // Optional: Copied from global for convenience during play
  // For MCQ
  options?: MCQOption[]; // Options have text Base64 encoded, IDs are plain
  correctAnswerMCQ?: string; // Plain text ID of the correct MCQOption
  // For MATCH
  matchPairs?: MatchPair[]; // Correct pairings, items and matches are Base64 encoded, IDs are plain
  matchOptions?: string[]; // Pool of options for matching (all 'match' parts from matchPairs, shuffled), Base64 encoded
}

export interface QuizData {
  timePerQuestion: number; // Global time per question in seconds
  questions: Question[];
}

export interface StudentAnswer {
  questionId: string; // Plain text ID
  answer: string | string[]; // For MCQ: plain option ID. For MATCH: array of decoded selected match texts in order of items.
  timeTaken: number; // in seconds
  score: number;
  isCorrect: boolean;
}

// For Match the Following student interaction (currently handled directly in component state)
// export interface MatchAttemptPair {
//   itemId: string; 
//   selectedMatchText: string | null; // Decoded text
// }

// --- AI Generation Types ---
interface AIGeneratedMCQ {
  type: 'MCQ';
  text: string; // Plain text
  options: string[]; // Plain text options
  correctAnswerText: string; // Plain text of the correct answer
}

interface AIGeneratedMatchPair {
  item: string; // Plain text
  match: string; // Plain text
}

interface AIGeneratedMatch {
  type: 'MATCH';
  text: string; // Plain text instruction
  matchPairs: AIGeneratedMatchPair[];
}

export type AIGeneratedQuestion = AIGeneratedMCQ | AIGeneratedMatch;

export interface AIQuizResponse {
  generated_questions: AIGeneratedQuestion[];
}
