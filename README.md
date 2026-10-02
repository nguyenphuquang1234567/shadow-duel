# Shadow Duel

A Phaser + TypeScript browser fighting game against a bot, with three difficulty levels, procedural silhouette fighters and WAV combat sounds.

## Run

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Build with `npm run build`.

## Controls

A/D or arrow keys: move; W: jump; J: punch; K: kick; L: block; Space: dodge; Esc: pause. First to win two rounds wins the match.

## Audio

Assets live in `public/audio/`; keys and playback are in `src/audio.ts`. The current dodge sound is a supplied WAV. `scripts/generate_sfx.py` generates procedural effects; running it without arguments also overwrites the dodge file. Pass `punch`, `kick`, or `block` to regenerate only those effects.

The baseline uses distance checks for attacks. Hitbox/hurtbox development belongs on `feature/hitbox-hurtbox`.
