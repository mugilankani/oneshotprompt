
import { Question, QuizData, StudentAnswer, QuestionType } from '../types';
import { CORRECT_ANSWER_SCORE, INCORRECT_ANSWER_PENALTY, DEFAULT_TIME_PER_QUESTION } from '../constants';

// Encoding/Decoding for complex objects
export const encodeObjectBase64 = (obj: unknown): string => {
  try {
    const jsonString = JSON.stringify(obj);
    // Standard Base64 encoding for UTF-8 strings
    return btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch (e) {
    console.error("Encoding object error:", e);
    return "";
  }
};

export const decodeObjectBase64 = <T,>(encoded: string): T | null => {
  if (!encoded) return null;
  try {
    // Standard Base64 decoding for UTF-8 strings
    const jsonString = decodeURIComponent(Array.prototype.map.call(atob(encoded), (c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error("Failed to decode Base64 object:", error);
    return null;
  }
};

// Encoding/Decoding for plain text strings
export const encodeText = (text: string): string => {
  try {
    return btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch (e) {
    console.error("Encoding text error:", e);
    return ""; // Should not happen with simple text
  }
};

export const decodeText = (base64Text?: string): string => {
  if (!base64Text) return '';
  try {
    return decodeURIComponent(Array.prototype.map.call(atob(base64Text), (c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch (e) {
    // console.error("Decoding text error:", e, "Input:", base64Text); // Potentially noisy
    return ''; // Return empty if not valid base64 or other error
  }
};


// Scoring function
export const calculateScore = (
  question: Question,
  studentAnswer: string | string[], // For MCQ: selected option ID (plain). For MATCH: array of selected match texts (decoded), in order of items
  timeTaken: number
): { score: number; isCorrect: boolean } => {
  const timePerQuestion = question.timePerQuestion || DEFAULT_TIME_PER_QUESTION; 
  let isCorrect = false;
  let score = 0;

  if (question.type === QuestionType.MCQ) {
    // studentAnswer is the plain ID of the selected option.
    // question.correctAnswerMCQ is the plain ID of the correct option.
    isCorrect = typeof studentAnswer === 'string' && studentAnswer === question.correctAnswerMCQ;
  } else if (question.type === QuestionType.MATCH) {
    if (Array.isArray(studentAnswer) && question.matchPairs && studentAnswer.length === question.matchPairs.length) {
      isCorrect = true;
      for (let i = 0; i < question.matchPairs.length; i++) {
        // studentAnswer[i] contains the *decoded text* of the match selected by the student for item `i`.
        // question.matchPairs[i].match is base64 encoded text from QuizData.
        const decodedCorrectMatchText = decodeText(question.matchPairs[i].match);
        if (studentAnswer[i] !== decodedCorrectMatchText) {
          isCorrect = false;
          break;
        }
      }
    }
  }

  if (isCorrect) {
    const timeFactor = Math.max(0, (timePerQuestion - timeTaken) / timePerQuestion);
    score = parseFloat((CORRECT_ANSWER_SCORE * timeFactor).toFixed(1));
  } else {
    score = INCORRECT_ANSWER_PENALTY;
  }

  return { score, isCorrect };
};


// Helper to generate unique IDs
export const generateId = (): string => Math.random().toString(36).substring(2, 9);

// Shuffle array (for match options)
export const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const getQuizDataFromUrl = (): QuizData | null => {
  const hash = window.location.hash; 
  const searchPartMatch = hash.match(/\?(.*)/); // Get content after '?'
  if (!searchPartMatch || !searchPartMatch[1]) return null;

  const params = new URLSearchParams(searchPartMatch[1]);
  const data = params.get('data');
  
  if (data) {
    const decoded = decodeObjectBase64<QuizData>(data);
    // Add timePerQuestion to each question object if it's not already there,
    // for easier access in calculateScore.
    if (decoded && decoded.questions) {
        decoded.questions.forEach(q => {
            if (!q.timePerQuestion) {
                q.timePerQuestion = decoded.timePerQuestion;
            }
        });
    }
    return decoded;
  }
  return null;
};
