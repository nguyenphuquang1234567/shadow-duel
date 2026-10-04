import type {Fighter,Input} from './combat';
import {ACTIVE_END} from './geometry';
/** Adjust attack range using the same movement speed as the player. */
function attackMovement(bot:Fighter,opponent:Fighter,attack:'punch'|'kick',level:number,random:()=>number):Input{
 const dx=opponent.x-bot.x,d=Math.abs(dx),target=attack==='punch'?80:110;
 if(level===0&&random()>.45)return{};
 if(d>target+10)return{left:dx<0,right:dx>0};
 if(level>0&&d<target-25){
  const room=dx>0?bot.x-95:1105-bot.x;
  if(room>15)return{left:dx>0,right:dx<0};
 }
 return{};
}
/** Reads visible opponent state only; jump requests are one-frame pulses. */
function chooseEasyAction(bot:Fighter,opponent:Fighter,level:number,random= Math.random):Input{
 const dx=opponent.x-bot.x,distance=Math.abs(dx),near=distance<145;
 const action:Input={left:dx<0&&!near,right:dx>0&&!near};
 if(bot.action==='hurt')return action;
 if(bot.action==='punch'||bot.action==='kick')return attackMovement(bot,opponent,bot.action,0,random);
 const attacking=['punch','kick'].includes(opponent.action)&&!opponent.hit&&opponent.timer/opponent.duration>=ACTIVE_END;
 const threatened=attacking&&distance<(opponent.action==='kick'?175:135)&&Math.abs(bot.y-opponent.y)<90;
 const canJump=bot.jumps<2&&!bot.jumpHeld;
 // First jump avoids a visible attack. Reserve the second until falling or
 // facing an opponent at the same height; don't spend it if already safely above.
 const evasiveJump=canJump&&threatened&&(bot.y===0||(bot.jumps===1&&(bot.vy<80||opponent.y>bot.y+20)));
 const chaseJump=canJump&&bot.y===0&&distance>170&&distance<330&&opponent.y>45;
 if((evasiveJump&&random()<[.3,.65,.9][level])||(chaseJump&&random()<[.15,.45,.75][level])){
  action.jump=true;return action;
 }
 action.block=threatened&&random()<[.25,.55,.8][level];
 action.dodge=threatened&&!action.block&&random()<.15;
 // Attack in the air only when within reach of the opponent's height.
 if(near&&Math.abs(bot.y-opponent.y)<85&&!action.block&&!action.dodge){
  action.kick=random()<.55;action.punch=!action.kick&&random()<.6;
  if(action.kick||action.punch)Object.assign(action,attackMovement(bot,opponent,action.kick?'kick':'punch',0,random));
 }
 return action;
}

export const botDecisionIntervals=[.42,.12,.065] as const;
export class BotMemory {
 punches=0;kicks=0;recovering=false;
 private action='idle';private timer=0;
 observe(opponent:Fighter,dt:number){
  this.punches*=Math.exp(-dt/5);this.kicks*=Math.exp(-dt/5);
  if(['punch','kick'].includes(opponent.action)&&(opponent.action!==this.action||opponent.timer>this.timer+.001)){
   if(opponent.action==='punch')this.punches++;else this.kicks++;
  }
  this.action=opponent.action;this.timer=opponent.timer;
 }
 reset(){this.punches=0;this.kicks=0;this.recovering=false;this.action='idle';this.timer=0}
}
type Choice={input:Input;weight:number};
function sample(choices:Choice[],random:()=>number):Input{
 const total=choices.reduce((sum,c)=>sum+c.weight,0);let n=random()*total;
 for(const c of choices){n-=c.weight;if(n<0)return c.input}return choices.at(-1)?.input??{};
}
/** Normal/Hard use weighted random legal choices, never a single best score. */
export function chooseBotAction(bot:Fighter,opponent:Fighter,level:number,random=Math.random,memory?:BotMemory):Input{
 const superDistance=Math.abs(bot.x-opponent.x),superHeight=Math.abs(bot.y-opponent.y);
 if(bot.hp>0&&bot.superMeter>=100&&superHeight<60){
  const opening=opponent.action==='hurt'||(['punch','kick'].includes(opponent.action)&&(opponent.hit||opponent.timer/opponent.duration<ACTIVE_END));
  if(superDistance<[145,170,185][level]&&random()<(opening?[.55,.85,.98][level]:[.12,.25,.4][level]))return{super:true,...attackMovement(bot,opponent,'punch',level,random)};
 }
 if(bot.superStage)return attackMovement(bot,opponent,bot.superStage,level,random);
 if(level===0)return chooseEasyAction(bot,opponent,0,random);
 if(bot.hp<=0||bot.action==='down'||bot.action==='hurt')return{};
 if(bot.action==='punch'||bot.action==='kick')return attackMovement(bot,opponent,bot.action,level,random);
 if(bot.action==='dodge'||bot.cooldown>0)return{};
 const hard=level===2,dx=opponent.x-bot.x,d=Math.abs(dx),height=Math.abs(bot.y-opponent.y);
 const toward:Input={left:dx<0,right:dx>0},away:Input={left:dx>0,right:dx<0};
 const room=dx>0?bot.x-95:1105-bot.x;
 const attacking=['punch','kick'].includes(opponent.action)&&!opponent.hit&&opponent.timer/opponent.duration>=ACTIVE_END;
 const threat=attacking&&d<(opponent.action==='kick'?175:135)&&height<90;
 const jumpLegal=bot.jumps<2&&!bot.jumpHeld;
 const evasiveJump=jumpLegal&&(bot.y===0||(bot.jumps===1&&(bot.vy<80||opponent.y>bot.y+20)));
 if(threat){
  const repeated=opponent.action==='kick'?(memory?.kicks??0):(memory?.punches??0);
  const defend=Math.min(.99,(hard?.98:.92)+Math.min(.05,repeated*.012));
  if(random()<defend){
   const choices:Choice[]=[];
   if(evasiveJump)choices.push({input:{jump:true},weight:opponent.action==='kick'?3:1.5});
   if(bot.energy>=10)choices.push({input:{block:true},weight:room<40?6:3});
   const escape=Math.min(119,room);
   if(bot.energy>=18&&escape>45&&d+escape>180)choices.push({input:{dodge:true},weight:hard?3:2});
   if(choices.length)return sample(choices,random);
  }
 }
 if(memory){if(bot.energy<(hard?28:22))memory.recovering=true;if(bot.energy>=(hard?58:48))memory.recovering=false}
 const recovering=memory?.recovering??bot.energy<25;
 if(recovering){if(room>12)return away;return threat&&bot.energy>=10?{block:true}:{}}
 // Close down an opponent's recovery window instead of waiting outside range.
 const opening=opponent.cooldown>0&&!attacking;
 if(jumpLegal&&bot.y===0&&opponent.y>45&&d>150&&d<310&&random()<(hard?.85:.60))return{...toward,jump:true};
 if(height>85){
  return d>105?toward:{};
 }
 if(d>145)return toward;
 const choices:Choice[]=[];
 const reserve=hard?18:16;
 if(d<112&&bot.energy>=12+reserve)choices.push({input:{punch:true},weight:d<85?5:3});
 if(d<145&&bot.energy>=23+reserve)choices.push({input:{kick:true},weight:d>95?5:2});
 if(!choices.length){if(d>=112&&bot.energy>=12+reserve)return toward;return room>12?away:{}}
 // Less idle time in a punish opportunity, while retaining attack variety.
 const aggression=opening?(hard?.99:.98):(hard?.95:.90);
 if(random()<aggression){const input=sample(choices,random);return{...input,...attackMovement(bot,opponent,input.kick?'kick':'punch',level,random)}}
 return d<70&&room>12?away:{};
}
