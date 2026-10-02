/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AudioStreamerOptions {
  onInputVolume?: (volume: number) => void;
  onOutputVolume?: (volume: number) => void;
  onAudioData?: (base64Pcm16k: string) => void;
  onError?: (err: Error) => void;
}

export class LiveAudioEngine {
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  private nextPlayTime = 0;
  private activeSourceNodes: AudioBufferSourceNode[] = [];
  private isMicMuted = false;
  private isRecording = false;

  private volumeInterval: number | null = null;

  constructor(private options: AudioStreamerOptions = {}) {}

  /**
   * Initializes input (16kHz) and output (24kHz) AudioContexts
   */
  public async initialize(): Promise<void> {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;

      // Output context matches Gemini Live output rate (24,000 Hz)
      this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });
      this.outputAnalyser = this.outputAudioCtx.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.smoothingTimeConstant = 0.4;
      this.outputAnalyser.connect(this.outputAudioCtx.destination);

      // Start volume monitor loop
      this.startVolumeMonitoring();
    } catch (err: any) {
      this.options.onError?.(err);
      throw err;
    }
  }

  /**
   * Starts capturing user microphone and streaming 16kHz PCM
   */
  public async startMicrophone(): Promise<void> {
    try {
      if (this.isRecording) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      // Try to create input context at 16000Hz, or fallback to default and downsample
      try {
        this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      } catch {
        this.inputAudioCtx = new AudioCtx();
      }

      this.inputAnalyser = this.inputAudioCtx.createAnalyser();
      this.inputAnalyser.fftSize = 256;
      this.inputAnalyser.smoothingTimeConstant = 0.3;

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.sourceNode = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);

      // 4096 buffer size provides smooth ~1/4 second chunks at 16kHz
      const bufferSize = 4096;
      this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(bufferSize, 1, 1);

      this.sourceNode.connect(this.inputAnalyser);
      this.inputAnalyser.connect(this.scriptProcessor);

      // Connect to a silent dummy destination so onaudioprocess fires
      const silentGain = this.inputAudioCtx.createGain();
      silentGain.gain.value = 0;
      this.scriptProcessor.connect(silentGain);
      silentGain.connect(this.inputAudioCtx.destination);

      const actualSampleRate = this.inputAudioCtx.sampleRate;

      this.scriptProcessor.onaudioprocess = (e) => {
        if (this.isMicMuted || !this.isRecording) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);
        // Downsample/resample to 16kHz 16-bit PCM little-endian
        const pcmBuffer = this.resampleTo16kPCM(inputChannelData, actualSampleRate);
        const base64Audio = this.arrayBufferToBase64(pcmBuffer);

        if (this.options.onAudioData) {
          this.options.onAudioData(base64Audio);
        }
      };

      this.isRecording = true;
    } catch (err: any) {
      console.error('Failed to start microphone:', err);
      this.options.onError?.(err);
      throw err;
    }
  }

  /**
   * Resamples raw Float32 audio to 16,000 Hz, 16-bit signed integer little-endian PCM
   */
  private resampleTo16kPCM(inputData: Float32Array, inputSampleRate: number): ArrayBuffer {
    const targetSampleRate = 16000;
    let resampledData: Float32Array;

    if (inputSampleRate === targetSampleRate) {
      resampledData = inputData;
    } else {
      const ratio = inputSampleRate / targetSampleRate;
      const newLength = Math.round(inputData.length / ratio);
      resampledData = new Float32Array(newLength);

      for (let i = 0; i < newLength; i++) {
        const originIndex = i * ratio;
        const index1 = Math.floor(originIndex);
        const index2 = Math.min(index1 + 1, inputData.length - 1);
        const weight = originIndex - index1;
        resampledData[i] = inputData[index1] * (1 - weight) + inputData[index2] * weight;
      }
    }

    const buffer = new ArrayBuffer(resampledData.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < resampledData.length; i++) {
      const s = Math.max(-1, Math.min(1, resampledData[i]));
      // 16-bit signed PCM
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return buffer;
  }

  /**
   * Plays incoming 24kHz raw PCM little-endian base64 audio chunk with jitter-free gapless scheduling
   */
  public playAudioChunk(base64Pcm24k: string): void {
    if (!this.outputAudioCtx || !this.outputAnalyser) return;

    if (this.outputAudioCtx.state === 'suspended') {
      this.outputAudioCtx.resume();
    }

    try {
      const float32Data = this.base64To24kFloat32(base64Pcm24k);
      if (!float32Data || float32Data.length === 0) return;

      const audioBuffer = this.outputAudioCtx.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const sourceNode = this.outputAudioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;

      // Connect to output analyzer, then to destination
      sourceNode.connect(this.outputAnalyser);

      const currentTime = this.outputAudioCtx.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }

      sourceNode.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;

      this.activeSourceNodes.push(sourceNode);

      sourceNode.onended = () => {
        const index = this.activeSourceNodes.indexOf(sourceNode);
        if (index > -1) {
          this.activeSourceNodes.splice(index, 1);
        }
      };
    } catch (err) {
      console.error('Error playing audio chunk:', err);
    }
  }

  /**
   * Converts base64 PCM (24kHz 16-bit signed little-endian) to Float32Array
   */
  private base64To24kFloat32(base64: string): Float32Array {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const dataView = new DataView(bytes.buffer);
    const sampleCount = Math.floor(bytes.byteLength / 2);
    const float32 = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
      const int16 = dataView.getInt16(i * 2, true);
      float32[i] = int16 / (int16 < 0 ? 0x8000 : 0x7fff);
    }

    return float32;
  }

  /**
   * Immediately stops all currently playing and queued audio buffers
   */
  public stopPlayback(): void {
    for (const source of this.activeSourceNodes) {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    }
    this.activeSourceNodes = [];
    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    }
  }

  /**
   * Toggles microphone mute state
   */
  public setMute(muted: boolean): void {
    this.isMicMuted = muted;
  }

  public getIsMuted(): boolean {
    return this.isMicMuted;
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Returns current input and output frequency data for visualization
   */
  public getVisualizationData(): { inputFrequencies: Uint8Array; outputFrequencies: Uint8Array } {
    const inputFrequencies = new Uint8Array(this.inputAnalyser?.frequencyBinCount || 32);
    const outputFrequencies = new Uint8Array(this.outputAnalyser?.frequencyBinCount || 32);

    if (this.inputAnalyser && !this.isMicMuted) {
      this.inputAnalyser.getByteFrequencyData(inputFrequencies);
    }

    if (this.outputAnalyser) {
      this.outputAnalyser.getByteFrequencyData(outputFrequencies);
    }

    return { inputFrequencies, outputFrequencies };
  }

  private startVolumeMonitoring(): void {
    if (this.volumeInterval) return;

    this.volumeInterval = window.setInterval(() => {
      if (this.options.onInputVolume && this.inputAnalyser && !this.isMicMuted) {
        const data = new Uint8Array(this.inputAnalyser.frequencyBinCount);
        this.inputAnalyser.getByteFrequencyData(data);
        const sum = data.reduce((a, b) => a + b, 0);
        const avg = sum / (data.length || 1);
        this.options.onInputVolume(Math.min(100, Math.round((avg / 255) * 100)));
      }

      if (this.options.onOutputVolume && this.outputAnalyser) {
        const data = new Uint8Array(this.outputAnalyser.frequencyBinCount);
        this.outputAnalyser.getByteFrequencyData(data);
        const sum = data.reduce((a, b) => a + b, 0);
        const avg = sum / (data.length || 1);
        this.options.onOutputVolume(Math.min(100, Math.round((avg / 255) * 100)));
      }
    }, 60);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Full cleanup
   */
  public destroy(): void {
    this.stopPlayback();
    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch {}
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx) {
      try {
        this.outputAudioCtx.close();
      } catch {}
      this.outputAudioCtx = null;
    }

    this.isRecording = false;
  }
}
