/* On-device transcription worker (Whisper base, French, quantized).
 * Runs inside a Web Worker so inference never blocks the UI thread.
 * The model downloads from HuggingFace Hub on first use and is cached
 * by transformers.js afterwards.
 *
 * Protocol (main thread -> worker):
 *   { type: 'transcribe', audio: Float32Array(16kHz mono) }
 * Worker -> main thread:
 *   { status: 'progress', data }  raw pipeline progress (download/inference)
 *   { status: 'ready' }            model loaded, transcription starting/finishing load
 *   { status: 'complete', data }   data = transcript string
 *   { status: 'error', data }      data = error message string
 */
import { pipeline } from '@huggingface/transformers';

const MODEL_ID = 'Xenova/whisper-base';
const LANGUAGE = 'french';

class TranscriberSingleton {
  static task = 'automatic-speech-recognition';
  static model = MODEL_ID;
  static quantized = true;
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, {
        quantized: this.quantized,
        progress_callback,
      });
    }
    return this.instance;
  }
}

self.addEventListener('message', async (event) => {
  const message = event.data || {};
  if (message.type !== 'transcribe' || !message.audio) return;

  try {
    const transcriber = await TranscriberSingleton.getInstance((data) => {
      self.postMessage({ status: 'progress', data });
    });
    self.postMessage({ status: 'ready' });

    const output = await transcriber(message.audio, {
      language: LANGUAGE,
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    const text = Array.isArray(output)
      ? output.map((o) => o.text || '').join(' ').trim()
      : String(output?.text || '').trim();
    self.postMessage({ status: 'complete', data: text });
  } catch (error) {
    self.postMessage({ status: 'error', data: String(error?.message || error) });
  }
});
