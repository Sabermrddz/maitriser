/* Decode a recorded audio Blob (webm/mp4) to 16kHz mono Float32Array,
 * the input format expected by the on-device Whisper worker. */

const TARGET_RATE = 16000;

export async function decodeTo16kMono(blob) {
  if (!blob || blob.size === 0) throw new Error('empty-audio');
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error('webaudio-unsupported');
  const ctx = new AudioCtx();
  try {
    // Slice the buffer: decodeAudioData detaches it.
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const numChannels = audioBuffer.numberOfChannels;
    const len = audioBuffer.length;
    const mono = new Float32Array(len);
    for (let c = 0; c < numChannels; c++) {
      const data = audioBuffer.getChannelData(c);
      for (let i = 0; i < len; i++) mono[i] += data[i] / numChannels;
    }
    if (audioBuffer.sampleRate === TARGET_RATE) return mono;
    // Linear resample to 16kHz.
    const ratio = audioBuffer.sampleRate / TARGET_RATE;
    const newLen = Math.max(1, Math.floor(len / ratio));
    const out = new Float32Array(newLen);
    for (let i = 0; i < newLen; i++) {
      const pos = i * ratio;
      const i0 = Math.floor(pos);
      const i1 = Math.min(i0 + 1, len - 1);
      const frac = pos - i0;
      out[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
    }
    return out;
  } finally {
    try { await ctx.close(); } catch { /* ignore */ }
  }
}
