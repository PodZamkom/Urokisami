export interface AudioBlob {
  data: string;
  mimeType: string;
}

/**
 * Converts Float32Array audio data to 16-bit PCM Blob formatted for Gemini.
 * Includes downsampling if input rate > 16000Hz.
 */
export function createPcmBlob(data: Float32Array, sampleRate: number): AudioBlob {
  let audioData = data;
  const targetRate = 16000;

  if (sampleRate > targetRate) {
    audioData = downsampleBuffer(data, sampleRate, targetRate);
  }

  const l = audioData.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] before scaling
    const s = Math.max(-1, Math.min(1, audioData[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: base64Encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return buffer;
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const index = i * ratio;
    const intIndex = Math.floor(index);
    const frac = index - intIndex;
    // Linear interpolation
    const a = buffer[intIndex];
    const b = buffer[intIndex + 1] || a;
    result[i] = a + (b - a) * frac;
  }
  return result;
}

/**
 * Basic Base64 encoder for Uint8Array.
 */
function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Basic Base64 decoder.
 */
function base64Decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM data from Gemini (24kHz typically) into an AudioBuffer.
 */
export async function decodeAudioData(
  base64Data: string,
  ctx: AudioContext,
  sampleRate: number = 24000, // Gemini output is usually 24kHz
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const bytes = base64Decode(base64Data);
  const dataInt16 = new Int16Array(bytes.buffer);

  // Create an AudioBuffer
  // frameCount is total samples / channels
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 [-32768, 32767] to Float32 [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}