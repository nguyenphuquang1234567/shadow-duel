import type {Combat,Fighter,Input} from './combat';
export const RL_VERSION=1;
const actions=['idle','punch','kick','block','dodge','hurt','down'];
export const actionNames=['idle','toward','away','punch','kick','block','dodge','jump','toward-jump','away-jump','toward-punch','toward-kick'] as const;
const clip=(x:number)=>Math.max(-1,Math.min(1,x));
export function observation(self:Fighter,other:Fighter,combat:Combat):number[]{
 const vector=(f:Fighter)=>[
  (f.x-600)/600,f.y/600,f.vy/600,f.face,f.hp/100,f.energy/100,f.jumps/2,+f.jumpHeld,
  f.timer,f.duration,f.cooldown,+f.hit,f.jumpAge/2,f.downAge/2,Math.sin(f.walk),Math.cos(f.walk),
  ...actions.map(a=>+(f.action===a)),
 ];
 return [...vector(self),...vector(other),(other.x-self.x)/1200,(other.y-self.y)/600,combat.time/90,Math.sin(combat.elapsed*3),
 Math.cos(combat.elapsed*3),(self.x-95)/1010,(1105-self.x)/1010].map(clip);
}
export const observationSize=53;
export function actionInput(action:number,self:Fighter,other:Fighter):Input{
 const toward={left:other.x<self.x,right:other.x>=self.x},away={left:other.x>=self.x,right:other.x<self.x};
 switch(action){case 1:return toward;case 2:return away;case 3:return{punch:true};case 4:return{kick:true};case 5:return{block:true};case 6:return{dodge:true};case 7:return{jump:true};case 8:return{...toward,jump:true};case 9:return{...away,jump:true};case 10:return{...toward,punch:true};case 11:return{...toward,kick:true};default:return{}}
}
export interface PolicyData{version:number;observationSize:number;actionNames:string[];layers:{weight:number[][];bias:number[];activation:'tanh'|'linear'}[]}
export function policyAction(data:PolicyData,obs:number[]):number{
 if(data.version!==RL_VERSION||data.observationSize!==obs.length||data.actionNames.join('|')!==actionNames.join('|'))throw new Error('RL policy schema mismatch');
 if(!data.layers?.length)throw new Error('Empty RL policy');
 let values=obs;
 for(const layer of data.layers){
  if(!['tanh','linear'].includes(layer.activation)||layer.bias.length!==layer.weight.length||!layer.weight.length||layer.weight.some(row=>row.length!==values.length||row.some(w=>!Number.isFinite(w)))||layer.bias.some(b=>!Number.isFinite(b)))throw new Error('Invalid RL layer');
  values=layer.weight.map((row,i)=>{const v=row.reduce((s,w,j)=>s+w*values[j],layer.bias[i]);return layer.activation==='tanh'?Math.tanh(v):v})}
 if(values.length!==actionNames.length)throw new Error('Invalid RL action output');
 return values.indexOf(Math.max(...values));
}
