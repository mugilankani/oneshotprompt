import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Question,
  QuestionType,
  QuizData,
  MCQOption,
  MatchPair,
  AIQuizResponse,
  AIGeneratedQuestion,
} from "../types";
import { DEFAULT_TIME_PER_QUESTION, NUMBER_OF_QUESTIONS } from "../constants";
import {
  encodeObjectBase64,
  generateId,
  encodeText,
  shuffleArray,
} from "../utils/quizUtils";
import Modal from "../components/Modal";
import { GoogleGenAI } from "@google/genai";

const initialQuestion = (): Question => ({
  id: generateId(),
  text: "",
  type: QuestionType.MCQ,
  options: [
    { id: generateId(), text: "" },
    { id: generateId(), text: "" },
  ],
  correctAnswerMCQ: "",
  matchPairs: [{ id: generateId(), item: "", match: "" }],
});

const QuizCreatorPage: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>(() =>
    Array(NUMBER_OF_QUESTIONS).fill(null).map(initialQuestion)
  );
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [courseMaterial, setCourseMaterial] = useState<string>("");
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(
    DEFAULT_TIME_PER_QUESTION
  );

  // Add this function to handle time input changes
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setTimePerQuestion(isNaN(val) || val < 5 ? DEFAULT_TIME_PER_QUESTION : val);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    const oldQuestion = newQuestions[index];
    newQuestions[index] = { ...oldQuestion, [field]: value };

    if (field === "type") {
      if (value === QuestionType.MCQ) {
        newQuestions[index].matchPairs = [
          { id: generateId(), item: "", match: "" },
        ];
        newQuestions[index].options = oldQuestion.options?.length
          ? oldQuestion.options
          : [
              { id: generateId(), text: "" },
              { id: generateId(), text: "" },
            ];
        newQuestions[index].correctAnswerMCQ = ""; // Reset correct answer
      } else {
        // MATCH
        newQuestions[index].options = [];
        newQuestions[index].correctAnswerMCQ = "";
        newQuestions[index].matchPairs = oldQuestion.matchPairs?.length
          ? oldQuestion.matchPairs
          : [{ id: generateId(), item: "", match: "" }];
      }
    }
    setQuestions(newQuestions);
    setError(null);
    setGeneratedLink(null);
  };

  const handleOptionChange = (
    qIndex: number,
    optIndex: number,
    value: string
  ) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];
    if (question.options) {
      question.options[optIndex].text = value;
      setQuestions(newQuestions);
    }
    setError(null);
    setGeneratedLink(null);
  };

  const addOption = (qIndex: number) => {
    const newQuestions = [...questions];
    if (
      newQuestions[qIndex].options &&
      newQuestions[qIndex].options!.length < 6
    ) {
      newQuestions[qIndex].options!.push({ id: generateId(), text: "" });
      setQuestions(newQuestions);
    }
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];
    if (question.options && question.options!.length > 2) {
      const removedOptionId = question.options![optIndex].id;
      question.options!.splice(optIndex, 1);
      // If the removed option was the correct answer, reset it
      if (question.correctAnswerMCQ === removedOptionId) {
        question.correctAnswerMCQ = "";
      }
      setQuestions(newQuestions);
    }
  };

  const handleMatchPairChange = (
    qIndex: number,
    pairIndex: number,
    field: "item" | "match",
    value: string
  ) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];
    if (question.matchPairs) {
      question.matchPairs[pairIndex][field] = value;
      setQuestions(newQuestions);
    }
    setError(null);
    setGeneratedLink(null);
  };

  const addMatchPair = (qIndex: number) => {
    const newQuestions = [...questions];
    if (
      newQuestions[qIndex].matchPairs &&
      newQuestions[qIndex].matchPairs!.length < 6
    ) {
      newQuestions[qIndex].matchPairs!.push({
        id: generateId(),
        item: "",
        match: "",
      });
      setQuestions(newQuestions);
    }
  };

  const removeMatchPair = (qIndex: number, pairIndex: number) => {
    const newQuestions = [...questions];
    if (
      newQuestions[qIndex].matchPairs &&
      newQuestions[qIndex].matchPairs!.length > 1
    ) {
      // Min 1 pair for match
      newQuestions[qIndex].matchPairs!.splice(pairIndex, 1);
      setQuestions(newQuestions);
    }
  };

  const validateAndGenerateLink = () => {
    setError(null);
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setError(`Question ${i + 1} text is empty.`);
        return;
      }
      if (q.type === QuestionType.MCQ) {
        if (!q.options || q.options.length < 2) {
          setError(`Question ${i + 1} (MCQ) must have at least 2 options.`);
          return;
        }
        if (q.options.some((opt) => !opt.text.trim())) {
          setError(`Question ${i + 1} (MCQ) has an empty option.`);
          return;
        }
        if (!q.correctAnswerMCQ) {
          setError(`Question ${i + 1} (MCQ) correct answer is not selected.`);
          return;
        }
      } else if (q.type === QuestionType.MATCH) {
        if (!q.matchPairs || q.matchPairs.length < 1) {
          setError(`Question ${i + 1} (Match) must have at least 1 pair.`);
          return;
        }
        if (q.matchPairs.some((p) => !p.item.trim() || !p.match.trim())) {
          setError(
            `Question ${i + 1} (Match) has an empty item or match in a pair.`
          );
          return;
        }
      }
    }

    // All questions are plain text. Encode them before generating link.
    const encodedQuestions = questions.map((q) => {
      const encodedQ: Question = {
        ...q,
        id: q.id, // IDs remain plain
        text: encodeText(q.text),
        type: q.type,
      };
      if (q.type === QuestionType.MCQ && q.options) {
        encodedQ.options = q.options.map((opt) => ({
          id: opt.id, // Option ID remains plain
          text: encodeText(opt.text),
        }));
        encodedQ.correctAnswerMCQ = q.correctAnswerMCQ; // Correct answer ID remains plain
      }
      if (q.type === QuestionType.MATCH && q.matchPairs) {
        encodedQ.matchPairs = q.matchPairs.map((pair) => ({
          id: pair.id, // Pair ID remains plain
          item: encodeText(pair.item),
          match: encodeText(pair.match),
        }));
        // Generate matchOptions (pool of shuffled match texts) for the player
        encodedQ.matchOptions = shuffleArray(
          q.matchPairs.map((p) => encodeText(p.match))
        );
      }
      return encodedQ;
    });

    const quizData: QuizData = { timePerQuestion, questions: encodedQuestions };
    const encodedData = encodeObjectBase64(quizData);
    const link = `${window.location.origin}${window.location.pathname}#/play?data=${encodedData}`;
    setGeneratedLink(link);
  };

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard
        .writeText(generatedLink)
        .then(() => alert("Link copied to clipboard!"))
        .catch((err) => console.error("Failed to copy link: ", err));
    }
  };

  const handleAIGenerateQuestions = async () => {
    if (!courseMaterial.trim()) {
      setAiError(
        "Please provide some course material for AI to generate questions."
      );
      return;
    }
    setAiError(null);
    setIsGeneratingAI(true);

    try {
      if (!process.env.API_KEY) {
        setAiError(
          "API Key is not configured. Please set the API_KEY environment variable."
        );
        setIsGeneratingAI(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const prompt = `Based on the following course material, generate ${NUMBER_OF_QUESTIONS} quiz questions suitable for a 'Fastest Finger First' classroom game.
The questions should be a mix of Multiple Choice (MCQ) and Match the Following types.
For MCQs, provide the question text, 3-5 unique options, and clearly indicate the correct answer text.
For Match the Following, provide a general instruction text (e.g., "Match the terms with their definitions."), and 3-5 pairs of items to match.
Ensure the generated content is factual based on the material.

Return the response as a JSON object with a single key "generated_questions" which is an array of question objects.
Each question object must have:
1.  "type": "MCQ" or "MATCH"
2.  "text": The question text or matching instruction.
3.  For "MCQ":
    "options": An array of 3-5 unique strings (the choices).
    "correctAnswerText": A string that exactly matches one of the provided options.
4.  For "MATCH":
    "matchPairs": An array of objects, where each object has "item" (string) and "match" (string).

Course Material:
---
${courseMaterial}
---

Example of desired JSON output structure:
{
  "generated_questions": [
    {
      "type": "MCQ",
      "text": "What is the capital of France?",
      "options": ["Berlin", "Madrid", "Paris", "Rome"],
      "correctAnswerText": "Paris"
    },
    {
      "type": "MATCH",
      "text": "Match the capitals to their countries.",
      "matchPairs": [
        {"item": "Germany", "match": "Berlin"},
        {"item": "Spain", "match": "Madrid"}
      ]
    }
  ]
}
`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17", // Use the specified model
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      let jsonStr = response.text.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }

      const aiResponse: AIQuizResponse = JSON.parse(jsonStr);

      if (
        !aiResponse.generated_questions ||
        aiResponse.generated_questions.length === 0
      ) {
        setAiError(
          "AI did not return any questions. Try refining the course material or prompt."
        );
        setIsGeneratingAI(false);
        return;
      }

      const newQuestionsFromAI = aiResponse.generated_questions
        .slice(0, NUMBER_OF_QUESTIONS)
        .map((aiQ: AIGeneratedQuestion, index: number): Question => {
          const questionTypeFromAI: QuestionType =
            aiQ.type === "MCQ" ? QuestionType.MCQ : QuestionType.MATCH;

          const baseQuestion: Question = {
            id: generateId(),
            text: aiQ.text,
            type: questionTypeFromAI,
            options: [],
            correctAnswerMCQ: "",
            matchPairs: [],
          };

          if (aiQ.type === QuestionType.MCQ) {
            const mcqOptions = aiQ.options.map((optText) => ({
              id: generateId(),
              text: optText,
            }));
            baseQuestion.options = mcqOptions;
            const correctOption = mcqOptions.find(
              (opt) => opt.text === aiQ.correctAnswerText
            );
            baseQuestion.correctAnswerMCQ = correctOption
              ? correctOption.id
              : mcqOptions.length > 0
              ? mcqOptions[0].id
              : "";
          } else if (aiQ.type === QuestionType.MATCH) {
            baseQuestion.matchPairs = aiQ.matchPairs.map((pair) => ({
              id: generateId(),
              item: pair.item,
              match: pair.match,
            }));
          } else {
            console.warn(
              "Unknown question type from AI:",
              (aiQ as any).type,
              "defaulting to MCQ"
            );
            baseQuestion.type = QuestionType.MCQ;
            baseQuestion.text =
              (aiQ as any).text || "AI Generated Question (type error)";
            baseQuestion.options = [
              { id: generateId(), text: "Option A" },
              { id: generateId(), text: "Option B" },
            ];
            baseQuestion.correctAnswerMCQ = baseQuestion.options[0].id;
          }
          return baseQuestion;
        });

      while (newQuestionsFromAI.length < NUMBER_OF_QUESTIONS) {
        newQuestionsFromAI.push(initialQuestion());
      }

      setQuestions(newQuestionsFromAI);
      setGeneratedLink(null);
      setError(null);
    } catch (e: any) {
      console.error("AI Generation Error:", e);
      setAiError(
        `Failed to generate questions with AI. ${
          e.message || "Please try again."
        }`
      );
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold text-slate-700 mb-6">
        Create Your Quiz
      </h2>

      {/* AI Question Generation Section */}
      <div className="bg-slate-50 p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold text-slate-600 mb-4">
          ✨ AI Question Generation ✨
        </h3>
        <textarea
          value={courseMaterial}
          onChange={(e) => setCourseMaterial(e.target.value)}
          placeholder="Paste your course material here... The AI will attempt to create questions based on this."
          rows={8}
          className="w-full p-3 border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow placeholder-slate-400"
          aria-label="Course material for AI question generation"
        />
        <button
          onClick={handleAIGenerateQuestions}
          disabled={isGeneratingAI}
          className="mt-4 px-6 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:bg-slate-400 transition-colors flex items-center justify-center"
        >
          {isGeneratingAI ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generating...
            </>
          ) : (
            "Generate Questions with AI"
          )}
        </button>
        {aiError && <p className="text-red-600 mt-3 text-sm">{aiError}</p>}
      </div>

      {/* Quiz settings */}
      <div className="bg-slate-50 p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold text-slate-600 mb-4">
          Quiz Settings
        </h3>
        <div className="mb-4">
          <label
            htmlFor="timePerQuestion"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Time per question (seconds):
          </label>
          <input
            type="number"
            id="timePerQuestion"
            value={timePerQuestion}
            onChange={handleTimeChange}
            min="5"
            className="w-full md:w-1/3 p-2 border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-sky-500 focus:border-sky-500 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Questions Editor */}
      <div className="space-y-6">
        {questions.map((q, qIndex) => (
          <div
            key={q.id}
            className="bg-white p-6 rounded-lg shadow-md border border-slate-200"
          >
            <h4 className="text-lg font-semibold text-slate-700 mb-3">
              Question {qIndex + 1}
            </h4>
            <div className="mb-3">
              <label
                htmlFor={`qtext-${q.id}`}
                className="block text-sm font-medium text-slate-600 mb-1"
              >
                Question Text:
              </label>
              <textarea
                id={`qtext-${q.id}`}
                value={q.text}
                onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                placeholder="Enter question text"
                rows={3}
                className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-sky-500 focus:border-sky-500 placeholder-slate-400"
                aria-label={`Text for question ${qIndex + 1}`}
              />
            </div>
            <div className="mb-3">
              <label
                htmlFor={`qtype-${q.id}`}
                className="block text-sm font-medium text-slate-600 mb-1"
              >
                Question Type:
              </label>
              <select
                id={`qtype-${q.id}`}
                value={q.type}
                onChange={(e) =>
                  updateQuestion(qIndex, "type", e.target.value as QuestionType)
                }
                className="w-full md:w-1/3 p-2 border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-sky-500 focus:border-sky-500"
                aria-label={`Type for question ${qIndex + 1}`}
              >
                <option value={QuestionType.MCQ}>Multiple Choice (MCQ)</option>
                <option value={QuestionType.MATCH}>Match the Following</option>
              </select>
            </div>

            {q.type === QuestionType.MCQ && (
              <div className="space-y-3 pl-4 border-l-2 border-sky-200">
                <h5 className="text-sm font-medium text-slate-600">Options:</h5>
                {q.options?.map((opt, optIndex) => (
                  <div key={opt.id} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name={`correct-answer-${q.id}`}
                      id={`correct-opt-${opt.id}`}
                      checked={q.correctAnswerMCQ === opt.id}
                      onChange={() =>
                        updateQuestion(qIndex, "correctAnswerMCQ", opt.id)
                      }
                      className="form-radio h-4 w-4 text-sky-600 border-slate-300 focus:ring-sky-500"
                      aria-label={`Mark option ${
                        optIndex + 1
                      } as correct for question ${qIndex + 1}`}
                    />
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) =>
                        handleOptionChange(qIndex, optIndex, e.target.value)
                      }
                      placeholder={`Option ${optIndex + 1}`}
                      className="flex-grow p-2 border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-sky-500 focus:border-sky-500 placeholder-slate-400"
                      aria-label={`Text for option ${
                        optIndex + 1
                      } of question ${qIndex + 1}`}
                    />
                    <button
                      onClick={() => removeOption(qIndex, optIndex)}
                      disabled={(q.options?.length ?? 0) <= 2}
                      className="px-2 py-1 text-red-600 hover:text-red-800 disabled:text-slate-400 disabled:cursor-not-allowed text-sm"
                      aria-label={`Remove option ${
                        optIndex + 1
                      } from question ${qIndex + 1}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addOption(qIndex)}
                  disabled={(q.options?.length ?? 0) >= 6}
                  className="mt-1 px-3 py-1.5 text-sm bg-sky-100 text-sky-700 rounded-md hover:bg-sky-200 disabled:bg-slate-100 disabled:text-slate-400 transition-colors"
                >
                  Add Option
                </button>
              </div>
            )}

            {q.type === QuestionType.MATCH && (
              <div className="space-y-3 pl-4 border-l-2 border-green-200">
                <h5 className="text-sm font-medium text-slate-600">
                  Matching Pairs:
                </h5>
                {q.matchPairs?.map((pair, pairIndex) => (
                  <div
                    key={pair.id}
                    className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center"
                  >
                    <input
                      type="text"
                      value={pair.item}
                      onChange={(e) =>
                        handleMatchPairChange(
                          qIndex,
                          pairIndex,
                          "item",
                          e.target.value
                        )
                      }
                      placeholder={`Item ${pairIndex + 1} (e.g., Term)`}
                      className="p-2 border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-green-500 focus:border-green-500 placeholder-slate-400"
                      aria-label={`Item for pair ${pairIndex + 1} of question ${
                        qIndex + 1
                      }`}
                    />
                    <span className="text-center text-slate-500 hidden md:inline">
                      matches
                    </span>
                    <input
                      type="text"
                      value={pair.match}
                      onChange={(e) =>
                        handleMatchPairChange(
                          qIndex,
                          pairIndex,
                          "match",
                          e.target.value
                        )
                      }
                      placeholder={`Match ${pairIndex + 1} (e.g., Definition)`}
                      className="p-2 border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-green-500 focus:border-green-500 placeholder-slate-400"
                      aria-label={`Match for pair ${
                        pairIndex + 1
                      } of question ${qIndex + 1}`}
                    />
                    <button
                      onClick={() => removeMatchPair(qIndex, pairIndex)}
                      disabled={(q.matchPairs?.length ?? 0) <= 1}
                      className="px-2 py-1 text-red-600 hover:text-red-800 disabled:text-slate-400 disabled:cursor-not-allowed text-sm md:col-start-auto"
                      aria-label={`Remove pair ${pairIndex + 1} from question ${
                        qIndex + 1
                      }`}
                    >
                      Remove Pair
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addMatchPair(qIndex)}
                  disabled={(q.matchPairs?.length ?? 0) >= 6}
                  className="mt-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:bg-slate-100 disabled:text-slate-400 transition-colors"
                >
                  Add Pair
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Generate Link Section */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        {error && (
          <p className="text-red-600 mb-3 text-sm bg-red-100 p-3 rounded-md">
            {error}
          </p>
        )}
        <button
          onClick={validateAndGenerateLink}
          className="w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors text-lg"
        >
          Generate Quiz Link
        </button>
        {generatedLink && (
          <Modal
            isOpen={!!generatedLink}
            onClose={() => setGeneratedLink(null)}
            title="Quiz Link Generated!"
          >
            <p className="text-slate-600 mb-2">
              Share this link with your students:
            </p>
            <input
              type="text"
              readOnly
              value={generatedLink}
              className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 mb-3"
              aria-label="Generated quiz link"
            />
            <button
              onClick={copyLink}
              className="w-full bg-sky-600 text-white py-2 px-4 rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 transition-colors"
            >
              Copy Link
            </button>
            <button
              onClick={() => {
                navigate(`/play?data=${generatedLink.split("data=")[1]}`);
              }}
              className="w-full mt-2 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-colors"
            >
              Go to Quiz (as Student)
            </button>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default QuizCreatorPage;
