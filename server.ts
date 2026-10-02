/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, Type, LiveServerMessage } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('⚠️ GEMINI_API_KEY is not set in environment. Gemini features will require key configuration.');
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    liveModel: 'gemini-3.8-live',
    textModel: 'gemini-3.8-flash',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Instant grammar and speech analysis endpoint using gemini-3.8-flash
app.post('/api/grammar-check', async (req, res) => {
  try {
    const { sentence, targetLanguage = 'Spanish', nativeLanguage = 'English', cefrLevel = 'B1' } = req.body;
    if (!sentence || typeof sentence !== 'string') {
      res.status(400).json({ error: 'Missing sentence string' });
      return;
    }

    const prompt = `You are an expert language teacher in ${targetLanguage} analyzing a learner's spoken sentence.
Learner's CEFR proficiency level: ${cefrLevel}
Sentence spoken by learner: "${sentence}"

Analyze this sentence. Even if the sentence is simple, assess whether it is grammatically correct, natural for native speakers, or has subtle issues in conjugation, word order, prepositions, gender agreement, or vocabulary.
Provide a clear analysis in ${nativeLanguage} with:
1. isCorrect: boolean (true if standard and natural, false if it contains errors or unnatural phrasing)
2. score: number from 1 to 10
3. corrections: array of specific issues found (original snippet, corrected snippet, brief reason)
4. naturalAlternative: how a native speaker would say this casually and naturally in ${targetLanguage}
5. explanation: clear, friendly pedagogical explanation
6. pronunciationTip: key phonetic tip for pronouncing difficult sounds in this sentence`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            score: { type: Type.NUMBER },
            corrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  correction: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ['original', 'correction', 'reason'],
              },
            },
            naturalAlternative: { type: Type.STRING },
            explanation: { type: Type.STRING },
            pronunciationTip: { type: Type.STRING },
          },
          required: ['isCorrect', 'score', 'corrections', 'naturalAlternative', 'explanation', 'pronunciationTip'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/grammar-check:', error);
    res.status(500).json({ error: error?.message || 'Failed to check grammar' });
  }
});

// Extract vocabulary and idioms from conversation turns
app.post('/api/extract-vocabulary', async (req, res) => {
  try {
    const { conversationText, targetLanguage = 'Spanish' } = req.body;
    if (!conversationText) {
      res.status(400).json({ error: 'Missing conversationText' });
      return;
    }

    const prompt = `Extract 4 to 8 high-yield vocabulary items, idioms, collocations, or colloquial expressions from this ${targetLanguage} conversation:
"""
${conversationText}
"""

For each item, identify the exact word/phrase in ${targetLanguage}, its English translation, part of speech, approximate CEFR difficulty level (A1, A2, B1, B2, C1), phonetic guide/pronunciation, and an example sentence.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  phonetic: { type: Type.STRING },
                  translation: { type: Type.STRING },
                  partOfSpeech: { type: Type.STRING },
                  cefrLevel: { type: Type.STRING },
                  exampleSentence: { type: Type.STRING },
                  usageNote: { type: Type.STRING },
                },
                required: ['term', 'phonetic', 'translation', 'partOfSpeech', 'cefrLevel', 'exampleSentence', 'usageNote'],
              },
            },
          },
          required: ['vocabulary'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/extract-vocabulary:', error);
    res.status(500).json({ error: error?.message || 'Failed to extract vocabulary' });
  }
});

// Generate comprehensive session fluency report
app.post('/api/fluency-report', async (req, res) => {
  try {
    const { transcript, targetLanguage = 'Spanish', cefrLevel = 'B1', scenario = 'General Conversation' } = req.body;
    if (!transcript || !Array.isArray(transcript)) {
      res.status(400).json({ error: 'Missing transcript array' });
      return;
    }

    const formattedTranscript = transcript
      .map((t: any) => `${t.speaker === 'user' ? 'Learner' : 'AI Partner'}: ${t.text}`)
      .join('\n');

    const prompt = `You are a supportive, world-class language proficiency evaluator.
Analyze this language practice session between a learner (practicing ${targetLanguage} at level ${cefrLevel}) and an AI conversational partner in the scenario "${scenario}".

Session Transcript:
"""
${formattedTranscript}
"""

Evaluate the learner's overall performance. Provide constructive, inspiring feedback with realistic scores (0-100), key strengths demonstrated, areas for growth, grammatical corrections, and 3 high-impact phrases to practice next.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            fluencyScore: { type: Type.NUMBER },
            grammarScore: { type: Type.NUMBER },
            vocabularyScore: { type: Type.NUMBER },
            comprehensionScore: { type: Type.NUMBER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedPhrases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phrase: { type: Type.STRING },
                  translation: { type: Type.STRING },
                  context: { type: Type.STRING },
                },
                required: ['phrase', 'translation', 'context'],
              },
            },
            summary: { type: Type.STRING },
            encouragement: { type: Type.STRING },
          },
          required: [
            'overallScore',
            'fluencyScore',
            'grammarScore',
            'vocabularyScore',
            'comprehensionScore',
            'strengths',
            'areasForImprovement',
            'recommendedPhrases',
            'summary',
            'encouragement',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/fluency-report:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate fluency report' });
  }
});

// Suggest quick replies when user feels stuck
app.post('/api/suggest-replies', async (req, res) => {
  try {
    const { recentTranscript = [], targetLanguage = 'Spanish', cefrLevel = 'B1', scenario = '' } = req.body;
    const historyText = recentTranscript
      .slice(-4)
      .map((t: any) => `${t.speaker === 'user' ? 'Learner' : 'Partner'}: ${t.text}`)
      .join('\n');

    const prompt = `The learner is having a real-time spoken conversation in ${targetLanguage} (level ${cefrLevel}) in scenario "${scenario}".
Recent conversation:
"""
${historyText || 'Just starting conversation'}
"""

Suggest 3 natural, authentic reply options in ${targetLanguage} the learner could say right now:
1. A straightforward / polite response
2. An inquisitive response (asking a question or showing curiosity)
3. A more creative or detailed conversational response

For each, provide the target sentence, English translation, and pronunciation/context hint.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  targetText: { type: Type.STRING },
                  translation: { type: Type.STRING },
                  tone: { type: Type.STRING },
                  hint: { type: Type.STRING },
                },
                required: ['targetText', 'translation', 'tone', 'hint'],
              },
            },
          },
          required: ['suggestions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/suggest-replies:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate suggestions' });
  }
});

// Text-mode partner fallback endpoint (uses gemini-3.8-flash)
app.post('/api/chat-turn', async (req, res) => {
  try {
    const {
      message,
      conversationHistory = [],
      targetLanguage = 'Spanish',
      cefrLevel = 'B1',
      scenario = 'Casual conversation',
      partnerName = 'Sofia',
      persona = 'Warm and encouraging local friend',
    } = req.body;

    const systemInstruction = `You are ${partnerName}, a native ${targetLanguage} speaker and conversational practice partner.
Learner level: CEFR ${cefrLevel}.
Current Scenario: ${scenario}.
Your Persona: ${persona}.

Rules:
1. Speak exclusively in natural, modern ${targetLanguage} adapted to CEFR ${cefrLevel}.
2. Keep responses brief (1-3 sentences) so it feels like a real voice or text chat turn.
3. Ask an engaging question or offer an insightful comment to keep the conversation going.
4. If the learner made a notable error, naturally model the correct phrasing in your response without breaking conversational immersion.`;

    const contents = [
      ...conversationHistory.map((m: any) => ({
        role: m.speaker === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    res.json({
      text: response.text || '',
    });
  } catch (error: any) {
    console.error('Error in /api/chat-turn:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate chat turn' });
  }
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket Server for Gemini Live API
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/live-session') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', (clientWs: WebSocket) => {
  console.log('📡 Client connected to Live WebSocket session');

  let session: any = null;
  let isSessionActive = false;
  let sessionConfig: any = null;

  const cleanupSession = () => {
    isSessionActive = false;
    if (session) {
      try {
        session.close();
      } catch (err) {
        console.warn('Error closing live session:', err);
      }
      session = null;
    }
  };

  clientWs.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'init') {
        cleanupSession();
        sessionConfig = msg;

        const targetLanguage = msg.targetLanguage || 'Spanish';
        const partnerName = msg.partnerName || 'Sofia';
        const cefrLevel = msg.cefrLevel || 'B1';
        const scenario = msg.scenario || 'Casual Chit-Chat';
        const scenarioGoal = msg.scenarioGoal || 'Have an engaging conversation and practice fluid speaking';
        const persona = msg.persona || 'friendly, encouraging native conversation partner';
        const voiceName = msg.voiceName || 'Zephyr';

        const systemInstruction = `You are ${partnerName}, a native ${targetLanguage} speaker and conversational practice partner.
The user is practicing their ${targetLanguage} at CEFR level ${cefrLevel}.
Current Scenario: ${scenario}.
Scenario Goal: ${scenarioGoal}.
Partner Persona: ${persona}.

Critical Rules:
1. Speak strictly in natural, authentic ${targetLanguage} tailored to CEFR ${cefrLevel}. (Only speak English if the user explicitly asks for translation or explanation).
2. Keep your conversational turns concise and spoken-friendly (1 to 3 short sentences max). This is a real-time spoken voice call, not a written essay.
3. Always ask engaging, authentic questions or react with genuine interest to invite the learner to speak.
4. If the learner makes a grammar or vocabulary mistake, gently model the correct phrasing naturally in your reply without lecturing or interrupting their flow.
5. Speak with warmth, encouragement, and clear articulation.
6. Begin the conversation immediately by greeting the user warmly in ${targetLanguage} and kicking off the scenario!`;

        try {
          session = await ai.live.connect({
            model: 'gemini-3.8-live',
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName },
                },
              },
              systemInstruction: systemInstruction,
              outputAudioTranscription: {},
              inputAudioTranscription: {},
            },
            callbacks: {
              onopen: () => {
                isSessionActive = true;
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'ready', message: 'Gemini Live session connected' }));
                }
              },
              onmessage: (serverMsg: LiveServerMessage) => {
                if (clientWs.readyState !== WebSocket.OPEN) return;

                const sc = serverMsg.serverContent;
                if (!sc) return;

                // Handle model interruption
                if (sc.interrupted) {
                  clientWs.send(JSON.stringify({ type: 'interrupted' }));
                }

                // Handle model audio output
                if (sc.modelTurn?.parts) {
                  for (const part of sc.modelTurn.parts) {
                    if (part.inlineData?.data) {
                      clientWs.send(
                        JSON.stringify({
                          type: 'audio',
                          data: part.inlineData.data,
                        })
                      );
                    }
                    if (part.text) {
                      clientWs.send(
                        JSON.stringify({
                          type: 'partner_text',
                          text: part.text,
                        })
                      );
                    }
                  }
                }

                // Handle output transcription (AI speech-to-text)
                if ((sc as any).outputTranscription?.text) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'partner_transcript',
                      text: (sc as any).outputTranscription.text,
                    })
                  );
                }

                // Handle input transcription (User speech-to-text)
                if ((sc as any).inputTranscription?.text) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'user_transcript',
                      text: (sc as any).inputTranscription.text,
                    })
                  );
                }

                // Handle interim input transcription (User speaking live)
                if ((sc as any).interimInputTranscription?.text) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'user_interim_transcript',
                      text: (sc as any).interimInputTranscription.text,
                    })
                  );
                }

                // Handle turn complete
                if (sc.turnComplete) {
                  clientWs.send(JSON.stringify({ type: 'turn_complete' }));
                }
              },
              onerror: (err: any) => {
                console.error('Gemini Live session error:', err);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'error',
                      message: err?.message || 'Gemini Live session error occurred',
                    })
                  );
                }
              },
              onclose: () => {
                isSessionActive = false;
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'session_closed' }));
                }
              },
            },
          });
        } catch (connErr: any) {
          console.error('Failed to establish Live API connection:', connErr);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                message: connErr?.message || 'Failed to initialize Gemini Live session. Check GEMINI_API_KEY.',
              })
            );
          }
        }
      } else if (msg.type === 'audio') {
        // Real-time audio chunk from user's microphone (16kHz 16-bit PCM little-endian base64)
        if (session && msg.data) {
          try {
            session.sendRealtimeInput({
              audio: {
                data: msg.data,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } catch (audioErr) {
            console.error('Error sending audio to Gemini Live:', audioErr);
          }
        }
      } else if (msg.type === 'text') {
        // User sent a text message into the live session
        if (session && msg.text) {
          try {
            session.sendClientContent({
              turns: [
                {
                  role: 'user',
                  parts: [{ text: msg.text }],
                },
              ],
              turnComplete: true,
            });
          } catch (textErr) {
            console.error('Error sending client content to Gemini Live:', textErr);
          }
        }
      } else if (msg.type === 'interrupt') {
        // User clicked interrupt or started speaking
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({ type: 'interrupted' }));
        }
      }
    } catch (parseErr) {
      console.error('Error processing client message:', parseErr);
    }
  });

  clientWs.on('close', () => {
    console.log('🔌 Client disconnected from Live WebSocket session');
    cleanupSession();
  });

  clientWs.on('error', (err) => {
    console.error('Client WebSocket error:', err);
    cleanupSession();
  });
});

// Configure Vite middleware in dev or static serving in production
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Fluently Server listening on http://0.0.0.0:${PORT}`);
});
