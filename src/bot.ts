import type {Fighter,Input} from './combat';
import {ACTIVE_END} from './geometry';
/** Reads visible opponent state only; jump requests are one-frame pulses. */
export function chooseBotAction(bot:Fighter,opponent:Fighter,level:number,random= Math.random):Input{
 const dx=opponent.x-bot.x,distance=Math.abs(dx),near=distance<145;
 const action:Input={left:dx<0&&!near,right:dx>0&&!near};
 if(bot.action==='hurt')return action;
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
 }
 return action;
}
