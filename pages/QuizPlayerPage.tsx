
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Question, QuizData, StudentAnswer, QuestionType } from '../types';
import { FIXED_ROOM_CODE, DEFAULT_TIME_PER_QUESTION } from '../constants';
import { getQuizDataFromUrl, calculateScore, decodeText } from '../utils/quizUtils';
import useQuizTimer from '../hooks/useQuizTimer';
import ProgressBar from '../components/ProgressBar';
import ConfettiEffect from '../components/ConfettiEffect';
// Modal component is not used on this page directly, can be removed if not planned for future use here.

// Helper component for MCQ display
interface MCQDisplayProps {
  question: Question;
  onAnswer: (optionId: string) => void;
  disabled: boolean;
  selectedOptionId: string | null;
}
const MCQDisplay: React.FC<MCQDisplayProps> = ({ question, onAnswer, disabled, selectedOptionId }) => {
  const handleSelect = (optionId: string) => {
    if (disabled || selectedOptionId) return; // Prevent re-answering if already answered or disabled
    onAnswer(optionId);
  };

  return (
    <div className="space-y-3">
      {question.options?.map((opt) => {
        const decodedOptText = decodeText(opt.text);
        // opt.id is plain, no need to decode.
        return (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt.id)}
            disabled={disabled || selectedOptionId !== null}
            aria-pressed={selectedOptionId === opt.id}
            className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2
              ${selectedOptionId === opt.id ? 'bg-sky-500 border-sky-600 text-white font-semibold shadow-lg ring-2 ring-sky-400 ring-offset-1' 
                                          : 'bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700'}
              ${(disabled || selectedOptionId !== null) && selectedOptionId !== opt.id ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}
              ${(disabled || selectedOptionId !== null) && selectedOptionId === opt.id ? 'cursor-not-allowed' : ''}
            `}
          >
            {decodedOptText}
          </button>
        );
      })}
    </div>
  );
};

// Helper component for Match the Following display
interface MatchDisplayProps {
  question: Question;
  onAnswer: (answers: string[]) => void; // Array of selected match texts (decoded), in order of items
  disabled: boolean;
}
const MatchDisplay: React.FC<MatchDisplayProps> = ({ question, onAnswer, disabled }) => {
  const items = useMemo(() => question.matchPairs?.map(p => ({...p, item: decodeText(p.item), match: decodeText(p.match)})) || [], [question.matchPairs]);
  // question.matchOptions already contains shuffled, encoded match texts. We need to decode them for display and use.
  const options = useMemo(() => question.matchOptions?.map(opt => decodeText(opt)) || [], [question.matchOptions]);


  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  // Store decoded selected match text for each item
  const [attemptedPairs, setAttemptedPairs] = useState<Array<string | null>>(() => Array(items.length).fill(null));

  const handleItemSelect = (index: number) => {
    if (disabled || attemptedPairs[index] !== null) return; // Don't allow re-selecting item if already matched
    setSelectedItemIndex(index);
  };

  const handleOptionSelect = (optionText: string) => { // optionText is decoded
    if (disabled || selectedItemIndex === null || attemptedPairs[selectedItemIndex] !== null) return;
    
    // Check if this optionText is already used for another item
    if (attemptedPairs.some(p => p === optionText)) {
        // Provide feedback (e.g., visual cue or temporary message) if an option is already used
        // For now, just prevent selection
        return; 
    }

    const newAttempts = [...attemptedPairs];
    newAttempts[selectedItemIndex] = optionText;
    setAttemptedPairs(newAttempts);
    setSelectedItemIndex(null); 
  };

  const handleSubmitMatch = () => {
    if (attemptedPairs.some(p => p === null)) {
        // This alert can be replaced with a more integrated UI message
        alert("Please match all items before submitting."); 
        return;
    }
    onAnswer(attemptedPairs as string[]);
  };
  
  const isOptionAttempted = (optionText: string) => attemptedPairs.includes(optionText);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Column A: Items */}
        <div className="space-y-3">
          <h4 className="font-semibold text-lg text-slate-600">Match these Items:</h4>
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleItemSelect(index)}
              disabled={disabled || attemptedPairs[index] !== null}
              aria-pressed={selectedItemIndex === index}
              className={`w-full p-3 text-left rounded-lg border-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1
                ${selectedItemIndex === index ? 'bg-pink-500 border-pink-600 text-white shadow-md ring-pink-400' : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'}
                ${attemptedPairs[index] !== null ? 'bg-green-100 border-green-300 text-green-700 cursor-default' : ''}
                ${disabled && attemptedPairs[index] === null ? 'opacity-60 cursor-not-allowed' : ''}
              `}
            >
              {item.item} {attemptedPairs[index] ? <span className="text-sm text-green-600"> ➤ {attemptedPairs[index]}</span> : ''}
            </button>
          ))}
        </div>
        {/* Column B: Options */}
        <div className="space-y-3">
          <h4 className="font-semibold text-lg text-slate-600">With these Options:</h4>
          {options.map((optionText, index) => (
            <button
              key={`option-${index}`} // Using index as key is okay here as options are shuffled once and stable
              onClick={() => handleOptionSelect(optionText)}
              disabled={disabled || selectedItemIndex === null || isOptionAttempted(optionText)}
              className={`w-full p-3 text-left rounded-lg border-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1
                ${selectedItemIndex !== null && !isOptionAttempted(optionText) ? 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200 text-yellow-800 ring-yellow-300' : ''}
                ${isOptionAttempted(optionText) ? 'bg-slate-200 border-slate-300 text-slate-500 line-through cursor-default' : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'}
                ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
              `}
            >
              {optionText}
            </button>
          ))}
        </div>
      </div>
      {!disabled && (
        <button 
          onClick={handleSubmitMatch} 
          disabled={disabled || attemptedPairs.some(p => p === null)}
          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Submit Matches
        </button>
      )}
    </div>
  );
};


const QuizPlayerPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>([]);
  const [roomCode, setRoomCode] = useState('');
  const [roomEntered, setRoomEntered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [answerSubmittedForCurrent, setAnswerSubmittedForCurrent] = useState(false);
  // For MCQ display, to show which option was selected
  const [selectedMCQOptionId, setSelectedMCQOptionId] = useState<string | null>(null);


  useEffect(() => {
    const data = getQuizDataFromUrl();
    if (data) {
      if (data.questions && data.questions.length > 0) {
        setQuizData(data);
      } else {
        setError('Quiz contains no questions.');
      }
    } else {
      setError('Invalid quiz link or data not found. Please go back and create a new quiz.');
    }
  }, [location]);

  const handleTimeUp = useCallback(() => {
    if (!quizData || quizFinished || answerSubmittedForCurrent) return;
    
    const currentQ = quizData.questions[currentQuestionIndex];
    let defaultAnswer: string | string[] = ''; // Empty string for unanswered MCQ
    if (currentQ.type === QuestionType.MATCH && currentQ.matchPairs) {
        defaultAnswer = Array(currentQ.matchPairs.length).fill(''); // Empty strings for unanswered matches
    }

    const { score, isCorrect } = calculateScore(currentQ, defaultAnswer, DEFAULT_TIME_PER_QUESTION);
    
    setStudentAnswers(prev => [...prev, {
      questionId: currentQ.id,
      answer: defaultAnswer,
      timeTaken: DEFAULT_TIME_PER_QUESTION,
      score,
      isCorrect
    }]);
    setAnswerSubmittedForCurrent(true); 
    setTimeout(() => {
        moveToNextQuestion();
    }, 1500); 
  }, [quizData, currentQuestionIndex, quizFinished, answerSubmittedForCurrent]);


  const { timeLeft, formattedTime, resetTimer, pauseTimer, startTimer } = useQuizTimer({
    duration: quizData?.timePerQuestion || DEFAULT_TIME_PER_QUESTION,
    onTimeUp: handleTimeUp,
    autoStart: false,
  });

  const handleRoomCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim().toLowerCase() === FIXED_ROOM_CODE.toLowerCase()) {
      setRoomEntered(true);
      setError(null);
      if (quizData && quizData.questions.length > 0) {
        resetTimer(quizData.timePerQuestion);
        startTimer();
      }
    } else {
      setError('Invalid Room Code. Please check and try again.');
    }
  };

  const moveToNextQuestion = () => {
    pauseTimer();
    setAnswerSubmittedForCurrent(false);
    setSelectedMCQOptionId(null); // Reset selected MCQ option for the next question

    if (quizData && currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      resetTimer(quizData.timePerQuestion);
      startTimer();
    } else {
      setQuizFinished(true);
      // Score calculation will be triggered by useEffect below
    }
  };

  const handleAnswer = (answerData: string | string[]) => {
    if (!quizData || answerSubmittedForCurrent) return;
    pauseTimer();
    setAnswerSubmittedForCurrent(true);
    if (typeof answerData === 'string' && quizData.questions[currentQuestionIndex].type === QuestionType.MCQ) {
      setSelectedMCQOptionId(answerData);
    }


    const question = quizData.questions[currentQuestionIndex];
    const timeTaken = (quizData.timePerQuestion || DEFAULT_TIME_PER_QUESTION) - timeLeft;
    const { score, isCorrect } = calculateScore(question, answerData, timeTaken);

    setStudentAnswers(prev => [...prev, {
      questionId: question.id,
      answer: answerData,
      timeTaken,
      score,
      isCorrect,
    }]);
    
    setTimeout(() => {
        moveToNextQuestion();
    }, 1200); 
  };

  useEffect(() => { 
    if (quizFinished) {
        setTotalScore(studentAnswers.reduce((acc, curr) => acc + curr.score, 0));
    }
  }, [studentAnswers, quizFinished]);


  if (error && !quizData) { // Show initial error like invalid link and no quizData
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] text-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-md" role="alert">
                <strong className="font-bold">Error!</strong>
                <span className="block sm:inline"> {error}</span>
            </div>
            <button
                onClick={() => navigate('/create')}
                className="mt-6 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-6 rounded-lg shadow hover:shadow-md transition-all"
            >
                Create a New Quiz
            </button>
        </div>
    );
  }
  
  if (!quizData) { // Loading state if quizData is still null but no critical error yet
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-16rem)] text-slate-600 text-xl">
            Loading quiz, please wait...
        </div>
    );
  }


  if (!roomEntered) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
        <form onSubmit={handleRoomCodeSubmit} className="w-full max-w-sm space-y-6 bg-white p-8 rounded-xl shadow-xl border border-slate-200">
          <h2 className="text-3xl font-semibold text-slate-700 text-center">Enter Room Code</h2>
          <div>
            <label htmlFor="roomCode" className="sr-only">Room Code</label>
            <input
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="e.g., 123a"
              className="w-full p-4 text-slate-700 rounded-lg border-2 border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 transition-all text-lg"
              aria-describedby={error ? "roomError" : undefined}
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          >
            Enter Quiz
          </button>
          {error && <p id="roomError" className="text-red-600 text-sm text-center mt-2">{error}</p>}
        </form>
      </div>
    );
  }

  if (quizFinished) {
    return (
      <div className="text-center space-y-6 p-6 md:p-10 bg-white rounded-xl shadow-xl border border-slate-200 relative max-w-2xl mx-auto">
        <ConfettiEffect />
        <h2 className="text-4xl md:text-5xl font-bold text-slate-700">Quiz Finished!</h2>
        <p className="text-2xl text-slate-600">Your Final Score:</p>
        <p className="text-6xl md:text-7xl font-extrabold text-sky-600">{totalScore.toFixed(1)}</p>
        
        <div className="mt-8 max-h-72 overflow-y-auto p-4 space-y-3 text-left bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-xl text-slate-700 font-semibold mb-3 sticky top-0 bg-slate-50 py-2">Review Your Answers:</h3>
            {studentAnswers.map((ans, idx) => {
                const q = quizData.questions.find(q => q.id === ans.questionId);
                return (
                    <div key={idx} className={`p-3 rounded-md border ${ans.isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                        <p className="text-sm font-medium text-slate-700">Q{idx+1}: {decodeText(q?.text)}</p>
                        <p className={`text-xs ${ans.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            Scored: {ans.score.toFixed(1)} (Time: {ans.timeTaken.toFixed(1)}s)
                        </p>
                    </div>
                );
            })}
        </div>
        <button
          onClick={() => navigate('/create')}
          className="mt-8 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        >
          Create Another Quiz
        </button>
      </div>
    );
  }

  const currentQ = quizData.questions[currentQuestionIndex];
  const decodedQuestionText = decodeText(currentQ.text);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 p-6 md:p-8 bg-white rounded-xl shadow-xl border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-2xl md:text-3xl font-semibold text-slate-700">
          Question {currentQuestionIndex + 1}
          <span className="text-slate-500 text-lg ml-2">of {quizData.questions.length}</span>
        </h2>
        <div 
            className={`text-3xl md:text-4xl font-bold tabular-nums px-3 py-1 rounded-md shadow-sm
            ${timeLeft <= 10 && timeLeft > 5 ? 'text-yellow-600 bg-yellow-100 border border-yellow-300' : timeLeft <=5 ? 'text-red-600 bg-red-100 border border-red-300 animate-pulse' : 'text-green-600 bg-green-100 border border-green-300'}`}
        >
          {formattedTime}
        </div>
      </div>
      <ProgressBar duration={quizData.timePerQuestion || DEFAULT_TIME_PER_QUESTION} timeLeft={timeLeft} />
      
      <div className="p-4 md:p-6 bg-slate-50 border border-slate-200 rounded-lg min-h-[120px] flex items-center justify-center">
        <p className="text-xl md:text-2xl text-slate-800 text-center">{decodedQuestionText}</p>
      </div>

      {currentQ.type === QuestionType.MCQ && (
        <MCQDisplay 
          question={currentQ} 
          onAnswer={handleAnswer} 
          disabled={answerSubmittedForCurrent}
          selectedOptionId={selectedMCQOptionId} 
        />
      )}
      {currentQ.type === QuestionType.MATCH && (
        <MatchDisplay question={currentQ} onAnswer={handleAnswer} disabled={answerSubmittedForCurrent} />
      )}
       {answerSubmittedForCurrent && !quizFinished && (
            <div className="text-center text-lg text-sky-700 p-3 rounded-md bg-sky-100 border border-sky-300">
                Answer recorded! Preparing next question...
            </div>
        )}
    </div>
  );
};

export default QuizPlayerPage;
