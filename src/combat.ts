import {chooseBotAction,BotMemory,botDecisionIntervals} from './bot';
import {hitboxes,hurtboxes,overlaps,weaponBoxes,lerpCapsule,sweptContact,ACTIVE_START,ACTIVE_END,type Capsule} from './geometry';
export type Action='idle'|'punch'|'kick'|'block'|'dodge'|'hurt'|'down';
export interface Fighter{x:number;y:number;vy:number;jumps:number;jumpAge:number;downAge:number;jumpHeld:boolean;hp:number;energy:number;face:number;action:Action;timer:number;duration:number;hit:boolean;cooldown:number;walk:number;superMeter:number;superStage:''|'punch'|'kick'}
export interface Input{left?:boolean;right?:boolean;jump?:boolean;punch?:boolean;kick?:boolean;block?:boolean;dodge?:boolean;super?:boolean}
export class Combat{
 constructor(public random:()=>number=Math.random){}
 botController?: (self:Fighter,opponent:Fighter,combat:Combat)=>Input;
 superEnabled=true;
 botMemory=new BotMemory();
 p=this.make(350,1);b=this.make(850,-1);time=90;elapsed=0;active=false;paused=false;level=1;think=0;bot:Input={};winner='';pendingWinner='';resultDelay=0; events:{x:number;y:number;blocked:boolean;kind:'punch'|'kick'}[]=[];sounds:('dodge'|'super')[]=[];
 make(x:number,face:number):Fighter{return{x,y:0,vy:0,jumps:0,jumpAge:0,downAge:0,jumpHeld:false,hp:100,energy:100,face,action:'idle',timer:0,duration:0,hit:false,cooldown:0,walk:0,superMeter:0,superStage:''}}
 reset(){this.botMemory.reset();this.p=this.make(350,1);this.b=this.make(850,-1);this.time=90;this.elapsed=0;this.winner='';this.pendingWinner='';this.resultDelay=0;this.active=true;this.paused=false;this.bot={};this.think=0;this.events=[];this.sounds=[]}
 startSuper(f:Fighter){if(!this.superEnabled||f.superMeter<100||f.hp<=0)return;this.sounds.push('super');f.superMeter=0;f.superStage='punch';f.action='punch';f.timer=f.duration=.34;f.cooldown=.89;f.hit=false}
 advanceSuper(f:Fighter){
  const stage=f.superStage;
  if(stage==='punch'){f.superStage='kick';f.action='kick';f.timer=f.duration=.55}
  else{f.superStage='';f.action='idle';f.cooldown=0}
  f.hit=false;
 }
 attack(f:Fighter,a:Action){const cost=a==='kick'?23:a==='punch'?12:18;if(f.energy<cost||f.cooldown>0||f.action==='hurt'||f.timer>0)return;f.energy-=cost;if(a==='dodge')this.sounds.push('dodge');f.action=a;f.duration=a==='kick'?.55:a==='punch'?.34:.35;f.timer=f.duration;f.hit=false;f.cooldown=f.duration+(a==='dodge'?.12:0)}
 step(dt:number,input:Input){if(this.paused)return;dt=Math.min(dt,.035);if(this.pendingWinner){this.elapsed+=dt;for(const f of [this.p,this.b])if(f.action==='down'){f.downAge+=dt;f.y=Math.max(0,f.y-500*dt)}this.resultDelay=Math.max(0,this.resultDelay-dt);if(this.resultDelay===0){this.winner=this.pendingWinner;this.pendingWinner=''}return}if(!this.active)return;const previousP={...this.p},previousB={...this.b},previousTime=this.elapsed;this.time=Math.max(0,this.time-dt);this.elapsed+=dt;this.think-=dt;this.botMemory.observe(this.p,dt);
 if(this.think<=0){this.think=this.botController ? .1 : botDecisionIntervals[this.level];this.bot=this.botController?this.botController(this.b,this.p,this):chooseBotAction(this.b,this.p,this.level,this.random,this.botMemory);}
 this.update(this.p,this.b,input,dt);this.update(this.b,this.p,this.bot,dt);this.bot.jump=false;if(Math.abs(this.p.x-this.b.x)<58&&Math.abs(this.p.y-this.b.y)<70){const middle=(this.p.x+this.b.x)/2;this.p.x=middle-29*this.p.face;this.b.x=middle+29*this.p.face;}
 const currentP={...this.p},currentB={...this.b};
 this.resolve(this.p,this.b,previousP,previousB,previousTime,currentP,currentB);this.resolve(this.b,this.p,previousB,previousP,previousTime,currentB,currentP);
 if(this.p.hp<=0||this.b.hp<=0||this.time===0){this.active=false;this.pendingWinner=this.p.hp===this.b.hp?'draw':this.p.hp>this.b.hp?'player':'bot';this.resultDelay=1;for(const f of [this.p,this.b]){f.superStage='';if(f.hp<=0){f.action='down';f.downAge=0;f.jumps=0;f.vy=0}else{f.action='idle';f.timer=0}}}}
 update(f:Fighter,o:Fighter,i:Input,dt:number){f.face=o.x>f.x?1:-1;f.timer=Math.max(0,f.timer-dt);f.cooldown=Math.max(0,f.cooldown-dt);f.energy=Math.min(100,f.energy+dt*(f.action==='block'?7:19));if(f.timer===0){if(f.superStage)this.advanceSuper(f);else f.action='idle';}if(i.super)this.startSuper(f);if(f.action==='idle'){if(i.block)f.action='block';else if(i.dodge)this.attack(f,'dodge');else if(i.kick)this.attack(f,'kick');else if(i.punch)this.attack(f,'punch');}
 if(i.jump&&!f.jumpHeld&&f.jumps<2&&f.action!=='hurt'&&!f.superStage){f.vy=530;f.y=Math.max(.1,f.y);f.jumps++;f.jumpAge=0}f.jumpHeld=!!i.jump;
 const move=(i.right?1:0)-(i.left?1:0);if(f.action==='idle'){f.x+=move*225*dt;f.walk+=Math.abs(move)*dt*11}else if(f.action==='dodge')f.x-=f.face*340*dt;
 if(f.superStage==='punch'&&f.timer>.17)f.x+=f.face*360*dt;
 f.x=Math.max(95,Math.min(1105,f.x));if(f.y>0){f.jumpAge+=dt;f.vy-=1200*dt;f.y=Math.max(0,f.y+f.vy*dt);if(f.y===0){f.vy=0;f.jumps=0}}}
 resolve(f:Fighter,o:Fighter,previousF?:Fighter,previousO?:Fighter,previousTime=this.elapsed,currentF=f,currentO=o){
 const targets=hurtboxes(currentO,this.elapsed);let box:Capsule|null=hitboxes(currentF,this.elapsed).find(a=>targets.some(b=>overlaps(a,b)))??null;let kind=currentF.action;
 if(previousF&&previousO&&['punch','kick'].includes(previousF.action)&&!previousF.hit&&!f.hit&&currentF.timer<=previousF.timer){
  kind=previousF.action;
  // Clip to the active portion, including frames that cross its start or end.
  const elapsed=this.elapsed-previousTime;
  const fromPhase=previousF.timer/previousF.duration;
  const toPhase=(previousF.timer-elapsed)/previousF.duration;
  const span=fromPhase-toPhase;
  const start=span>0?Math.max(0,(fromPhase-ACTIVE_START)/span):0;
  const end=span>0?Math.min(1,(fromPhase-ACTIVE_END)/span):1;
  box=null;
  if(start<=end&&start<=1&&end>=0&&fromPhase>=ACTIVE_END&&toPhase<=ACTIVE_START){
   const endF={...currentF,action:previousF.action,duration:previousF.duration,timer:Math.max(0,previousF.timer-elapsed)};
   const a0=weaponBoxes(previousF,previousTime),a1=weaponBoxes(endF,this.elapsed);
   const b0=hurtboxes(previousO,previousTime),b1=hurtboxes(currentO,this.elapsed);
   let first=Infinity;
   for(let j=0;j<a0.length;j++)for(let i=0;i<b0.length;i++){
    const contact=sweptContact(lerpCapsule(a0[j],a1[j],start),lerpCapsule(a0[j],a1[j],end),lerpCapsule(b0[i],b1[i],start),lerpCapsule(b0[i],b1[i],end));
    if(contact!==null){const at=start+(end-start)*contact;if(at<first){first=at;box=lerpCapsule(a0[j],a1[j],at)}}
   }

  }
 }
 if(!box||f.hit)return;
 f.hit=true;const blocked=currentO.action==='block'&&o.energy>=8;const damage=kind==='kick'?15:f.superStage==='punch'?10:9;
 o.hp=Math.max(0,o.hp-(blocked?damage*.15:damage));o.energy=Math.max(0,o.energy-(blocked?10:0));
 if(this.superEnabled){if(!f.superStage)f.superMeter=Math.min(100,(f.superMeter??0)+(blocked?damage*.15:damage)*2)}
 if(!blocked){o.superStage='';o.action='hurt';o.timer=.22;o.duration=.22;o.x=Math.max(95,Math.min(1105,o.x+currentF.face*22))}
 this.events.push({x:box.a.x,y:box.a.y,blocked,kind:kind==='kick'?'kick':'punch'});
 }
}
