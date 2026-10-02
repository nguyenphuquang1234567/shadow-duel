// Stable asset keys; Vite serves public/audio and copies it to the build.
export const audioManifest = {
  punch: '/audio/punch-hit.wav', kick: '/audio/kick-hit.wav',
  block: '/audio/block.wav', dodge: '/audio/dodge.wav',
} as const;
export type SoundKey = keyof typeof audioManifest;
export class CombatAudio {
  enabled = false;
  private context?: AudioContext;
  private master?: DynamicsCompressorNode;
  private loading?: Promise<void>;
  private buffers = new Map<SoundKey, AudioBuffer>();
  async enable() {
    this.context ??= new AudioContext();
    await this.context.resume();
    if (!this.master) {
      this.master = this.context.createDynamicsCompressor();
      this.master.threshold.value = -12;
      this.master.ratio.value = 6;
      this.master.connect(this.context.destination);
    }
    if (this.loading) return this.loading;
    this.loading = Promise.all(Object.entries(audioManifest).map(async ([key, path]) => {
      if (this.buffers.has(key as SoundKey)) return;
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Audio load failed: ${path}`);
      this.buffers.set(key as SoundKey, await this.context!.decodeAudioData(await response.arrayBuffer()));
    })).then(() => {});
    await this.loading;
  }
  play(key: SoundKey) {
    const buffer = this.buffers.get(key);
    if (!this.enabled || !this.context || !buffer) return;
    if (this.context.state === 'suspended') void this.context.resume();
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer; gain.gain.value = key === 'dodge' ? .8 : 1.4;
    source.connect(gain); gain.connect(this.master!); source.start();
  }
}
