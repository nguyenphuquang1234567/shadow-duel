import {createInterface} from 'node:readline';
import {Combat} from '../src/combat';
import {observation,observationSize,actionInput,actionNames,RL_VERSION} from '../src/rl';
let rngState=1;
const random=()=>{rngState=(Math.imul(rngState,1664525)+1013904223)>>>0;return rngState/4294967296};
let sim=new Combat(random),steps=0,done=true,superUses=0;
const frames=6,dt=1/60;
function status(){return {observation:observation(sim.p,sim.b,sim),version:RL_VERSION,observationSize,actions:actionNames,seedState:rngState}}
const lines=createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of lines){
 try{
  const request=JSON.parse(line);let response:unknown;
  if(request.cmd==='reset'){
   rngState=(Number(request.seed)>>>0)||1;sim=new Combat(random);sim.reset();steps=0;done=false;superUses=0;
   sim.level=request.level??1;if(![0,1,2].includes(sim.level))throw new Error('Invalid difficulty');
   // Train with both starting sides and varied spacing, but unchanged rules.
   const gap=120+random()*320,center=350+random()*500,face=random()<.5?1:-1;
   sim.p.x=Math.max(95,Math.min(1105,center-face*gap/2));sim.b.x=Math.max(95,Math.min(1105,center+face*gap/2));sim.p.face=face;sim.b.face=-face;
   response={...status(),info:{level:sim.level}};
  }else if(request.cmd==='step'){
   if(done)throw new Error('Episode finished: reset required');
   const action=Number(request.action);if(!Number.isInteger(action)||action<0||action>=actionNames.length)throw new Error('Invalid action');
   const beforeP=sim.p.hp,beforeB=sim.b.hp;
   if(action===12&&sim.p.superMeter>=100)superUses++;
   for(let i=0;i<frames&&sim.active;i++){
    const input=actionInput(action,sim.p,sim.b);
    // One press followed by release: consecutive jump decisions can double-jump.
    input.jump=!!input.jump&&i===0;sim.step(dt,input);sim.events.length=0;sim.sounds.length=0;
   }
   steps++;
   const terminated=sim.p.hp<=0||sim.b.hp<=0;
   const truncated=!terminated&&sim.time<=0;
   done=terminated||truncated;
   const outcome=done?(sim.p.hp===sim.b.hp?'draw':sim.p.hp>sim.b.hp?'win':'loss'):null;
   // Dense damage signal plus a stronger terminal outcome. No reward for jumping,
   // spending stamina, proximity, or a block animation without avoiding damage.
   const reward=((beforeB-sim.b.hp)-(beforeP-sim.p.hp))/100+(outcome==='win'?2:outcome==='loss'?-2:0);
   response={...status(),reward,terminated,truncated,info:{outcome,agent_hp:sim.p.hp,opponent_hp:sim.b.hp,steps,level:sim.level,super_uses:superUses},state:request.state?{p:sim.p,b:sim.b,time:sim.time}:undefined};
  }else if(request.cmd==='state')response={...status(),p:sim.p,b:sim.b,time:sim.time};
  else throw new Error('Unknown command');
  process.stdout.write(JSON.stringify(response)+'\n');
 }catch(error){process.stdout.write(JSON.stringify({error:String(error)})+'\n')}
}
