/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  LanguageConfig,
  Scenario,
  VoiceOption,
  CEFRLevel,
  TranscriptItem,
  GrammarCheckResult,
  VocabularyItem,
  SuggestedReply,
  FluencyReport,
} from '../types';
import { LiveAudioEngine } from '../utils/audioStreamer';
import { AudioVisualizer } from './AudioVisualizer';
import { GrammarCoachDrawer } from './GrammarCoachDrawer';
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  HelpCircle,
  Lightbulb,
  Send,
  Volume2,
  BookmarkPlus,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Award,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

interface LiveSessionViewProps {
  language: LanguageConfig;
  scenario: Scenario;
  voice: VoiceOption;
  cefrLevel: CEFRLevel;
  onEndSession: (transcript: TranscriptItem[]) => void;
  onSaveWord: (word: VocabularyItem) => void;
  savedWordTerms: Set<string>;
}

export const LiveSessionView: React.FC<LiveSessionViewProps> = ({
  language,
  scenario,
  voice,
  cefrLevel,
  onEndSession,
  onSaveWord,
  savedWordTerms,
}) => {
  // Connection & audio state
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'error' | 'closed'
  >('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isPartnerSpeaking, setIsPartnerSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Connecting to Gemini 3.8 Live API...');

  // Conversation transcript state
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [currentPartnerText, setCurrentPartnerText] = useState('');
  const [currentUserInterim, setCurrentUserInterim] = useState('');

  // Fallback text input
  const [textInput, setTextInput] = useState('');

  // Interactive Coach & Suggestions state
  const [suggestedReplies, setSuggestedReplies] = useState<SuggestedReply[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Grammar Coach Drawer state
  const [analyzedSentence, setAnalyzedSentence] = useState<string | null>(null);
  const [grammarResult, setGrammarResult] = useState<GrammarCheckResult | null>(null);
  const [isLoadingGrammar, setIsLoadingGrammar] = useState(false);

  // Scenario Objective completion state
  const [isGoalCompleted, setIsGoalCompleted] = useState(false);

  // References
  const wsRef = useRef<WebSocket | null>(null);
  const audioEngineRef = useRef<LiveAudioEngine | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const partnerSilenceTimeoutRef = useRef<number | null>(null);

  // Scroll transcript to bottom smoothly
  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [transcript, currentPartnerText, currentUserInterim]);

  // Pronounce text aloud via Web Speech API
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Initialize Audio Engine and WebSocket Connection
  useEffect(() => {
    let isSubscribed = true;

    const setupSession = async () => {
      try {
        setStatusMessage('Initializing audio hardware...');

        // 1. Create Audio Engine
        const engine = new LiveAudioEngine({
          onInputVolume: (vol) => {
            if (!isSubscribed) return;
            setInputVolume(vol);
            setIsUserSpeaking(vol > 15);
          },
          onOutputVolume: (vol) => {
            if (!isSubscribed) return;
            setOutputVolume(vol);
            if (vol > 8) {
              setIsPartnerSpeaking(true);
              // Clear previous silence timeout
              if (partnerSilenceTimeoutRef.current) {
                clearTimeout(partnerSilenceTimeoutRef.current);
              }
              partnerSilenceTimeoutRef.current = window.setTimeout(() => {
                setIsPartnerSpeaking(false);
              }, 400);
            }
          },
          onAudioData: (base64Audio) => {
            // Forward 16kHz PCM little-endian audio to WebSocket
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'audio',
                  data: base64Audio,
                })
              );
            }
          },
          onError: (err) => {
            console.error('Audio engine error:', err);
            setErrorMessage(`Microphone / Audio error: ${err.message}`);
          },
        });

        await engine.initialize();
        await engine.startMicrophone();
        audioEngineRef.current = engine;

        // 2. Connect WebSocket to /live-session
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/live-session`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isSubscribed) return;
          setStatusMessage('Initiating Live conversation...');

          // Send handshake configuration with language, scenario, and level parameters
          ws.send(
            JSON.stringify({
              type: 'init',
              targetLanguage: language.name,
              partnerName: language.defaultPartnerName,
              cefrLevel: cefrLevel,
              scenario: scenario.title,
              scenarioGoal: scenario.objective,
              persona: `Warm, authentic native ${language.name} conversational partner. Pacing calibrated to CEFR ${cefrLevel}.`,
              voiceName: voice.id,
            })
          );
        };

        ws.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'ready') {
              setConnectionState('connected');
              setStatusMessage(`Connected to ${language.defaultPartnerName} · Speak freely!`);
            } else if (data.type === 'audio') {
              // Incoming 24kHz raw PCM chunk from Gemini Live
              if (audioEngineRef.current && data.data) {
                audioEngineRef.current.playAudioChunk(data.data);
                setIsPartnerSpeaking(true);
              }
            } else if (data.type === 'partner_transcript' || data.type === 'partner_text') {
              // Spoken transcript chunk from partner
              setCurrentPartnerText((prev) => prev + (data.text || ''));
            } else if (data.type === 'user_transcript') {
              // Confirmed speech-to-text from user
              const userSentence = data.text?.trim();
              if (userSentence) {
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `user-${Date.now()}-${Math.random()}`,
                    speaker: 'user',
                    text: userSentence,
                    timestamp: Date.now(),
                  },
                ]);
                setCurrentUserInterim('');

                // Trigger quick suggestion generation in background
                fetchReplySuggestions(userSentence);
              }
            } else if (data.type === 'user_interim_transcript') {
              // Live interim user transcription while speaking
              setCurrentUserInterim(data.text || '');
            } else if (data.type === 'turn_complete') {
              // Model finished current speech turn
              setIsPartnerSpeaking(false);
              setCurrentPartnerText((curr) => {
                if (curr.trim()) {
                  setTranscript((prev) => [
                    ...prev,
                    {
                      id: `partner-${Date.now()}-${Math.random()}`,
                      speaker: 'partner',
                      text: curr.trim(),
                      timestamp: Date.now(),
                    },
                  ]);
                }
                return '';
              });
              setStatusMessage(`Your turn · Speak in ${language.name}`);
            } else if (data.type === 'interrupted') {
              // Model was interrupted by user
              if (audioEngineRef.current) {
                audioEngineRef.current.stopPlayback();
              }
              setIsPartnerSpeaking(false);
              setStatusMessage('Interrupted · Listening to you...');
            } else if (data.type === 'error') {
              console.warn('Server live error:', data.message);
              setErrorMessage(data.message);
            }
          } catch (e) {
            console.error('Error handling WebSocket message:', e);
          }
        };

        ws.onerror = (e) => {
          console.error('WebSocket connection error:', e);
          if (isSubscribed) {
            setConnectionState('error');
            setErrorMessage('Unable to connect to Gemini Live server. Retrying...');
          }
        };

        ws.onclose = () => {
          if (isSubscribed) {
            setConnectionState('closed');
          }
        };
      } catch (err: any) {
        console.error('Session initialization error:', err);
        if (isSubscribed) {
          setConnectionState('error');
          setErrorMessage(err?.message || 'Failed to start microphone or Live session');
        }
      }
    };

    setupSession();

    return () => {
      isSubscribed = false;
      if (partnerSilenceTimeoutRef.current) {
        clearTimeout(partnerSilenceTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioEngineRef.current) {
        audioEngineRef.current.destroy();
      }
    };
  }, [language, scenario, voice, cefrLevel]);

  // Handle Mute toggle
  const toggleMute = () => {
    if (audioEngineRef.current) {
      const nextMuted = !isMuted;
      audioEngineRef.current.setMute(nextMuted);
      setIsMuted(nextMuted);
    }
  };

  // Handle manual interrupt
  const handleInterrupt = () => {
    if (audioEngineRef.current) {
      audioEngineRef.current.stopPlayback();
    }
    setIsPartnerSpeaking(false);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
  };

  // Send typed text turn (fallback / hybrid mode)
  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    const userMessage = textInput.trim();
    setTextInput('');

    // Append to transcript
    setTranscript((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        speaker: 'user',
        text: userMessage,
        timestamp: Date.now(),
      },
    ]);

    // Send through WebSocket to Live API
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text',
          text: userMessage,
        })
      );
    } else {
      // Fallback HTTP route if WS was interrupted
      try {
        const res = await fetch('/api/chat-turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            conversationHistory: transcript,
            targetLanguage: language.name,
            cefrLevel,
            scenario: scenario.title,
            partnerName: language.defaultPartnerName,
          }),
        });
        const data = await res.json();
        if (data.text) {
          setTranscript((prev) => [
            ...prev,
            {
              id: `partner-${Date.now()}`,
              speaker: 'partner',
              text: data.text,
              timestamp: Date.now(),
            },
          ]);
        }
      } catch (err) {
        console.error('Fallback chat error:', err);
      }
    }
  };

  // Fetch contextual reply suggestions using Gemini 3.8 Flash
  const fetchReplySuggestions = async (recentUserText?: string) => {
    setIsLoadingSuggestions(true);
    try {
      const res = await fetch('/api/suggest-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recentTranscript: transcript.slice(-4),
          targetLanguage: language.name,
          cefrLevel,
          scenario: scenario.title,
        }),
      });
      const data = await res.json();
      if (data.suggestions) {
        setSuggestedReplies(data.suggestions);
      }
    } catch (err) {
      console.error('Error fetching reply suggestions:', err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Analyze specific user spoken sentence for grammar & pronunciation
  const handleCheckGrammar = async (sentence: string) => {
    setAnalyzedSentence(sentence);
    setIsLoadingGrammar(true);
    setGrammarResult(null);

    try {
      const res = await fetch('/api/grammar-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence,
          targetLanguage: language.name,
          cefrLevel,
        }),
      });
      const data = await res.json();
      setGrammarResult(data);
    } catch (err) {
      console.error('Error checking grammar:', err);
    } finally {
      setIsLoadingGrammar(false);
    }
  };

  // Save term to Vocabulary Vault
  const handleSaveWordTerm = (term: string, contextSentence: string) => {
    const newItem: VocabularyItem = {
      id: `vocab-${Date.now()}-${Math.random()}`,
      term: term.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').trim(),
      phonetic: '',
      translation: `Discovered in "${scenario.title}"`,
      partOfSpeech: 'phrase',
      cefrLevel: cefrLevel,
      exampleSentence: contextSentence,
      usageNote: `Used during conversation with ${language.defaultPartnerName}`,
      language: language.name,
      savedAt: Date.now(),
      mastered: false,
    };
    onSaveWord(newItem);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12">
      {/* Session Top Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{language.flag}</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                {language.defaultPartnerName}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800/80 text-emerald-300 font-semibold">
                {cefrLevel}
              </span>
              <span className="text-xs text-slate-400">· {scenario.title}</span>
            </div>
            <p className="text-xs text-slate-400">
              Role: <span className="text-slate-300">{scenario.partnerRole}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Objective Goal Tracker */}
          <button
            onClick={() => setIsGoalCompleted(!isGoalCompleted)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              isGoalCompleted
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="Mark scenario objective as accomplished"
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 ${isGoalCompleted ? 'text-emerald-400' : 'text-slate-500'}`}
            />
            {isGoalCompleted ? 'Goal Completed!' : 'Goal: ' + scenario.objective.slice(0, 30) + '...'}
          </button>

          {/* End Call & View Fluency Report */}
          <button
            onClick={() => onEndSession(transcript)}
            className="px-4 py-2 bg-rose-600/90 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            End & View Report
          </button>
        </div>
      </div>

      {/* Main Grid: Visualizer on Left / Top, Live Transcript on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visualizer & Controls (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 sticky top-6">
          <AudioVisualizer
            isPartnerSpeaking={isPartnerSpeaking}
            isUserSpeaking={isUserSpeaking}
            isMuted={isMuted}
            inputVolume={inputVolume}
            outputVolume={outputVolume}
            statusText={statusMessage}
            partnerName={language.defaultPartnerName}
            targetLanguage={language.name}
            mode="orb"
            onToggleMute={toggleMute}
            onInterrupt={handleInterrupt}
          />

          {/* Controls Card */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-xl flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Voice Controls
              </span>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live 16kHz → 24kHz
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={toggleMute}
                className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isMuted
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                {isMuted ? 'Unmute Mic' : 'Mute Mic'}
              </button>

              <button
                onClick={handleInterrupt}
                disabled={!isPartnerSpeaking}
                className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isPartnerSpeaking
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 hover:bg-indigo-900 shadow-sm'
                    : 'bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Interrupt Turn
              </button>
            </div>

            {/* Quick Suggestions Toggle */}
            <button
              onClick={() => {
                if (!showSuggestions) fetchReplySuggestions();
                setShowSuggestions(!showSuggestions);
              }}
              className="w-full py-2 px-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-950 text-xs font-medium text-slate-300 transition-all flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>What can I say next?</span>
              </div>
              {showSuggestions ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {/* Suggestions Drawer Content */}
            {showSuggestions && (
              <div className="flex flex-col gap-2 pt-1">
                {isLoadingSuggestions ? (
                  <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    Generating natural responses in {language.name}...
                  </div>
                ) : suggestedReplies.length > 0 ? (
                  suggestedReplies.map((sug, i) => (
                    <div
                      key={i}
                      onClick={() => setTextInput(sug.targetText)}
                      className="p-2.5 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                          "{sug.targetText}"
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            speakText(sug.targetText);
                          }}
                          className="text-slate-500 hover:text-slate-200 p-0.5"
                          title="Listen"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">{sug.translation}</p>
                      <span className="text-[10px] text-indigo-400 font-medium block mt-0.5">
                        {sug.tone} · {sug.hint}
                      </span>
                    </div>
                  ))
                ) : (
                  <button
                    onClick={() => fetchReplySuggestions()}
                    className="py-3 text-center text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    Tap to get 3 suggested reply phrases
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Transcript Feed & Text Input (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4 h-[720px]">
          {/* Transcript Scroll Area */}
          <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-3xl p-5 backdrop-blur-xl overflow-y-auto flex flex-col gap-4 shadow-xl">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Real-Time Transcript & Analysis
              </span>
              <span>{transcript.length} turns exchanged</span>
            </div>

            {/* Conversation Empty State */}
            {transcript.length === 0 && !currentPartnerText && (
              <div className="my-auto py-12 text-center flex flex-col items-center justify-center gap-3 text-slate-500">
                <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                <p className="text-sm font-medium text-slate-300">
                  {language.defaultPartnerName} is joining the live voice call...
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Speak in {language.name} into your microphone. Say hello to get started!
                </p>
              </div>
            )}

            {/* Rendered Transcript Items */}
            {transcript.map((item) => {
              const isUser = item.speaker === 'user';
              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 px-1">
                    <span className="font-semibold text-slate-400">
                      {isUser ? 'You' : language.defaultPartnerName}
                    </span>
                    <span>·</span>
                    <span>
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-md relative group ${
                      isUser
                        ? 'bg-emerald-600/90 text-white rounded-br-sm'
                        : 'bg-slate-800/80 border border-slate-700/60 text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    <p className="break-words">{item.text}</p>

                    {/* Action Bar on hover/touch */}
                    <div
                      className={`flex items-center gap-2 mt-2 pt-2 border-t ${
                        isUser
                          ? 'border-emerald-500/40 text-emerald-100'
                          : 'border-slate-700 text-slate-400'
                      }`}
                    >
                      <button
                        onClick={() => speakText(item.text)}
                        className="hover:text-white p-1 rounded transition-colors cursor-pointer"
                        title="Listen to pronunciation"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      {isUser ? (
                        <button
                          onClick={() => handleCheckGrammar(item.text)}
                          className="text-[11px] font-medium hover:underline flex items-center gap-1 cursor-pointer bg-emerald-700/50 hover:bg-emerald-700 px-2 py-0.5 rounded-lg"
                        >
                          <Sparkles className="w-3 h-3" />
                          Check Grammar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSaveWordTerm(item.text, item.text)}
                          className="text-[11px] hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                        >
                          <BookmarkPlus className="w-3 h-3" />
                          Save Phrase
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* In-flight streaming Partner response */}
            {currentPartnerText && (
              <div className="flex flex-col items-start gap-1.5">
                <span className="text-[11px] font-semibold text-indigo-400 px-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  {language.defaultPartnerName} is speaking...
                </span>
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm p-4 text-sm leading-relaxed bg-slate-800/90 border border-indigo-700/50 text-indigo-100 shadow-lg">
                  <p>{currentPartnerText}</p>
                </div>
              </div>
            )}

            {/* In-flight live User interim transcription */}
            {currentUserInterim && (
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-[11px] font-semibold text-emerald-400 px-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Listening to you...
                </span>
                <div className="max-w-[85%] rounded-2xl rounded-br-sm p-3.5 text-sm leading-relaxed bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 italic shadow-lg">
                  <p>"{currentUserInterim}"</p>
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* Grammar Coach Drawer Popover if active */}
          {analyzedSentence && (
            <GrammarCoachDrawer
              sentence={analyzedSentence}
              result={grammarResult}
              isLoading={isLoadingGrammar}
              onClose={() => setAnalyzedSentence(null)}
              targetLanguage={language.name}
            />
          )}

          {/* Text Input Fallback Bar */}
          <form
            onSubmit={handleSendText}
            className="flex items-center gap-2 p-2 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-xl"
          >
            <input
              type="text"
              placeholder={`Or type in ${language.name}... (Press Enter)`}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl transition-all cursor-pointer shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
