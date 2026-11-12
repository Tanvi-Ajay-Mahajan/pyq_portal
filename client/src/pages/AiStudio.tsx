import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  FileText,
  Layers,
  MessageSquare,
  Sparkles,
  Trophy,
} from 'lucide-react';
import ChatPanel from '@/components/ai/ChatPanel';
import SolverPanel from '@/components/ai/SolverPanel';
import QuizPanel from '@/components/ai/QuizPanel';
import SummaryPanel from '@/components/ai/SummaryPanel';
import FlashcardPanel from '@/components/ai/FlashcardPanel';
import { fetchAiStatus } from '@/services/aiService';
import type { AiStatus } from '@/types/ai';

type TabId = 'assistant' | 'solver' | 'quiz' | 'summary' | 'flashcards';

const TABS: { id: TabId; label: string; icon: typeof MessageSquare; hint: string }[] = [
  { id: 'assistant', label: 'Study Assistant', icon: MessageSquare, hint: 'Ask about your PDFs' },
  { id: 'solver', label: 'Question Solver', icon: Sparkles, hint: '2 / 5 / 10 mark answers' },
  { id: 'quiz', label: 'Quiz & Mock Test', icon: Trophy, hint: 'MCQs with scoring' },
  { id: 'summary', label: 'Notes Summarizer', icon: FileText, hint: 'Chapters and formulas' },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, hint: 'Revise with Q&A cards' },
];

const isTabId = (value: string | null): value is TabId =>
  Boolean(value) && TABS.some((tab) => tab.id === value);

/** Single AI entry point: all five study tools behind one route and nav item. */
export default function AiStudio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const active: TabId = isTabId(tabParam) ? tabParam : 'assistant';
  const [status, setStatus] = useState<AiStatus | null>(null);

  useEffect(() => {
    let alive = true;
    fetchAiStatus()
      .then((next) => {
        if (alive) setStatus(next);
      })
      .catch(() => {
        /* the tools surface their own errors */
      });
    return () => {
      alive = false;
    };
  }, []);

  const selectTab = (id: TabId) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary-700">
            <Sparkles className="h-3.5 w-3.5" /> AI Study Assistant
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            Learn from your own study material
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Upload notes, textbooks or a question paper, then ask questions, solve papers, take a
            mock test, summarise a unit or revise with flashcards.
          </p>
        </div>
        {status?.ai_configured && (
          <span className="badge bg-emerald-50 text-emerald-700">
            <BookOpen className="h-3.5 w-3.5" /> AI ready
          </span>
        )}
      </div>

      {status && !status.ai_configured && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <p>
            The AI service is not configured on this deployment yet. Uploading and browsing your
            documents works, but answers, quizzes, summaries and flashcards need an AI provider key
            (<code className="rounded bg-amber-100 px-1">GEMINI_API_KEY</code> in Settings →
            Environment variables). Until then these tools explain what is missing instead of
            inventing an answer.
          </p>
        </div>
      )}

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              aria-current={selected ? 'page' : undefined}
              className={`flex flex-none items-center gap-2 rounded-xl border px-3.5 py-2 text-left transition ${
                selected
                  ? 'border-primary-500 bg-primary-50 text-primary-800 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>
                <span className="block text-xs font-semibold">{tab.label}</span>
                <span className="block text-[10px] text-slate-500">{tab.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {active === 'assistant' && <ChatPanel />}
        {active === 'solver' && <SolverPanel />}
        {active === 'quiz' && <QuizPanel />}
        {active === 'summary' && <SummaryPanel />}
        {active === 'flashcards' && <FlashcardPanel />}
      </div>

      <p className="mt-4 text-[11px] text-slate-500">
        AI answers are generated from the material you upload and can still contain mistakes —
        always cross-check with your syllabus and textbooks.
      </p>
    </div>
  );
}
