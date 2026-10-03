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
    data = {'version':1,'observationSize':53,'actionNames':ACTIONS,'layers':layers}
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
