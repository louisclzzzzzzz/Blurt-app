// AudioWorkletProcessor : tourne dans son propre thread audio temps réel, pas
// de TypeScript ici (contexte global séparé, pas de bundling par Vite) — cf.
// DICTEE_LIVE_NUTRITION.md ("AudioWorklet plutôt que MediaRecorder, qui sort
// de l'Opus compressé plutôt que du PCM brut").
//
// Convertit le flux mono du device (sample rate natif, souvent 44.1/48kHz) en
// PCM 16-bit little-endian à targetSampleRate (16kHz, attendu par Voxtral
// Realtime) : filtre passe-bas anti-repliement (cascade de 4 filtres RC du
// premier ordre) puis décimation par interpolation linéaire — suffisant pour
// de l'ASR, pas une qualité audiophile, mais le filtre est nécessaire : sans
// lui, une décimation directe (ratio ~3:1 à 48kHz) laisse repasser des
// fréquences au-dessus de la nouvelle Nyquist qui se replient en bruit basse
// fréquence après coup (repliement spectral) — confirmé en pratique (test
// bout en bout navigateur réel, cf. DICTEE_LIVE_NUTRITION.md Phase 7D) : un
// "pomme" mal reconnu en "bombe" avant l'ajout de ce filtre. La phase
// d'interpolation est conservée d'un appel process() à l'autre pour ne pas
// introduire de discontinuité toutes les ~128 échantillons (taille d'un
// quantum de rendu WebAudio).
class PCMDownsamplerProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const targetSampleRate = options?.processorOptions?.targetSampleRate ?? 16000
    // `sampleRate` est une globale de AudioWorkletGlobalScope (sample rate du
    // AudioContext courant, pas configurable ici).
    this.ratio = sampleRate / targetSampleRate
    this.phase = 0
    this.previousSample = 0

    const cutoffHz = (targetSampleRate / 2) * 0.9
    const rc = 1 / (2 * Math.PI * cutoffHz)
    const dt = 1 / sampleRate
    this.filterAlpha = dt / (rc + dt)
    this.filterStages = new Float32Array(4)
  }

  _lowpass(sample) {
    let x = sample
    for (let i = 0; i < this.filterStages.length; i++) {
      this.filterStages[i] += this.filterAlpha * (x - this.filterStages[i])
      x = this.filterStages[i]
    }
    return x
  }

  process(inputs) {
    const input = inputs[0]
    const channel = input && input[0]
    if (!channel || channel.length === 0) {
      return true
    }

    const filtered = new Float32Array(channel.length)
    for (let i = 0; i < channel.length; i++) {
      filtered[i] = this._lowpass(channel[i])
    }

    const outSamples = []
    let i = this.phase
    while (i < filtered.length) {
      const idx = Math.floor(i)
      const frac = i - idx
      const s0 = idx === 0 ? this.previousSample : filtered[idx - 1]
      const s1 = filtered[idx]
      outSamples.push(s0 + (s1 - s0) * frac)
      i += this.ratio
    }
    this.phase = i - filtered.length
    this.previousSample = filtered[filtered.length - 1]

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
