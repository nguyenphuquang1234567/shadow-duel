"""Integration checks for determinism, checkpoints and browser actor parity."""
import json
import subprocess
import numpy as np
from stable_baselines3 import PPO
from env import DuelEnv, ROOT
from export import export

a,b = DuelEnv(),DuelEnv()
try:
    oa,_ = a.reset(seed=123)
    ob,_ = b.reset(seed=123)
    np.testing.assert_array_equal(oa,ob)
    samples = [oa.tolist()]
    for action in [7,7,7,1,3,4,5,6,0]*8:
        ra,rb = a.step(action),b.step(action)
        np.testing.assert_array_equal(ra[0],rb[0])
        assert ra[1:] == rb[1:]
        samples.append(ra[0].tolist())
        if ra[2] or ra[3]:
            a.reset(seed=123); b.reset(seed=123)
    model = PPO.load(ROOT/'rl/runs/smoke/last.zip', device='cpu')
    destination = export(model, ROOT/'rl/runs/smoke/policy.json')
    expected = [int(model.predict(np.asarray(obs,np.float32),deterministic=True)[0]) for obs in samples]
    script = "import fs from 'node:fs';import {policyAction} from './rl/dist/policy.mjs';const d=JSON.parse(fs.readFileSync(process.argv[1]));const s=JSON.parse(fs.readFileSync(0,'utf8'));console.log(JSON.stringify(s.map(o=>policyAction(d,o))));"
    actual = json.loads(subprocess.check_output(['node','--input-type=module','-e',script,str(destination)],input=json.dumps(samples),text=True,cwd=ROOT))
    assert actual == expected
    print(f'PASS: deterministic simulation and {len(samples)} Python/browser policy actions match')
finally:
    a.close();b.close()
