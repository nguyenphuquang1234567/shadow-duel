"""CPU PPO training. Ctrl-C saves the current model for resuming."""
import argparse
import json
import time
from pathlib import Path
import torch
from stable_baselines3 import PPO
from stable_baselines3.common.env_checker import check_env
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import DummyVecEnv
from stable_baselines3.common.callbacks import EvalCallback, CheckpointCallback, CallbackList
from stable_baselines3.common.logger import configure
from env import DuelEnv
from export import export

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--steps', type=int, default=100_000)
    parser.add_argument('--envs', type=int, default=4)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--run', default='rl/runs/ppo')
    parser.add_argument('--resume')
    parser.add_argument('--eval-every', type=int, default=10_000)
    parser.add_argument('--checkpoint-every', type=int, default=5_000)
    args = parser.parse_args()
    if min(args.steps,args.envs,args.eval_every,args.checkpoint_every) < 1:
        parser.error('Counts must be positive')
    torch.set_num_threads(1)
    run = Path(args.run)
    run.mkdir(parents=True, exist_ok=True)
    probe = DuelEnv()
    try:
        check_env(probe)
    finally:
        probe.close()
    env = DummyVecEnv([lambda: Monitor(DuelEnv()) for _ in range(args.envs)])
    evaluation = DummyVecEnv([lambda: Monitor(DuelEnv(level=2))])
    env.seed(args.seed)
    evaluation.seed(args.seed+10_000)
    start = time.monotonic()
    model = None
    interrupted = False
    try:
        model = PPO.load(args.resume, env=env, device='cpu') if args.resume else PPO('MlpPolicy', env, device='cpu', seed=args.seed, n_steps=128, batch_size=64, n_epochs=4, ent_coef=.01, policy_kwargs={'net_arch':dict(pi=[64,64],vf=[64,64])}, verbose=1)
        model.set_logger(configure(str(run), ['stdout','csv']))
        callbacks = CallbackList([
            CheckpointCallback(save_freq=max(1,args.checkpoint_every//args.envs), save_path=str(run/'checkpoints'), name_prefix='ppo'),
            EvalCallback(evaluation, best_model_save_path=str(run/'best'), log_path=str(run/'eval'), eval_freq=max(1,args.eval_every//args.envs), n_eval_episodes=5, deterministic=True),
        ])
        try:
            model.learn(total_timesteps=args.steps, callback=callbacks, reset_num_timesteps=not bool(args.resume))
        except KeyboardInterrupt:
            interrupted = True
        model.save(run/'last')
        export(model, run/'policy.json')
        (run/'summary.json').write_text(json.dumps({'timesteps':model.num_timesteps,'seed':args.seed,'seconds':time.monotonic()-start,'interrupted':interrupted,'schema':1,'opponents':[0,1,2]}, indent=2))
    finally:
        env.close()
        evaluation.close()
    print(f'Saved {run}/last.zip and policy.json')
if __name__ == '__main__':
    main()
