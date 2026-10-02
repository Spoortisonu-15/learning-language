/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GrammarCheckResult } from '../types';
import { CheckCircle2, AlertCircle, Sparkles, BookOpen, Volume2, X } from 'lucide-react';

interface GrammarCoachDrawerProps {
  sentence: string;
  result: GrammarCheckResult | null;
  isLoading: boolean;
  onClose: () => void;
  targetLanguage: string;
}

export const GrammarCoachDrawer: React.FC<GrammarCoachDrawerProps> = ({
  sentence,
  result,
  isLoading,
  onClose,
  targetLanguage,
}) => {
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Instant Language Coach</h3>
            <p className="text-xs text-slate-400">Powered by Gemini 3.8 Flash</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-1">
          Your Spoken Sentence
        </span>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-slate-100 italic">"{sentence}"</p>
          <button
            onClick={() => speakText(sentence)}
            className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer shrink-0"
            title="Listen"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Analyzing grammar, naturalness & pronunciation...</span>
        </div>
      ) : result ? (
        <div className="flex flex-col gap-3.5 text-xs">
          {/* Status Header */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div className="flex items-center gap-2">
              {result.isCorrect ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium text-emerald-300">Natural & Accurate!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="font-medium text-amber-300">Minor Adjustments Needed</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 text-slate-300 font-semibold">
              <span>Score:</span>
              <span className="text-emerald-400">{result.score}/10</span>
            </div>
          </div>

          {/* Corrections List */}
          {result.corrections && result.corrections.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                Grammar Breakdown
              </span>
              {result.corrections.map((corr, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="line-through text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                      {corr.original}
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="text-emerald-300 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      {corr.correction}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">{corr.reason}</p>
                </div>
              ))}
            </div>
          )}

          {/* Natural Alternative */}
          {result.naturalAlternative && (
            <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-800/40 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Native Speaker Polish
                </span>
                <button
                  onClick={() => speakText(result.naturalAlternative)}
                  className="text-indigo-300 hover:text-indigo-100 p-1 cursor-pointer"
                  title="Listen to native phrasing"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm font-medium text-indigo-100">
                "{result.naturalAlternative}"
              </p>
            </div>
          )}

          {/* Explanation */}
          {result.explanation && (
            <div className="bg-slate-950/40 rounded-xl p-2.5 border border-slate-800/70">
              <span className="font-semibold text-slate-400 text-[11px] block mb-1">
                Teacher's Note
              </span>
              <p className="text-slate-300 leading-relaxed">{result.explanation}</p>
            </div>
          )}

          {/* Pronunciation Tip */}
          {result.pronunciationTip && (
            <div className="flex items-start gap-2 bg-amber-950/20 border border-amber-900/30 rounded-xl p-2.5 text-amber-200/90">
              <BookOpen className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[11px] block text-amber-300 mb-0.5">
                  Phonetic & Accent Tip
                </span>
                <p className="text-[11px] leading-relaxed text-amber-200/80">
                  {result.pronunciationTip}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
