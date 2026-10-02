/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { VocabularyItem } from '../types';
import {
  BookOpen,
  Volume2,
  Check,
  Search,
  Sparkles,
  RotateCcw,
  Trash2,
  Bookmark,
  Layers,
} from 'lucide-react';

interface VocabularyVaultProps {
  items: VocabularyItem[];
  onToggleMastered: (id: string) => void;
  onDeleteItem: (id: string) => void;
  activeLanguage: string;
}

export const VocabularyVault: React.FC<VocabularyVaultProps> = ({
  items,
  onToggleMastered,
  onDeleteItem,
  activeLanguage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCefr, setSelectedCefr] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'list' | 'flashcards'>('list');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.exampleSentence.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCefr = selectedCefr === 'all' || item.cefrLevel === selectedCefr;
    return matchesSearch && matchesCefr;
  });

  const currentFlashcard = filteredItems[currentCardIndex];

  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % (filteredItems.length || 1));
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) =>
      prev === 0 ? Math.max(0, filteredItems.length - 1) : prev - 1
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Vocabulary Vault</h2>
            <p className="text-xs text-slate-400">
              Interactive review of idioms, collocations, and terms discovered in practice sessions
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Word List ({filteredItems.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('flashcards');
              setIsFlipped(false);
              setCurrentCardIndex(0);
            }}
            disabled={filteredItems.length === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'flashcards'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Flashcard Quiz
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search words, translations, examples..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* CEFR Level filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Level:</span>
          {['all', 'A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedCefr(lvl)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedCefr === lvl
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Content Rendering: List vs Flashcards */}
      {activeTab === 'flashcards' && currentFlashcard ? (
        <div className="flex flex-col items-center justify-center py-6 gap-6">
          <div className="text-xs text-slate-400">
            Card {currentCardIndex + 1} of {filteredItems.length}
          </div>

          {/* Flashcard container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full max-w-md h-72 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between items-center text-center cursor-pointer shadow-2xl relative transition-all duration-300 hover:border-slate-700 select-none"
          >
            <div className="w-full flex items-center justify-between">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 font-medium">
                {currentFlashcard.cefrLevel} · {currentFlashcard.partOfSpeech}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speakText(currentFlashcard.term);
                }}
                className="text-slate-400 hover:text-emerald-400 p-1.5 rounded-full hover:bg-slate-800 transition-colors"
                title="Hear Pronunciation"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="my-auto flex flex-col items-center">
              {!isFlipped ? (
                <>
                  <h3 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                    {currentFlashcard.term}
                  </h3>
                  <p className="text-xs font-mono text-emerald-400/90">
                    /{currentFlashcard.phonetic}/
                  </p>
                  <p className="text-[11px] text-slate-500 mt-4">Click card to reveal meaning</p>
                </>
              ) : (
                <>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Translation
                  </span>
                  <h3 className="text-2xl font-bold text-emerald-300 mb-3">
                    {currentFlashcard.translation}
                  </h3>
                  <p className="text-xs text-slate-300 italic max-w-xs">
                    "{currentFlashcard.exampleSentence}"
                  </p>
                  {currentFlashcard.usageNote && (
                    <p className="text-[10px] text-slate-500 mt-2">
                      💡 {currentFlashcard.usageNote}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              Flip to see {isFlipped ? 'term' : 'translation'}
            </div>
          </div>

          {/* Flashcard Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevCard}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-300 transition-all cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => onToggleMastered(currentFlashcard.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentFlashcard.mastered
                  ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              {currentFlashcard.mastered ? 'Mastered!' : 'Mark as Mastered'}
            </button>
            <button
              onClick={handleNextCard}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-all cursor-pointer shadow-lg shadow-emerald-950"
            >
              Next Card
            </button>
          </div>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-slate-900/60 border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all hover:border-slate-700 ${
                item.mastered ? 'border-emerald-900/40 bg-emerald-950/10' : 'border-slate-800/80'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-white">{item.term}</h4>
                    <button
                      onClick={() => speakText(item.term)}
                      className="text-slate-400 hover:text-emerald-400 p-1 cursor-pointer"
                      title="Pronounce"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">/{item.phonetic}/</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {item.cefrLevel}
                  </span>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                    title="Remove word"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-200">{item.translation}</p>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mt-0.5">
                  {item.partOfSpeech}
                </span>
                <p className="text-xs text-slate-400 italic mt-2 bg-slate-950/50 p-2 rounded-xl border border-slate-800/60">
                  "{item.exampleSentence}"
                </p>
                {item.usageNote && (
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-start gap-1">
                    <span className="text-amber-400 text-xs shrink-0">💡</span>
                    <span>{item.usageNote}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => onToggleMastered(item.id)}
                  className={`text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    item.mastered
                      ? 'text-emerald-400 hover:text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  {item.mastered ? 'Mastered' : 'Mark as learned'}
                </button>
                <span className="text-[10px] text-slate-600">
                  {new Date(item.savedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-slate-900/30 border border-slate-800/60 rounded-3xl p-8 flex flex-col items-center justify-center gap-3">
          <BookOpen className="w-10 h-10 text-slate-600" />
          <h3 className="text-base font-semibold text-slate-300">No words saved yet</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            During your real-time voice sessions with your AI partner, words will be automatically
            identified and can be saved to your vault with definitions and examples!
          </p>
        </div>
      )}
    </div>
  );
};
