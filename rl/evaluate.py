"""Evaluate on fixed seeds separate from training/checkpoint selection."""
import argparse
import json
from stable_baselines3 import PPO
from env import DuelEnv
parser = argparse.ArgumentParser()
parser.add_argument('model')
parser.add_argument('--episodes', type=int, default=20)
parser.add_argument('--seed', type=int, default=200_000)
parser.add_argument('--random', action='store_true')
args = parser.parse_args()
if args.episodes < 1:
    parser.error('episodes must be positive')
model = None if args.random else PPO.load(args.model, device='cpu')
results = []
for level in range(3):
    env = DuelEnv(level)
    counts = {'win':0,'loss':0,'draw':0}
    rewards = []; super_uses = []
    try:
        for episode in range(args.episodes):
            obs, _ = env.reset(seed=args.seed+episode)
            env.action_space.seed(args.seed+episode)
            total = 0
            while True:
                action = env.action_space.sample() if model is None else model.predict(obs, deterministic=True)[0]
                obs, reward, terminated, truncated, info = env.step(action)
                total += reward
                if terminated or truncated:
                    counts[info['outcome']] += 1
                    rewards.append(total)
                    super_uses.append(info.get('super_uses',0))
                    break
        results.append({'level':level,**counts,'win_rate':counts['win']/args.episodes,'mean_reward':sum(rewards)/len(rewards),'super_uses':sum(super_uses),'episodes_using_super':sum(n>0 for n in super_uses)})
    finally:
        env.close()
print(json.dumps(results, indent=2))
