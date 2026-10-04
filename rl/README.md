# PPO training for Shadow Duel

This branch trains a CPU neural-network policy with Stable-Baselines3 PPO. Python talks to a persistent Node process running the **same `Combat` and swept hitbox/hurtbox geometry as the browser**. No Phaser rendering or sound is needed during training.

## Setup and run

From the repository root (Node/npm and `uv` required):

```sh
npm install
node rl/build.mjs
uv venv --python python3.13 .venv-rl
uv pip install --python .venv-rl/bin/python -r rl/requirements.txt
.venv-rl/bin/python rl/train.py --steps 100000 --run rl/runs/ppo
```

Default: four environments, one CPU PyTorch thread, randomized starting side/distance, equal sampling of easy/medium/hard scripted opponents. Observations contain 59 normalized numbers: both fighters' position, velocity, health, stamina, action/timers, jump state, relative distance, time, available room, and both Super meters/combo stages. The policy chooses among 13 actions every 0.1 simulated seconds, including movement combined with jump or attack, and Super. Jump presses release between decisions, allowing double jumps.

Reward: damage dealt minus damage received, divided by 100; terminal win +2, loss -2, draw 0. KO ends the episode; the 90-second limit truncates it, with outcome decided by remaining HP. There is no bonus for useless jumping, stamina spending or standing nearby. Rewards are a starting design to measure and tune, not a guarantee of a good fighting style.

Every 5,000 transitions saves a checkpoint; every 10,000 evaluates five episodes against the hard bot with a separate seed stream and saves the best average-reward policy. `last.zip` includes weights and optimizer state. `progress.csv` records learning metrics. Ctrl-C saves the current model. Runs, virtual environment and model artifacts are ignored by Git.

```sh
# Resume; --steps adds training transitions, rounded up to complete PPO rollouts.
.venv-rl/bin/python rl/train.py --resume rl/runs/ppo/last.zip --steps 100000 --run rl/runs/ppo
# Separate held-out evaluation, never used to select the best checkpoint.
.venv-rl/bin/python rl/evaluate.py rl/runs/ppo/best/best_model.zip --episodes 50
# Compare a random policy on the same evaluation seeds.
.venv-rl/bin/python rl/evaluate.py unused --random --episodes 50
```

For an unattended local run, this command keeps macOS awake while training. It was **not started automatically**:

```sh
caffeinate -i .venv-rl/bin/python rl/train.py --steps 2000000 --run rl/runs/overnight
```

## Play against the trained bot

Run `npm run dev`, then open `http://localhost:5173/`. The menu has a separate **Thử thách AI → Bot AI đã luyện** section below Dễ/Vừa/Khó. Select it, wait for Sẵn sàng, and start the match. Selecting a regular difficulty restores the scripted bot. `?rl=1` preselects the trained bot.

The bundled `public/models/ppo-best.json` is the best checkpoint from the 1,000,448-transition run (selected at 1,000,000 transitions with Super enabled). Its held-out evaluation won 30/30 games per scripted difficulty. This is not a human-player benchmark. The adjacent metadata file records checkpoint selection, results and the policy SHA-256. Only the exported actor and metadata are committed, not Python training checkpoints.

To replace this local artifact after a new run:

```sh
.venv-rl/bin/python rl/export.py rl/runs/ppo/best/best_model.zip public/models/ppo-best.json
```

Reload after exporting; update the metadata for the replacement. The browser uses deterministic argmax actions. Failed downloads block AI match start and let the player retry or select a regular mode. Only load trusted SB3 checkpoint files.

## Verification and current result

```sh
.venv-rl/bin/python rl/train.py --steps 2048 --run rl/runs/super-smoke --checkpoint-every 1024 --eval-every 2048
.venv-rl/bin/python rl/verify.py
.venv-rl/bin/python rl/evaluate.py rl/runs/super-smoke/last.zip --episodes 3
npm run build
npx playwright test
```

Initial smoke run: environment checker passed; 2,048 transitions trained and saved checkpoints; 73 sampled JavaScript actions matched the Python actor exactly; fixed-seed simulations matched. Held-out policy evaluation lost all nine games (three per difficulty). **This demonstrates a working training pipeline, not a stronger bot.** Train longer and measure enough held-out games before replacing the main bot. `verify.py` expects the smoke artifact above.

Training currently measures improvement against scripted opponents. Self-play, opponent pools, recurrent policies and automatic difficulty calibration are future work. Starting positions vary during training; browser matches retain their normal positions. No overnight job, merge or deployment is started by this branch.

## References

- [Stable-Baselines3 custom environments](https://stable-baselines3.readthedocs.io/en/master/guide/custom_env.html)
- [Stable-Baselines3 PPO](https://stable-baselines3.readthedocs.io/en/master/modules/ppo.html)
- Workflow guidance: Kassis et al. (2026), *Scientific Agent Skills: A Library of Procedural Knowledge for Research Agents*, [doi:10.48550/arXiv.2609.00065](https://doi.org/10.48550/arXiv.2609.00065), via the [Stable-Baselines3 skill](https://github.com/K-Dense-AI/scientific-agent-skills/blob/main/skills/stable-baselines3/SKILL.md).

## Super training (schema 2)

This branch trains a fresh 59-input / 13-action actor with the new Super rules. Super can cancel any current action while the fighter is alive, including airborne actions. Charge comes only from actual damage dealt, not damage received; Super cannot recharge itself. Rewards remain damage difference plus the outcome bonus, with no artificial bonus for pressing Super. Scripted opponents may also use Super.

Schema-1 checkpoints (53 inputs / 12 actions) cannot resume into this environment. They remain usable by the browser with Super disabled. Schema-2 policies enable Super for both sides. Keep the original checkpoint archives for comparison.

```sh
node rl/build.mjs
.venv-rl/bin/python rl/train.py --steps 1000000 --run rl/runs/ppo-super-million
.venv-rl/bin/python rl/evaluate.py rl/runs/ppo-super-million/best/best_model.zip --episodes 30 --seed 300000
.venv-rl/bin/python rl/verify.py --model rl/runs/ppo-super-million/best/best_model.zip
```

The best Super actor is exported separately as `public/models/ppo-super-best.json`; it is also installed as the default `ppo-best.json` actor. Evaluation reports Super activations and episodes using Super in addition to wins.

Completed Super run: 1,000,448 transitions, seed 42, four environments, 129.74 seconds. The best actor won all 90 held-out matches (30 per difficulty, deterministic actions, seeds 300000–300029), using Super once per match. This single training seed and scripted-opponent benchmark do not establish strength against people or different opponents. Export parity matched 73 Python/JavaScript decisions. Training checkpoints remain local in `rl/runs/ppo-super-million`; the separate actor and metadata are committed for review. The bundled default `ppo-best.json` now uses this Super model. The Scientific Agent Skills reference above documents the skill used for this run.

## 200 HP and immediate attack chaining

The default actor now uses the best checkpoint from `rl/runs/ppo-200hp-fast`, continuing the Super actor for 1,000,448 additional transitions (2,000,448 total). Both fighters have 200 HP; punches and kicks have no extra post-animation delay. Health observations are normalized by maximum HP. The selected actor won 30/30 held-out games at each scripted difficulty on seeds 400000-400029, compared with 30/30, 26/30 and 19/30 wins for the previous actor on the same new rules and seeds. Python/browser argmax parity passed for 73 observations. This measures scripted opponents, not human strength. Checkpoints remain local; the exported actor and matching metadata are bundled.

## Moving attacks

Normal punches/kicks now permit horizontal movement at 112.5 units/s (half walking speed), keeping the attack pose and unchanged walk-animation phase. Super keeps its existing rush. Easy sometimes approaches while attacking; medium/hard approach or retreat to maintain attack range, including during active attacks. PPO retains its 59-input/13-action schema and learns with the same Combat rules, including toward-plus-attack actions. Continued the previous best for 1,000,448 more transitions in `rl/runs/ppo-moving-attacks`; installed the best checkpoint selected by five hard-bot validation episodes. On 30 held-out episodes per difficulty (seed 500000), both the previous and new actor won 90/90 overall. Mean rewards are close; these results do not show a clear strength improvement. Export parity passed 73 decisions. Matching metadata records both evaluations and training rules.
