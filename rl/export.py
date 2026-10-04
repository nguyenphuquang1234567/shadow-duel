"""Export the PPO actor to the small dense network used by the browser."""
import argparse
import json
from pathlib import Path
import torch
from stable_baselines3 import PPO
from env import ACTIONS

def export(model, destination):
    layers = []
    for module in model.policy.mlp_extractor.policy_net:
        if isinstance(module, torch.nn.Linear):
            layers.append({'weight':module.weight.detach().cpu().tolist(), 'bias':module.bias.detach().cpu().tolist(), 'activation':'linear'})
        elif isinstance(module, torch.nn.Tanh):
            layers[-1]['activation'] = 'tanh'
        else:
            raise ValueError(f'Unsupported actor layer {module}')
    module = model.policy.action_net
    layers.append({'weight':module.weight.detach().cpu().tolist(), 'bias':module.bias.detach().cpu().tolist(), 'activation':'linear'})
    size = model.observation_space.shape[0]
    legacy = size == 53 and model.action_space.n == 12
    if not legacy and (size != 59 or model.action_space.n != 13):
        raise ValueError('Unsupported combat model schema')
    data = {'version':1 if legacy else 2,'observationSize':size,'actionNames':ACTIONS[:-1] if legacy else ACTIONS,'layers':layers}
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(data))
    return destination
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('model')
    parser.add_argument('output')
    args = parser.parse_args()
    export(PPO.load(args.model, device='cpu'), args.output)
