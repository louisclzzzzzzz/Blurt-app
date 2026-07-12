// AudioWorkletProcessor : tourne dans son propre thread audio temps réel, pas
// de TypeScript ici (contexte global séparé, pas de bundling par Vite) — cf.
// DICTEE_LIVE_NUTRITION.md ("AudioWorklet plutôt que MediaRecorder, qui sort
// de l'Opus compressé plutôt que du PCM brut").
//
// Convertit le flux mono du device (sample rate natif, souvent 44.1/48kHz) en
// PCM 16-bit little-endian à targetSampleRate (16kHz, attendu par Voxtral
// Realtime), par interpolation linéaire simple — suffisant pour de l'ASR,
// pas une qualité audiophile. La phase d'interpolation est conservée d'un
// appel process() à l'autre pour ne pas introduire de discontinuité toutes
// les ~128 échantillons (taille d'un quantum de rendu WebAudio).
class PCMDownsamplerProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const targetSampleRate = options?.processorOptions?.targetSampleRate ?? 16000
    // `sampleRate` est une globale de AudioWorkletGlobalScope (sample rate du
    // AudioContext courant, pas configurable ici).
    this.ratio = sampleRate / targetSampleRate
    this.phase = 0
    this.previousSample = 0
  }

  process(inputs) {
    const input = inputs[0]
    const channel = input && input[0]
    if (!channel || channel.length === 0) {
      return true
    }

    const outSamples = []
    let i = this.phase
    while (i < channel.length) {
      const idx = Math.floor(i)
      const frac = i - idx
      const s0 = idx === 0 ? this.previousSample : channel[idx - 1]
      const s1 = channel[idx]
      outSamples.push(s0 + (s1 - s0) * frac)
      i += this.ratio
    }
    this.phase = i - channel.length
    this.previousSample = channel[channel.length - 1]

    if (outSamples.length > 0) {
      const pcm16 = new Int16Array(outSamples.length)
      for (let j = 0; j < outSamples.length; j++) {
        const clamped = Math.max(-1, Math.min(1, outSamples[j]))
        pcm16[j] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
      }
      this.port.postMessage(pcm16.buffer, [pcm16.buffer])
    }

    return true
  }
}

registerProcessor('pcm-downsampler', PCMDownsamplerProcessor)
