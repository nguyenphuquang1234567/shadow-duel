"""Gymnasium adapter to the game's actual TypeScript combat simulation."""
import json
import subprocess
from pathlib import Path
import gymnasium as gym
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
ACTIONS = ['idle','toward','away','punch','kick','block','dodge','jump','toward-jump','away-jump','toward-punch','toward-kick']
class DuelEnv(gym.Env):
    metadata = {'render_modes': []}
    def __init__(self, level=None):
        super().__init__()
        self.level = level
        self.observation_space = gym.spaces.Box(-1, 1, (53,), dtype=np.float32)
        self.action_space = gym.spaces.Discrete(len(ACTIONS))
        bridge = ROOT / 'rl/dist/server.mjs'
        if not bridge.exists():
            raise RuntimeError('Run node rl/build.mjs first')
        self.process = subprocess.Popen(['node', str(bridge)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)
    def request(self, data):
        self.process.stdin.write(json.dumps(data)+'\n')
        self.process.stdin.flush()
        line = self.process.stdout.readline()
        if not line:
            raise RuntimeError('Combat bridge stopped')
        result = json.loads(line)
        if 'error' in result:
            raise RuntimeError(result['error'])
        if result['version'] != 1 or result['actions'] != ACTIONS or result['observationSize'] != 53:
            raise RuntimeError('Combat schema mismatch')
        return result
    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        level = (options or {}).get('level', self.level)
        if level is None:
            level = int(self.np_random.integers(0, 3))
        result = self.request({'cmd':'reset','seed':int(self.np_random.integers(1, 2**32)), 'level':level})
        return np.asarray(result['observation'], dtype=np.float32), result['info']
    def step(self, action):
        result = self.request({'cmd':'step','action':int(action)})
        return np.asarray(result['observation'], dtype=np.float32), float(result['reward']), result['terminated'], result['truncated'], result['info']
    def close(self):
        if self.process.poll() is None:
            self.process.stdin.close()
            try:
                self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
        self.process.stdout.close()
