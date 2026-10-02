"""Deterministic procedural combat Foley; Python standard library only."""
import math, random, wave, struct, sys
from pathlib import Path
RATE=44100
OUT=Path(__file__).resolve().parents[1]/'public'/'audio'
OUT.mkdir(parents=True,exist_ok=True)

def render(name,duration,kind,seed):
    rng=random.Random(seed); samples=[]; low=0.; previous=0.; phase=0.
    for i in range(int(duration*RATE)):
        t=i/RATE; n=rng.uniform(-1,1); low+=.13*(n-low); high=n-low
        if kind in ('punch','kick'):
            heavy=kind=='kick'; freq=(48 if heavy else 65)+100*math.exp(-t*45)
            phase+=2*math.pi*freq/RATE
            body=math.sin(phase)*math.exp(-t*(15 if heavy else 23))*.65
            snap=high*math.exp(-t*100)*.5
            grit=low*math.exp(-t*28)*.65
            value=body+snap+grit
        elif kind=='block':
            value=sum(math.sin(2*math.pi*f*t)*math.exp(-t*d)*a for f,d,a in [(370,24,.25),(920,34,.2),(1743,48,.1)])+high*math.exp(-t*85)*.45+low*math.exp(-t*30)*.3
        else:
            # Soft, short air swish: sweeping low-pass noise, no impact or tone.
            progress=t/duration
            cutoff=2400-1700*progress
            alpha=1-math.exp(-2*math.pi*cutoff/RATE)
            previous+=alpha*(n-previous)
            low+=.04*(previous-low)
            envelope=math.sin(math.pi*progress)**2.5
            value=(previous-low)*envelope
        value*=min(1,t/.0015)*min(1,(duration-t)/.015)
        samples.append(value)
    target=.38 if kind=='dodge' else .82
    peak=max(abs(v) for v in samples); gain=target/max(peak,1e-9)
    data=b''.join(struct.pack('<h',round(v*gain*32767)) for v in samples)
    with wave.open(str(OUT/name),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(data)
    rms=math.sqrt(sum((v*gain)**2 for v in samples)/len(samples))
    print(f'{name}: {duration:.2f}s, mono PCM16 {RATE}Hz, peak={target:.2f}, RMS={rms:.3f}')
for args in [('punch-hit.wav',.32,'punch',71),('kick-hit.wav',.45,'kick',83),('block.wav',.30,'block',97),('dodge.wav',.20,'dodge',109)]:
    if len(sys.argv)==1 or args[2] in sys.argv[1:]:render(*args)
