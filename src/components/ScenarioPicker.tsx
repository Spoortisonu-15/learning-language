/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LANGUAGES, SCENARIOS, VOICES } from '../data/languagesAndScenarios';
import { LanguageConfig, Scenario, VoiceOption, CEFRLevel } from '../types';
import {
  Mic,
  Sparkles,
  Coffee,
  Users,
  Plane,
  Briefcase,
  MapPin,
  HeartPulse,
  PlusCircle,
  Volume2,
  CheckCircle,
  Settings2,
} from 'lucide-react';

interface ScenarioPickerProps {
  selectedLanguage: LanguageConfig;
  onSelectLanguage: (lang: LanguageConfig) => void;
  selectedLevel: CEFRLevel;
  onSelectLevel: (lvl: CEFRLevel) => void;
  selectedScenario: Scenario;
  onSelectScenario: (scenario: Scenario) => void;
  selectedVoice: VoiceOption;
  onSelectVoice: (voice: VoiceOption) => void;
  onStartSession: () => void;
  onCustomScenarioCreate: (custom: Scenario) => void;
}

export const ScenarioPicker: React.FC<ScenarioPickerProps> = ({
  selectedLanguage,
  onSelectLanguage,
  selectedLevel,
  onSelectLevel,
  selectedScenario,
  onSelectScenario,
  selectedVoice,
  onSelectVoice,
  onStartSession,
  onCustomScenarioCreate,
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customPartnerRole, setCustomPartnerRole] = useState('');
  const [customUserRole, setCustomUserRole] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  const cefrLevels: { level: CEFRLevel; title: string; desc: string }[] = [
    { level: 'A1', title: 'Beginner', desc: 'Slow speech, fundamental vocab, basic survival phrases' },
    { level: 'A2', title: 'Elementary', desc: 'Simple questions, daily routines, travel needs' },
    { level: 'B1', title: 'Intermediate', desc: 'Connected stories, opinions, past/future conversations' },
    { level: 'B2', title: 'Upper-Int', desc: 'Spontaneous flow, natural idioms, active debates' },
    { level: 'C1', title: 'Advanced', desc: 'Nuanced expressions, cultural subtext, complex topics' },
  ];

  const getScenarioIcon = (iconName: string) => {
    switch (iconName) {
      case 'coffee':
        return <Coffee className="w-5 h-5 text-amber-400" />;
      case 'users':
        return <Users className="w-5 h-5 text-indigo-400" />;
      case 'plane':
        return <Plane className="w-5 h-5 text-cyan-400" />;
      case 'briefcase':
        return <Briefcase className="w-5 h-5 text-blue-400" />;
      case 'map-pin':
        return <MapPin className="w-5 h-5 text-emerald-400" />;
      case 'heart-pulse':
        return <HeartPulse className="w-5 h-5 text-rose-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-purple-400" />;
    }
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle || !customGoal) return;

    const newScenario: Scenario = {
      id: `custom-${Date.now()}`,
      title: customTitle,
      category: 'daily',
      targetLevel: selectedLevel,
      icon: 'sparkles',
      partnerRole: customPartnerRole || 'Supportive conversation partner',
      userRole: customUserRole || 'Language learner',
      description: customDescription || customGoal,
      objective: customGoal,
      suggestedPhrases: [],
      keyVocabulary: [],
    };

    onCustomScenarioCreate(newScenario);
    onSelectScenario(newScenario);
    setShowCustomModal(false);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto pb-12">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 border border-indigo-900/40 p-8 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-3 max-w-2xl">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Conversational AI Engine · Gemini 3.8 Live
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Speak Any Language with a Real-Time Voice Partner
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Overcome speaking anxiety with low-latency, natural voice exchanges. Choose your
            target language, set your proficiency level, step into real-world scenarios, and get
            instant grammar coaching and vocabulary mastery.
          </p>
        </div>
      </div>

      {/* Step 1: Target Language Selection */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              1. Choose Target Language
            </h2>
            <p className="text-xs text-slate-400">
              Your AI partner will converse natively in your selected language
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage.code === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => onSelectLanguage(lang)}
                className={`flex flex-col items-start p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-950 text-white ring-2 ring-indigo-500/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-2xl">{lang.flag}</span>
                  {isSelected && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                </div>
                <span className="text-sm font-bold">{lang.name}</span>
                <span className="text-xs text-slate-400">{lang.nativeName}</span>
                <span className="text-[10px] text-slate-500 italic mt-1 truncate w-full">
                  "{lang.sampleGreeting}"
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: CEFR Proficiency Level */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            2. Select Your CEFR Level
          </h2>
          <p className="text-xs text-slate-400">
            The AI automatically adapts speaking speed, vocabulary complexity, and grammar nuance
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {cefrLevels.map((item) => {
            const isSelected = selectedLevel === item.level;
            return (
              <button
                key={item.level}
                onClick={() => onSelectLevel(item.level)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-950/60 border-emerald-500 shadow-lg shadow-emerald-950 text-white ring-2 ring-emerald-500/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base font-extrabold text-emerald-400">{item.level}</span>
                    <span className="text-xs font-semibold text-slate-300">{item.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-snug">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: Scenario Selection */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              3. Select a Conversation Scenario
            </h2>
            <p className="text-xs text-slate-400">
              Step into an immersive roleplay setting with clear objectives
            </p>
          </div>
          <button
            onClick={() => setShowCustomModal(true)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            Create Custom Scenario
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {SCENARIOS.map((scen) => {
            const isSelected = selectedScenario.id === scen.id;
            return (
              <button
                key={scen.id}
                onClick={() => onSelectScenario(scen)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-850 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="p-2 rounded-xl bg-slate-800/80">{getScenarioIcon(scen.icon)}</div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {scen.targetLevel}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-white">{scen.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{scen.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    Goal
                  </span>
                  <span className="text-xs text-slate-300">{scen.objective}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 4: AI Voice Persona & Live Settings */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            4. Choose Partner Voice Persona
          </h2>
          <p className="text-xs text-slate-400">
            Gemini Live audio model voice timber and conversational personality
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {VOICES.map((voice) => {
            const isSelected = selectedVoice.id === voice.id;
            return (
              <button
                key={voice.id}
                onClick={() => onSelectVoice(voice)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-500 text-white ring-2 ring-indigo-500/30 shadow-lg'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white">{voice.name}</span>
                    <Volume2
                      className={`w-3.5 h-3.5 ${
                        isSelected ? 'text-indigo-400' : 'text-slate-500'
                      }`}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-indigo-300 block mb-1">
                    {voice.tone}
                  </span>
                  <p className="text-[11px] text-slate-400 leading-snug">{voice.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Start Practice Call-to-Action Bar */}
      <div className="sticky bottom-4 z-40 p-4 sm:p-5 bg-slate-900/90 border border-slate-700/80 rounded-3xl backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
            <Mic className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">
              Ready to practice {selectedLanguage.name} ({selectedLevel})
            </h4>
            <p className="text-xs text-slate-400">
              Scenario: <span className="text-slate-200">{selectedScenario.title}</span> · Voice:{' '}
              <span className="text-slate-200">{selectedVoice.name}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onStartSession}
          className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Mic className="w-5 h-5" />
          Start Real-Time Voice Practice
        </button>
      </div>

      {/* Custom Scenario Builder Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-slate-100 shadow-2xl">
            <h3 className="text-lg font-bold mb-1">Create Custom Roleplay Scenario</h3>
            <p className="text-xs text-slate-400 mb-4">
              Design any custom role, situation, or task to practice with your AI partner
            </p>

            <form onSubmit={handleCreateCustom} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Scenario Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Renting an Apartment in Barcelona"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    AI Partner Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Real Estate Agent"
                    value={customPartnerRole}
                    onChange={(e) => setCustomPartnerRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Your Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Prospective Tenant"
                    value={customUserRole}
                    onChange={(e) => setCustomUserRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Conversational Goal *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Ask about rent, deposit, utilities, and move-in date"
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Save & Select Scenario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
