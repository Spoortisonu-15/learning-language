/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LANGUAGES, SCENARIOS, VOICES } from './data/languagesAndScenarios';
import {
  LanguageConfig,
  Scenario,
  VoiceOption,
  CEFRLevel,
  TranscriptItem,
  VocabularyItem,
  FluencyReport,
} from './types';
import { ScenarioPicker } from './components/ScenarioPicker';
import { LiveSessionView } from './components/LiveSessionView';
import { VocabularyVault } from './components/VocabularyVault';
import { FluencyReportsHistory } from './components/FluencyReportsHistory';
import { FluencyReportModal } from './components/FluencyReportModal';
import {
  Mic,
  BookOpen,
  BarChart2,
  Sparkles,
  Radio,
  Volume2,
} from 'lucide-react';

const STORAGE_KEY_VOCAB = 'fluently_vocabulary_vault_v1';
const STORAGE_KEY_REPORTS = 'fluently_reports_history_v1';

export default function App() {
  // Navigation tabs
  const [currentTab, setCurrentTab] = useState<'picker' | 'live' | 'vocabulary' | 'reports'>('picker');

  // Configuration settings
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageConfig>(LANGUAGES[0]); // Spanish
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('B1');
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]); // Cafe
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(VOICES[0]); // Zephyr

  // Persistent user data
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VOCAB);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Initial starter vocabulary for Spanish
    return [
      {
        id: 'init-1',
        term: 'por supuesto',
        phonetic: 'poɾ suˈpwesto',
        translation: 'of course / certainly',
        partOfSpeech: 'phrase',
        cefrLevel: 'A2',
        exampleSentence: 'Por supuesto, enseguida le traigo la cuenta.',
        usageNote: 'Polite affirmation commonly heard in restaurants and shops.',
        language: 'Spanish',
        savedAt: Date.now() - 86400000,
        mastered: true,
      },
      {
        id: 'init-2',
        term: '¿Me puedes recomendar...?',
        phonetic: 'me ˈpweðes rekomenˈdaɾ',
        translation: 'Can you recommend to me...?',
        partOfSpeech: 'expression',
        cefrLevel: 'B1',
        exampleSentence: '¿Me puedes recomendar algún plato típico de la región?',
        usageNote: 'Great conversational opener with local friends.',
        language: 'Spanish',
        savedAt: Date.now() - 43200000,
        mastered: false,
      },
    ];
  });

  const [reports, setReports] = useState<FluencyReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REPORTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Active Fluency Report modal
  const [activeReport, setActiveReport] = useState<FluencyReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VOCAB, JSON.stringify(vocabulary));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }, [vocabulary]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }, [reports]);

  // Start live session
  const handleStartSession = () => {
    setCurrentTab('live');
  };

  // End live session and generate comprehensive evaluation using Gemini 3.8 Flash
  const handleEndSession = async (transcript: TranscriptItem[]) => {
    setCurrentTab('picker');

    if (transcript.length === 0) {
      return;
    }

    setShowReportModal(true);
    setIsLoadingReport(true);

    try {
      // 1. Generate Fluency Report
      const reportRes = await fetch('/api/fluency-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          targetLanguage: selectedLanguage.name,
          cefrLevel: selectedLevel,
          scenario: selectedScenario.title,
        }),
      });

      const reportData = await reportRes.json();

      const newReport: FluencyReport = {
        ...reportData,
        date: Date.now(),
        scenario: selectedScenario.title,
        language: selectedLanguage.name,
        turnCount: transcript.length,
      };

      setActiveReport(newReport);
      setReports((prev) => [newReport, ...prev]);

      // 2. Extract Vocabulary Items in background
      const fullText = transcript.map((t) => `${t.speaker}: ${t.text}`).join('\n');
      const vocabRes = await fetch('/api/extract-vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationText: fullText,
          targetLanguage: selectedLanguage.name,
        }),
      });

      const vocabData = await vocabRes.json();
      if (vocabData?.vocabulary && Array.isArray(vocabData.vocabulary)) {
        const extractedItems: VocabularyItem[] = vocabData.vocabulary.map((v: any) => ({
          id: `vocab-${Date.now()}-${Math.random()}`,
          term: v.term,
          phonetic: v.phonetic,
          translation: v.translation,
          partOfSpeech: v.partOfSpeech,
          cefrLevel: v.cefrLevel,
          exampleSentence: v.exampleSentence,
          usageNote: v.usageNote,
          language: selectedLanguage.name,
          savedAt: Date.now(),
          mastered: false,
        }));

        // Merge newly discovered vocabulary
        setVocabulary((prev) => {
          const existingTerms = new Set(prev.map((i) => i.term.toLowerCase()));
          const novel = extractedItems.filter((i) => !existingTerms.has(i.term.toLowerCase()));
          return [...novel, ...prev];
        });
      }
    } catch (err) {
      console.error('Error generating session report:', err);
    } finally {
      setIsLoadingReport(false);
    }
  };

  // Add individual word to Vocabulary Vault
  const handleSaveWord = (word: VocabularyItem) => {
    setVocabulary((prev) => {
      const exists = prev.some((w) => w.term.toLowerCase() === word.term.toLowerCase());
      if (exists) return prev;
      return [word, ...prev];
    });
  };

  const handleToggleMastered = (id: string) => {
    setVocabulary((prev) =>
      prev.map((w) => (w.id === id ? { ...w, mastered: !w.mastered } : w))
    );
  };

  const handleDeleteVocab = (id: string) => {
    setVocabulary((prev) => prev.filter((w) => w.id !== id));
  };

  const savedWordTerms = new Set(vocabulary.map((w) => w.term.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Global Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <div
            onClick={() => setCurrentTab('picker')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-500 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Radio className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  Fluently
                </span>
                <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Live API
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Real-Time AI Conversational Partner
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setCurrentTab('picker')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'picker' || currentTab === 'live'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              <span>Practice</span>
            </button>

            <button
              onClick={() => setCurrentTab('vocabulary')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'vocabulary'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Vault ({vocabulary.length})</span>
            </button>

            <button
              onClick={() => setCurrentTab('reports')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'reports'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reports ({reports.length})</span>
            </button>
          </nav>

          {/* Engine status indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono">gemini-3.8-live</span>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex flex-col">
        {currentTab === 'picker' && (
          <ScenarioPicker
            selectedLanguage={selectedLanguage}
            onSelectLanguage={setSelectedLanguage}
            selectedLevel={selectedLevel}
            onSelectLevel={setSelectedLevel}
            selectedScenario={selectedScenario}
            onSelectScenario={setSelectedScenario}
            selectedVoice={selectedVoice}
            onSelectVoice={setSelectedVoice}
            onStartSession={handleStartSession}
            onCustomScenarioCreate={(custom) => setSelectedScenario(custom)}
          />
        )}

        {currentTab === 'live' && (
          <LiveSessionView
            language={selectedLanguage}
            scenario={selectedScenario}
            voice={selectedVoice}
            cefrLevel={selectedLevel}
            onEndSession={handleEndSession}
            onSaveWord={handleSaveWord}
            savedWordTerms={savedWordTerms}
          />
        )}

        {currentTab === 'vocabulary' && (
          <VocabularyVault
            items={vocabulary}
            onToggleMastered={handleToggleMastered}
            onDeleteItem={handleDeleteVocab}
            activeLanguage={selectedLanguage.name}
          />
        )}

        {currentTab === 'reports' && (
          <FluencyReportsHistory
            reports={reports}
            onSelectReport={(rep) => {
              setActiveReport(rep);
              setShowReportModal(true);
            }}
            onStartNewPractice={() => setCurrentTab('picker')}
          />
        )}
      </main>

      {/* Session Fluency Evaluation Modal */}
      {showReportModal && (
        <FluencyReportModal
          report={activeReport}
          isLoading={isLoadingReport}
          onClose={() => setShowReportModal(false)}
          onRestart={() => {
            setShowReportModal(false);
            setCurrentTab('picker');
          }}
          onSaveVocabulary={(items) => {
            items.forEach(handleSaveWord);
          }}
          savedVocabularyIds={new Set(vocabulary.map((v) => v.id))}
        />
      )}
    </div>
  );
}
