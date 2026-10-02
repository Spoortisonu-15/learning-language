/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  defaultPartnerName: string;
  sampleGreeting: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'neutral';
  tone: string;
  description: string;
}

export interface Scenario {
  id: string;
  title: string;
  category: 'daily' | 'travel' | 'work' | 'social' | 'emergency' | 'culture';
  targetLevel: CEFRLevel;
  icon: string;
  partnerRole: string;
  userRole: string;
  description: string;
  objective: string;
  suggestedPhrases: string[];
  keyVocabulary: string[];
}

export interface TranscriptItem {
  id: string;
  speaker: 'user' | 'partner';
  text: string;
  timestamp: number;
  grammarFeedback?: GrammarCheckResult;
}

export interface GrammarCheckResult {
  isCorrect: boolean;
  score: number;
  corrections: Array<{
    original: string;
    correction: string;
    reason: string;
  }>;
  naturalAlternative: string;
  explanation: string;
  pronunciationTip: string;
}

export interface VocabularyItem {
  id: string;
  term: string;
  phonetic: string;
  translation: string;
  partOfSpeech: string;
  cefrLevel: string;
  exampleSentence: string;
  usageNote: string;
  language: string;
  savedAt: number;
  mastered?: boolean;
}

export interface FluencyReport {
  overallScore: number;
  fluencyScore: number;
  grammarScore: number;
  vocabularyScore: number;
  comprehensionScore: number;
  strengths: string[];
  areasForImprovement: string[];
  recommendedPhrases: Array<{
    phrase: string;
    translation: string;
    context: string;
  }>;
  summary: string;
  encouragement: string;
  date: number;
  scenario: string;
  language: string;
  turnCount: number;
}

export interface SuggestedReply {
  targetText: string;
  translation: string;
  tone: string;
  hint: string;
}

export type LiveConnectionState = 'idle' | 'connecting' | 'connected' | 'error' | 'closed';
