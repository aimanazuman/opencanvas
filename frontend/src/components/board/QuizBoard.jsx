import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Trash2, Edit3, Check, X, Clock, Trophy, ChevronRight,
  ChevronLeft, Settings, Play, RotateCcw, CheckCircle, XCircle,
  HelpCircle, ToggleLeft, ToggleRight, GripVertical, Loader2, Eye
} from 'lucide-react';
import { useBoard } from '../../contexts/BoardContext';
import { useAuth } from '../../contexts/AuthContext';
import { generateId } from '../../utils/boardHelpers';
import { boardsApi } from '../../services/api';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice', icon: HelpCircle },
  { value: 'true-false', label: 'True / False', icon: ToggleLeft },
  { value: 'fill-blank', label: 'Fill in the Blank', icon: Edit3 },
];

const DEFAULT_TIME_LIMIT = 30;
const DEFAULT_POINTS = 10;

function createEmptyQuestion(type = 'mcq') {
  const base = {
    id: generateId(),
    text: '',
    type,
    timeLimit: DEFAULT_TIME_LIMIT,
    points: DEFAULT_POINTS,
  };

  if (type === 'mcq') {
    return { ...base, options: ['', '', '', ''], correctAnswer: 0 };
  } else if (type === 'true-false') {
    return { ...base, options: ['True', 'False'], correctAnswer: 0 };
  } else {
    return { ...base, correctAnswer: '' };
  }
}

// ─── Builder Mode ────────────────────────────────────────────────────────────
function QuizBuilder({ questions, settings, onUpdateQuestions, onUpdateSettings }) {
  const [editingId, setEditingId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const addQuestion = (type) => {
    const q = createEmptyQuestion(type);
    onUpdateQuestions([...questions, q]);
    setEditingId(q.id);
  };

  const updateQuestion = (id, updates) => {
    onUpdateQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id) => {
    onUpdateQuestions(questions.filter(q => q.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const moveQuestion = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const arr = [...questions];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    onUpdateQuestions(arr);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Settings toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Quiz Builder</h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center space-x-1.5 text-sm text-gray-600 hover:text-indigo-600 transition"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* Quiz Settings */}
      {showSettings && (
        <div className="bg-white rounded-xl border p-5 space-y-4 animate-slideDown">
          <h3 className="font-semibold text-gray-800">Quiz Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Shuffle Questions</span>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, shuffleQuestions: !settings.shuffleQuestions })}
                className={`p-0.5 rounded-full transition ${settings.shuffleQuestions ? 'text-indigo-600' : 'text-gray-400'}`}
              >
                {settings.shuffleQuestions ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Show Results</span>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, showResults: !settings.showResults })}
                className={`p-0.5 rounded-full transition ${settings.showResults ? 'text-indigo-600' : 'text-gray-400'}`}
              >
                {settings.showResults ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Allow Retake</span>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, allowRetake: !settings.allowRetake })}
                className={`p-0.5 rounded-full transition ${settings.allowRetake ? 'text-indigo-600' : 'text-gray-400'}`}
              >
                {settings.allowRetake ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question List */}
      {questions.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-lg font-medium">No questions yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your first question to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={idx}
              isEditing={editingId === q.id}
              onEdit={() => setEditingId(editingId === q.id ? null : q.id)}
              onUpdate={(updates) => updateQuestion(q.id, updates)}
              onDelete={() => removeQuestion(q.id)}
              onMove={(dir) => moveQuestion(idx, dir)}
              total={questions.length}
            />
          ))}
        </div>
      )}

      {/* Add Question Buttons */}
      <div className="flex flex-wrap gap-2">
        {QUESTION_TYPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => addQuestion(value)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition text-sm font-medium text-gray-700"
          >
            <Plus className="w-4 h-4 text-indigo-500" />
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function QuestionCard({ question, index, isEditing, onEdit, onUpdate, onDelete, onMove, total }) {
  const typeInfo = QUESTION_TYPES.find(t => t.value === question.type) || QUESTION_TYPES[0];

  return (
    <div className={`bg-white rounded-xl border transition ${isEditing ? 'border-indigo-300 shadow-md' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-xl">
        <div className="flex items-center space-x-3">
          <div className="flex flex-col">
            <button onClick={() => onMove(-1)} disabled={index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><GripVertical className="w-4 h-4" /></button>
          </div>
          <span className="text-sm font-semibold text-gray-500">Q{index + 1}</span>
          <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">{typeInfo.label}</span>
          <span className="text-xs text-gray-400">{question.points} pts | {question.timeLimit}s</span>
        </div>
        <div className="flex items-center space-x-1">
          <button onClick={onEdit} className="p-1.5 hover:bg-gray-200 rounded-lg transition">
            <Edit3 className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={onDelete} className="p-1.5 hover:bg-red-100 rounded-lg transition">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          <QuestionEditor question={question} onUpdate={onUpdate} />
        ) : (
          <div>
            <p className="text-gray-800 font-medium">{question.text || <span className="text-gray-400 italic">Enter question text...</span>}</p>
            {question.type !== 'fill-blank' && question.options && (
              <div className="mt-2 space-y-1">
                {question.options.map((opt, i) => (
                  <div key={i} className={`text-sm px-3 py-1.5 rounded ${
                    i === question.correctAnswer ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600'
                  }`}>
                    {String.fromCharCode(65 + i)}. {opt || <span className="text-gray-400 italic">Option {i + 1}</span>}
                    {i === question.correctAnswer && <CheckCircle className="w-3.5 h-3.5 inline ml-1" />}
                  </div>
                ))}
              </div>
            )}
            {question.type === 'fill-blank' && (
              <p className="text-sm text-green-600 mt-2">Answer: {question.correctAnswer || '(not set)'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionEditor({ question, onUpdate }) {
  return (
    <div className="space-y-4">
      <textarea
        value={question.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        placeholder="Enter your question..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
        rows={2}
      />

      {question.type === 'mcq' && (
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <div key={i} className="flex items-center space-x-2">
              <button
                onClick={() => onUpdate({ correctAnswer: i })}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition ${
                  i === question.correctAnswer
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-300 text-gray-400 hover:border-green-400'
                }`}
              >
                {String.fromCharCode(65 + i)}
              </button>
              <input
                value={opt}
                onChange={(e) => {
                  const opts = [...question.options];
                  opts[i] = e.target.value;
                  onUpdate({ options: opts });
                }}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
        </div>
      )}

      {question.type === 'true-false' && (
        <div className="flex space-x-3">
          {['True', 'False'].map((label, i) => (
            <button
              key={label}
              onClick={() => onUpdate({ correctAnswer: i })}
              className={`flex-1 py-2 rounded-lg border-2 font-medium transition ${
                i === question.correctAnswer
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-500 hover:border-green-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {question.type === 'fill-blank' && (
        <input
          value={question.correctAnswer}
          onChange={(e) => onUpdate({ correctAnswer: e.target.value })}
          placeholder="Correct answer"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
        />
      )}

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <input
            type="number"
            min={5}
            max={300}
            value={question.timeLimit}
            onChange={(e) => onUpdate({ timeLimit: parseInt(e.target.value) || DEFAULT_TIME_LIMIT })}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
          />
          <span className="text-xs text-gray-500">sec</span>
        </div>
        <div className="flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-gray-400" />
          <input
            type="number"
            min={1}
            max={100}
            value={question.points}
            onChange={(e) => onUpdate({ points: parseInt(e.target.value) || DEFAULT_POINTS })}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
          />
          <span className="text-xs text-gray-500">pts</span>
        </div>
      </div>
    </div>
  );
}

// ─── Start Screen ─────────────────────────────────────────────────────────────
function QuizStartScreen({ questions, settings, onStart }) {
  const totalPoints = questions.reduce((s, q) => s + q.points, 0);
  const totalTime = questions.reduce((s, q) => s + q.timeLimit, 0);
  const minutes = Math.floor(totalTime / 60);
  const seconds = totalTime % 60;

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="bg-white rounded-2xl border shadow-sm p-8 space-y-6">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
          <Play className="w-10 h-10 text-indigo-600 ml-1" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Start?</h2>
          <p className="text-gray-500">Review the quiz details below before you begin.</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-indigo-600">{questions.length}</p>
            <p className="text-xs text-gray-500 mt-1">Questions</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-indigo-600">{totalPoints}</p>
            <p className="text-xs text-gray-500 mt-1">Total Points</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-indigo-600">
              {minutes > 0 ? `${minutes}m` : ''}{seconds > 0 ? `${seconds}s` : minutes > 0 ? '' : '0s'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Time Limit</p>
          </div>
        </div>

        <div className="text-left text-sm text-gray-600 space-y-1.5 bg-gray-50 rounded-lg p-4">
          <p className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>Overall time limit across all questions</span>
          </p>
          {settings.shuffleQuestions && (
            <p className="flex items-center space-x-2">
              <RotateCcw className="w-4 h-4 text-gray-400" />
              <span>Questions will be shuffled</span>
            </p>
          )}
          {settings.showResults && (
            <p className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-gray-400" />
              <span>Results will be shown after completion</span>
            </p>
          )}
          {settings.allowRetake && (
            <p className="flex items-center space-x-2">
              <RotateCcw className="w-4 h-4 text-gray-400" />
              <span>You can retake this quiz</span>
            </p>
          )}
        </div>

        <button
          onClick={onStart}
          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold text-lg active:scale-95"
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
}

// ─── Player Mode ─────────────────────────────────────────────────────────────
function QuizPlayer({ questions, settings, userId, existingResponse, onSubmitResponse }) {
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const timerRef = useRef(null);

  // Calculate total time from all questions
  const totalTime = React.useMemo(
    () => questions.reduce((s, q) => s + q.timeLimit, 0),
    [questions]
  );
  const [timeLeft, setTimeLeft] = useState(totalTime);

  const activeQuestions = React.useMemo(() => {
    if (!settings.shuffleQuestions) return questions;
    return [...questions].sort(() => Math.random() - 0.5);
  }, [questions, settings.shuffleQuestions]);

  const currentQ = activeQuestions[currentIdx];

  // Overall timer - starts only when quiz has started
  useEffect(() => {
    if (!started || finished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started, finished]);

  // Auto-finish when timer hits 0
  useEffect(() => {
    if (started && timeLeft === 0 && !finished) {
      handleFinish();
    }
  }, [timeLeft, started, finished]);

  const selectAnswer = (answer) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: answer }));
  };

  const nextQuestion = () => {
    if (currentIdx < activeQuestions.length - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = useCallback(() => {
    clearInterval(timerRef.current);
    setFinished(true);

    // Calculate score
    let score = 0;
    activeQuestions.forEach(q => {
      const answer = answers[q.id];
      if (answer === undefined || answer === null) return;
      if (q.type === 'fill-blank') {
        if (String(answer).toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim()) {
          score += q.points;
        }
      } else {
        if (answer === q.correctAnswer) score += q.points;
      }
    });

    // Auto-save response
    onSubmitResponse({
      answers,
      score,
      totalPoints: activeQuestions.reduce((s, q) => s + q.points, 0),
      completedAt: new Date().toISOString(),
    });
  }, [answers, activeQuestions, onSubmitResponse]);

  if (existingResponse && !settings.allowRetake) {
    return <QuizResults response={existingResponse} questions={questions} settings={settings} />;
  }

  // Start screen
  if (!started) {
    return <QuizStartScreen questions={activeQuestions} settings={settings} onStart={() => setStarted(true)} />;
  }

  // Finished state - always show score and answer review
  if (finished) {
    let score = 0;
    activeQuestions.forEach(q => {
      const answer = answers[q.id];
      if (answer === undefined || answer === null) return;
      if (q.type === 'fill-blank') {
        if (String(answer).toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim()) {
          score += q.points;
        }
      } else {
        if (answer === q.correctAnswer) score += q.points;
      }
    });
    const totalPoints = activeQuestions.reduce((s, q) => s + q.points, 0);
    const pct = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    if (showReview && settings.showResults) {
      return (
        <div>
          <div className="max-w-2xl mx-auto px-4 pt-6">
            <button
              onClick={() => setShowReview(false)}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 transition mb-4"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Score</span>
            </button>
          </div>
          <QuizResults
            response={{ answers, score, totalPoints, completedAt: new Date().toISOString() }}
            questions={activeQuestions}
            settings={settings}
          />
        </div>
      );
    }

    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <div className="bg-white rounded-2xl border shadow-sm p-8 space-y-4">
          <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${
            pct >= 80 ? 'bg-green-100' : pct >= 50 ? 'bg-amber-100' : 'bg-red-100'
          }`}>
            <span className={`text-3xl font-bold ${
              pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700'
            }`}>{pct}%</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {pct >= 80 ? 'Excellent!' : pct >= 50 ? 'Good effort!' : 'Keep practicing!'}
          </h2>
          <p className="text-gray-500 text-lg">
            You scored <span className="font-semibold text-gray-800">{score}</span> out of <span className="font-semibold text-gray-800">{totalPoints}</span> points
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xl font-bold text-green-600">
                {activeQuestions.filter(q => {
                  const a = answers[q.id];
                  if (q.type === 'fill-blank') return String(a || '').toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim();
                  return a === q.correctAnswer;
                }).length}
              </p>
              <p className="text-xs text-green-700">Correct</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xl font-bold text-red-600">
                {activeQuestions.filter(q => {
                  const a = answers[q.id];
                  if (a === undefined || a === null) return false;
                  if (q.type === 'fill-blank') return String(a).toLowerCase().trim() !== String(q.correctAnswer).toLowerCase().trim();
                  return a !== q.correctAnswer;
                }).length}
              </p>
              <p className="text-xs text-red-700">Wrong</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xl font-bold text-gray-600">
                {activeQuestions.filter(q => answers[q.id] === undefined || answers[q.id] === null).length}
              </p>
              <p className="text-xs text-gray-600">Skipped</p>
            </div>
          </div>

          {settings.showResults && (
            <button
              onClick={() => setShowReview(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition font-medium mt-4"
            >
              <Eye className="w-4 h-4" />
              <span>Review Answers</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  const progress = ((currentIdx + 1) / activeQuestions.length) * 100;
  const timerMinutes = Math.floor(timeLeft / 60);
  const timerSeconds = timeLeft % 60;
  const timerPct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
          <span>Question {currentIdx + 1} of {activeQuestions.length}</span>
          <span className={`flex items-center space-x-1 font-mono ${timeLeft <= 30 ? 'text-red-600 font-bold' : ''}`}>
            <Clock className="w-4 h-4" />
            <span>{timerMinutes}:{String(timerSeconds).padStart(2, '0')}</span>
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        {/* Timer bar */}
        <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
          <div
            className={`h-1 rounded-full transition-all duration-1000 ${timeLeft <= 30 ? 'bg-red-500' : 'bg-green-400'}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex-1">{currentQ.text}</h3>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full ml-3 whitespace-nowrap">{currentQ.points} pts</span>
        </div>

        {/* Answer options */}
        {currentQ.type === 'mcq' && (
          <div className="space-y-2">
            {currentQ.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => selectAnswer(i)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${
                  answers[currentQ.id] === i
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>
        )}

        {currentQ.type === 'true-false' && (
          <div className="flex space-x-3">
            {['True', 'False'].map((label, i) => (
              <button
                key={label}
                onClick={() => selectAnswer(i)}
                className={`flex-1 py-4 rounded-lg border-2 font-medium text-lg transition ${
                  answers[currentQ.id] === i
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {currentQ.type === 'fill-blank' && (
          <input
            value={answers[currentQ.id] || ''}
            onChange={(e) => selectAnswer(e.target.value)}
            placeholder="Type your answer..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          className="flex items-center space-x-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Previous</span>
        </button>

        {/* Question dots */}
        <div className="flex items-center space-x-1.5">
          {activeQuestions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(i)}
              className={`w-2.5 h-2.5 rounded-full transition ${
                i === currentIdx ? 'bg-indigo-600 scale-125' :
                answers[q.id] !== undefined ? 'bg-indigo-300' : 'bg-gray-300'
              }`}
              title={`Question ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={nextQuestion}
          className="flex items-center space-x-1 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          <span>{currentIdx === activeQuestions.length - 1 ? 'Finish' : 'Next'}</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ─── Results View ────────────────────────────────────────────────────────────
function QuizResults({ response, questions, settings }) {
  const pct = response.totalPoints > 0 ? Math.round((response.score / response.totalPoints) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Score summary */}
      <div className="bg-white rounded-xl border p-8 text-center">
        <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
          pct >= 80 ? 'bg-green-100' : pct >= 50 ? 'bg-amber-100' : 'bg-red-100'
        }`}>
          <span className={`text-3xl font-bold ${
            pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700'
          }`}>{pct}%</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          {pct >= 80 ? 'Excellent!' : pct >= 50 ? 'Good effort!' : 'Keep practicing!'}
        </h2>
        <p className="text-gray-500">
          You scored {response.score} out of {response.totalPoints} points
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Completed {new Date(response.completedAt).toLocaleString()}
        </p>
      </div>

      {/* Question review */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-800">Question Review</h3>
        {questions.map((q, idx) => {
          const answer = response.answers[q.id];
          let isCorrect = false;
          if (q.type === 'fill-blank') {
            isCorrect = String(answer || '').toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim();
          } else {
            isCorrect = answer === q.correctAnswer;
          }

          return (
            <div key={q.id} className={`bg-white rounded-lg border p-4 ${isCorrect ? 'border-green-200' : 'border-red-200'}`}>
              <div className="flex items-start space-x-2">
                {isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Q{idx + 1}. {q.text}</p>
                  {q.type !== 'fill-blank' ? (
                    <div className="mt-1 space-y-0.5">
                      {q.options.map((opt, i) => (
                        <p key={i} className={`text-xs px-2 py-0.5 rounded ${
                          i === q.correctAnswer ? 'bg-green-50 text-green-700 font-medium' :
                          i === answer && !isCorrect ? 'bg-red-50 text-red-600' : 'text-gray-500'
                        }`}>
                          {String.fromCharCode(65 + i)}. {opt}
                          {i === q.correctAnswer && ' (correct)'}
                          {i === answer && i !== q.correctAnswer && ' (your answer)'}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Your answer: <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{answer || '(blank)'}</span>
                      {!isCorrect && <span> | Correct: <span className="text-green-600">{q.correctAnswer}</span></span>}
                    </p>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-400">{isCorrect ? q.points : 0}/{q.points}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Leaderboard (for board owner) ───────────────────────────────────────────
function QuizLeaderboard({ responses, questions }) {
  const totalPoints = questions.reduce((s, q) => s + q.points, 0);
  const entries = Object.entries(responses || {})
    .map(([userId, resp]) => ({ userId, ...resp }))
    .sort((a, b) => b.score - a.score);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">No responses yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-gray-800 flex items-center space-x-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <span>Leaderboard ({entries.length} responses)</span>
      </h3>
      <div className="bg-white rounded-xl border divide-y">
        {entries.map((entry, idx) => {
          const pct = totalPoints > 0 ? Math.round((entry.score / totalPoints) * 100) : 0;
          return (
            <div key={entry.userId} className="flex items-center px-4 py-3">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                idx === 0 ? 'bg-amber-100 text-amber-700' :
                idx === 1 ? 'bg-gray-200 text-gray-600' :
                idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
              }`}>{idx + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{entry.studentName || `User #${entry.userId}`}</p>
                <p className="text-xs text-gray-400">{new Date(entry.completedAt).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{entry.score}/{totalPoints}</p>
                <p className="text-xs text-gray-500">{pct}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main QuizBoard Component ────────────────────────────────────────────────
export default function QuizBoard() {
  const { board, canEdit, updateBoard, markSaved } = useBoard();
  const { user } = useAuth();
  const [mode, setMode] = useState(null); // null = auto-detect, 'builder' | 'player' | 'results'
  const [saving, setSaving] = useState(false);

  const questions = board?.questions || [];
  const settings = board?.quizSettings || { shuffleQuestions: false, showResults: true, allowRetake: false };
  const responses = board?.responses || {};
  const userId = String(user?.id || 'guest');
  const existingResponse = responses[userId] || null;
  const isOwner = canEdit;

  // Auto-detect mode
  useEffect(() => {
    if (mode) return;
    if (isOwner) {
      setMode('builder');
    } else if (existingResponse && !settings.allowRetake) {
      setMode('results');
    } else {
      setMode(questions.length > 0 ? 'player' : 'results');
    }
  }, [isOwner, existingResponse, settings.allowRetake, questions.length, mode]);

  const handleUpdateQuestions = (newQuestions) => {
    updateBoard({ questions: newQuestions });
  };

  const handleUpdateSettings = (newSettings) => {
    updateBoard({ quizSettings: newSettings });
  };

  const handleSubmitResponse = async (response) => {
    const updatedResponses = { ...responses, [userId]: response };
    setMode('results');

    // Save to backend FIRST via dedicated quiz endpoint.
    // This works even for view-only students (unlike boardsApi.update which requires edit permission).
    // Server-side merge avoids race conditions with concurrent student submissions.
    if (board?.id && typeof board.id === 'number') {
      setSaving(true);
      try {
        await boardsApi.submitQuizResponse(board.id, response);
        // Update local state and immediately mark saved so isDirty stays false
        // (no unsaved changes prompt for completed quizzes)
        updateBoard({ responses: updatedResponses });
        markSaved();
      } catch (err) {
        console.error('Failed to save quiz response:', err);
        // Still update local state so the student sees their results
        updateBoard({ responses: updatedResponses });
      } finally {
        setSaving(false);
      }
    } else {
      // No board ID (e.g. guest/unsaved board) — just update local state
      updateBoard({ responses: updatedResponses });
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Mode switcher for owner */}
      {isOwner && (
        <div className="bg-white border-b px-4 py-2 flex items-center space-x-2">
          <button
            onClick={() => setMode('builder')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              mode === 'builder' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Edit3 className="w-4 h-4 inline mr-1" />
            Builder
          </button>
          <button
            onClick={() => setMode('player')}
            disabled={questions.length === 0}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-30 ${
              mode === 'player' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Play className="w-4 h-4 inline mr-1" />
            Preview
          </button>
          <button
            onClick={() => setMode('results')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              mode === 'results' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Trophy className="w-4 h-4 inline mr-1" />
            Results ({Object.keys(responses).length})
          </button>
        </div>
      )}

      {mode === 'builder' && (
        <QuizBuilder
          questions={questions}
          settings={settings}
          onUpdateQuestions={handleUpdateQuestions}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {mode === 'player' && questions.length > 0 && (
        <QuizPlayer
          questions={questions}
          settings={settings}
          userId={userId}
          existingResponse={existingResponse}
          onSubmitResponse={handleSubmitResponse}
        />
      )}

      {mode === 'results' && (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {saving && (
            <div className="flex items-center justify-center space-x-2 text-sm text-indigo-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving your response...</span>
            </div>
          )}
          {existingResponse && (
            <QuizResults response={existingResponse} questions={questions} settings={settings} />
          )}
          {isOwner && <QuizLeaderboard responses={responses} questions={questions} />}
          {!existingResponse && !isOwner && questions.length > 0 && (
            <div className="text-center py-12">
              <Play className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-4">Ready to take the quiz?</p>
              <button
                onClick={() => setMode('player')}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                Start Quiz
              </button>
            </div>
          )}
          {questions.length === 0 && !isOwner && (
            <div className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">This quiz has no questions yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
