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

The `main` baseline uses distance checks. On `feature/hitbox-hurtbox`, animated fist/foot hitboxes collide with head, torso and limb hurtboxes. Dodge lowers the body and moves backward without automatic invulnerability. Press H to toggle collision visualization. Each attack deals damage at most once during its active window. Frame-to-frame capsule sweeps check weapon and opponent motion together, clipped to the active portion of the attack, so a weapon passing through a target between frames still registers contact.

Run `npx playwright test` for collision regressions and browser smoke testing; tests use installed Google Chrome.

## Stronger Normal / Hard bots

On `feature/stronger-normal-hard-bots`, Easy keeps the original choices and 420 ms decision interval. Normal decides every 120 ms; Hard every 65 ms. They sample weighted legal actions rather than selecting a single highest-scoring action. Close range favors punches, longer range favors kicks; stamina reserves, recovery-window aggression, room-aware dodge, and short-lived memory of repeated player attacks improve defense. Damage, health, movement speed, jump rules and attack cooldowns are shared with the player.

Run `node scripts/benchmark-bots.mjs` with the local Vite server running to compare against baseline commit `b5cc4be`. In 32 seeded, 30-second encounters against a fixed approach-and-spam-kick policy, Normal won 20 versus 1 baseline, and Hard won 27 versus 10 baseline. These are scenario-specific results, not win-rate guarantees against humans.

## Experimental reinforcement learning

The separate PPO pipeline, checkpoint/resume commands, evaluation and opt-in browser model are documented in [rl/README.md](rl/README.md). The default game continues to use the scripted bot.
