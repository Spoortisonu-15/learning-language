/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Sparkles } from 'lucide-react';

interface AudioVisualizerProps {
  isPartnerSpeaking: boolean;
  isUserSpeaking: boolean;
  isMuted: boolean;
  inputVolume: number;
  outputVolume: number;
  statusText: string;
  partnerName: string;
  targetLanguage: string;
  mode?: 'orb' | 'waveform';
  onToggleMute?: () => void;
  onInterrupt?: () => void;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPartnerSpeaking,
  isUserSpeaking,
  isMuted,
  inputVolume,
  outputVolume,
  statusText,
  partnerName,
  targetLanguage,
  mode = 'orb',
  onToggleMute,
  onInterrupt,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      phase += 0.04;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Determine active intensity
      const activeVolume = isPartnerSpeaking ? outputVolume : isUserSpeaking && !isMuted ? inputVolume : 12;
      const normalizedVolume = Math.min(1, Math.max(0.1, activeVolume / 80));

      if (mode === 'orb') {
        // Draw multi-layered glowing organic orb
        const baseRadius = 55 + normalizedVolume * 35;

        // Outer ambient glow ring
        const gradientGlow = ctx.createRadialGradient(
          centerX,
          centerY,
          baseRadius * 0.4,
          centerX,
          centerY,
          baseRadius * 1.8
        );

        if (isPartnerSpeaking) {
          gradientGlow.addColorStop(0, 'rgba(99, 102, 241, 0.45)'); // Indigo
          gradientGlow.addColorStop(0.5, 'rgba(168, 85, 247, 0.25)'); // Purple
          gradientGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
        } else if (isUserSpeaking && !isMuted) {
          gradientGlow.addColorStop(0, 'rgba(16, 185, 129, 0.5)'); // Emerald
          gradientGlow.addColorStop(0.5, 'rgba(20, 184, 166, 0.25)'); // Teal
          gradientGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
        } else {
          gradientGlow.addColorStop(0, 'rgba(56, 189, 248, 0.25)'); // Sky
          gradientGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
        }

        ctx.fillStyle = gradientGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Dynamic wave perimeter
        const points = 32;
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const wave =
            Math.sin(angle * 4 + phase * 2) * (6 * normalizedVolume) +
            Math.cos(angle * 6 - phase) * (4 * normalizedVolume);
          const r = baseRadius + wave;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const coreGradient = ctx.createRadialGradient(
          centerX - 10,
          centerY - 10,
          10,
          centerX,
          centerY,
          baseRadius
        );

        if (isPartnerSpeaking) {
          coreGradient.addColorStop(0, '#a5b4fc');
          coreGradient.addColorStop(0.4, '#6366f1');
          coreGradient.addColorStop(1, '#4338ca');
        } else if (isUserSpeaking && !isMuted) {
          coreGradient.addColorStop(0, '#6ee7b7');
          coreGradient.addColorStop(0.4, '#10b981');
          coreGradient.addColorStop(1, '#047857');
        } else {
          coreGradient.addColorStop(0, '#38bdf8');
          coreGradient.addColorStop(0.6, '#0284c7');
          coreGradient.addColorStop(1, '#0369a1');
        }

        ctx.fillStyle = coreGradient;
        ctx.shadowColor = isPartnerSpeaking ? '#818cf8' : isUserSpeaking ? '#34d399' : '#38bdf8';
        ctx.shadowBlur = 24 * normalizedVolume;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner specular ring
        ctx.beginPath();
        ctx.arc(centerX - 15, centerY - 15, baseRadius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.fill();
      } else {
        // Multi-band frequency visualizer bars
        const barCount = 36;
        const totalWidth = width * 0.75;
        const barWidth = totalWidth / barCount - 3;
        const startX = (width - totalWidth) / 2;

        for (let i = 0; i < barCount; i++) {
          const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2);
          const heightMultiplier = Math.cos(distFromCenter * (Math.PI / 2.2));
          const wave = Math.sin(i * 0.35 + phase * 3) * 0.5 + 0.5;
          const barHeight = Math.max(6, (wave * 80 + 10) * normalizedVolume * heightMultiplier);

          const x = startX + i * (barWidth + 3);
          const y = centerY - barHeight / 2;

          const barGrad = ctx.createLinearGradient(x, y, x, y + barHeight);
          if (isPartnerSpeaking) {
            barGrad.addColorStop(0, '#a78bfa');
            barGrad.addColorStop(1, '#4f46e5');
          } else if (isUserSpeaking && !isMuted) {
            barGrad.addColorStop(0, '#34d399');
            barGrad.addColorStop(1, '#059669');
          } else {
            barGrad.addColorStop(0, '#38bdf8');
            barGrad.addColorStop(1, '#0284c7');
          }

          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPartnerSpeaking, isUserSpeaking, isMuted, inputVolume, outputVolume, mode]);

  return (
    <div className="relative flex flex-col items-center justify-center p-6 bg-slate-900/60 rounded-3xl border border-slate-800/80 backdrop-blur-xl shadow-2xl overflow-hidden transition-all">
      {/* Background ambient lighting */}
      <div
        className={`absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          isPartnerSpeaking
            ? 'bg-indigo-500/20'
            : isUserSpeaking && !isMuted
            ? 'bg-emerald-500/20'
            : 'bg-cyan-500/10'
        }`}
      />
      <div
        className={`absolute -bottom-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          isPartnerSpeaking
            ? 'bg-purple-500/20'
            : isUserSpeaking && !isMuted
            ? 'bg-teal-500/20'
            : 'bg-blue-500/10'
        }`}
      />

      {/* Header Info */}
      <div className="w-full flex items-center justify-between mb-4 z-10 px-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isPartnerSpeaking
                ? 'bg-indigo-400 animate-ping'
                : isUserSpeaking && !isMuted
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-slate-400'
            }`}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isPartnerSpeaking
              ? `${partnerName} speaking (${targetLanguage})`
              : isUserSpeaking && !isMuted
              ? 'Listening to you'
              : 'Voice Session Active'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick interrupt button when partner is speaking */}
          {isPartnerSpeaking && onInterrupt && (
            <button
              onClick={onInterrupt}
              className="text-xs px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Stop partner and take your turn"
            >
              <Sparkles className="w-3 h-3 text-indigo-300" />
              Interrupt & Speak
            </button>
          )}

          {/* User Mute indicator / toggle */}
          {onToggleMute && (
            <button
              onClick={onToggleMute}
              className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Interactive Visualizer Canvas */}
      <div className="relative w-full max-w-sm h-64 flex items-center justify-center my-2">
        <canvas
          ref={canvasRef}
          width={380}
          height={260}
          className="w-full h-full max-w-[380px] max-h-[260px] pointer-events-none"
        />

        {/* Center overlay icon on orb */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {isMuted && (
            <div className="px-3 py-1 bg-rose-950/80 border border-rose-500/40 rounded-full text-rose-300 text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-md">
              <MicOff className="w-3.5 h-3.5" />
              Microphone Muted
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Status Bar */}
      <div className="w-full text-center mt-2 z-10">
        <p className="text-sm font-medium text-slate-200 transition-all duration-300">
          {statusText}
        </p>

        {/* Volume feedback gauges */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            {isMuted ? (
              <MicOff className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>You:</span>
            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  isMuted ? 'bg-slate-600' : 'bg-emerald-400'
                }`}
                style={{ width: `${isMuted ? 0 : inputVolume}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>{partnerName}:</span>
            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400 transition-all duration-75"
                style={{ width: `${outputVolume}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
