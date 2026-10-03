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

Default: four environments, one CPU PyTorch thread, randomized starting side/distance, equal sampling of easy/medium/hard scripted opponents. Observations contain 53 normalized numbers: both fighters' position, velocity, health, stamina, action/timers, jump state, relative distance, time and available room. The policy chooses among 12 actions every 0.1 simulated seconds, including movement combined with jump or attack. Jump presses release between decisions, allowing double jumps.

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

The bundled `public/models/ppo-best.json` is the best checkpoint from the 1,000,448-transition run (selected at 920,000 transitions). Its held-out evaluation won 30/30 games per scripted difficulty. This is not a human-player benchmark. The adjacent metadata file records checkpoint selection, results and the policy SHA-256. Only the exported actor and metadata are committed, not Python training checkpoints.

To replace this local artifact after a new run:

```sh
.venv-rl/bin/python rl/export.py rl/runs/ppo/best/best_model.zip public/models/ppo-best.json
```

Reload after exporting; update the metadata for the replacement. The browser uses deterministic argmax actions. Failed downloads block AI match start and let the player retry or select a regular mode. Only load trusted SB3 checkpoint files.

## Verification and current result

```sh
.venv-rl/bin/python rl/train.py --steps 2048 --run rl/runs/smoke --checkpoint-every 1024 --eval-every 2048
.venv-rl/bin/python rl/verify.py
.venv-rl/bin/python rl/evaluate.py rl/runs/smoke/last.zip --episodes 3
npm run build
npx playwright test
```

Initial smoke run: environment checker passed; 2,048 transitions trained and saved checkpoints; 73 sampled JavaScript actions matched the Python actor exactly; fixed-seed simulations matched. Held-out policy evaluation lost all nine games (three per difficulty). **This demonstrates a working training pipeline, not a stronger bot.** Train longer and measure enough held-out games before replacing the main bot. `verify.py` expects the smoke artifact above.

Training currently measures improvement against scripted opponents. Self-play, opponent pools, recurrent policies and automatic difficulty calibration are future work. Starting positions vary during training; browser matches retain their normal positions. No overnight job, merge or deployment is started by this branch.

## References

- [Stable-Baselines3 custom environments](https://stable-baselines3.readthedocs.io/en/master/guide/custom_env.html)
- [Stable-Baselines3 PPO](https://stable-baselines3.readthedocs.io/en/master/modules/ppo.html)
- Workflow guidance: Kassis et al. (2026), *Scientific Agent Skills: A Library of Procedural Knowledge for Research Agents*, [doi:10.48550/arXiv.2609.00065](https://doi.org/10.48550/arXiv.2609.00065), via the [Stable-Baselines3 skill](https://github.com/K-Dense-AI/scientific-agent-skills/blob/main/skills/stable-baselines3/SKILL.md).
