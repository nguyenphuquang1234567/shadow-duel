import {hitbox,hurtboxes,overlaps} from './geometry';
export type Action='idle'|'punch'|'kick'|'block'|'dodge'|'hurt';
export interface Fighter{x:number;y:number;vy:number;hp:number;energy:number;face:number;action:Action;timer:number;duration:number;hit:boolean;cooldown:number;walk:number}
export interface Input{left?:boolean;right?:boolean;jump?:boolean;punch?:boolean;kick?:boolean;block?:boolean;dodge?:boolean}
export class Combat{
 p=this.make(350,1);b=this.make(850,-1);time=90;elapsed=0;active=false;paused=false;level=1;think=0;bot:Input={};winner=''; events:{x:number;y:number;blocked:boolean;kind:'punch'|'kick'}[]=[];sounds:'dodge'[]=[];
 make(x:number,face:number):Fighter{return{x,y:0,vy:0,hp:100,energy:100,face,action:'idle',timer:0,duration:0,hit:false,cooldown:0,walk:0}}
 reset(){this.p=this.make(350,1);this.b=this.make(850,-1);this.time=90;this.elapsed=0;this.winner='';this.active=true;this.paused=false;this.bot={};this.think=0;this.events=[];this.sounds=[]}
 attack(f:Fighter,a:Action){const cost=a==='kick'?23:a==='punch'?12:18;if(f.energy<cost||f.cooldown>0||f.action==='hurt'||f.timer>0)return;f.energy-=cost;if(a==='dodge')this.sounds.push('dodge');f.action=a;f.duration=a==='kick'?.55:a==='punch'?.34:.35;f.timer=f.duration;f.hit=false;f.cooldown=f.duration+.12}
 step(dt:number,input:Input){if(!this.active||this.paused)return;dt=Math.min(dt,.035);this.time=Math.max(0,this.time-dt);this.elapsed+=dt;this.think-=dt;const d=this.p.x-this.b.x;
 if(this.think<=0){this.think=[.42,.25,.14][this.level];const near=Math.abs(d)<145;const danger=['punch','kick'].includes(this.p.action);this.bot={left:d<0&&!near,right:d>0&&!near,block:danger&&Math.random()<[.25,.55,.8][this.level],punch:near&&Math.random()<.6,kick:near&&Math.random()<.55,dodge:danger&&Math.random()<.15,jump:Math.random()<.045};}
 this.update(this.p,this.b,input,dt);this.update(this.b,this.p,this.bot,dt);if(Math.abs(this.p.x-this.b.x)<58&&Math.abs(this.p.y-this.b.y)<70){const middle=(this.p.x+this.b.x)/2;this.p.x=middle-29*this.p.face;this.b.x=middle+29*this.p.face;}
 this.resolve(this.p,this.b);this.resolve(this.b,this.p);
 if(this.p.hp<=0||this.b.hp<=0||this.time===0){this.active=false;this.winner=this.p.hp===this.b.hp?'draw':this.p.hp>this.b.hp?'player':'bot';}}
 update(f:Fighter,o:Fighter,i:Input,dt:number){f.face=o.x>f.x?1:-1;f.timer=Math.max(0,f.timer-dt);f.cooldown=Math.max(0,f.cooldown-dt);f.energy=Math.min(100,f.energy+dt*(f.action==='block'?7:19));if(f.timer===0)f.action='idle';if(f.action==='idle'){if(i.block)f.action='block';else if(i.dodge)this.attack(f,'dodge');else if(i.kick)this.attack(f,'kick');else if(i.punch)this.attack(f,'punch');if(i.jump&&f.y===0){f.vy=530;f.y=.1}}
 const move=(i.right?1:0)-(i.left?1:0);if(f.action==='idle'){f.x+=move*225*dt;f.walk+=Math.abs(move)*dt*11}else if(f.action==='dodge')f.x-=f.face*340*dt;
 f.x=Math.max(95,Math.min(1105,f.x));if(f.y>0){f.vy-=1200*dt;f.y=Math.max(0,f.y+f.vy*dt);if(f.y===0)f.vy=0}}
 resolve(f:Fighter,o:Fighter){const box=hitbox(f,this.elapsed);if(!box||!hurtboxes(o,this.elapsed).some(h=>overlaps(box,h)))return;f.hit=true;const blocked=o.action==='block'&&o.energy>=8;const damage=f.action==='kick'?15:9;o.hp=Math.max(0,o.hp-(blocked?damage*.15:damage));o.energy=Math.max(0,o.energy-(blocked?10:0));if(!blocked){o.action='hurt';o.timer=.22;o.duration=.22;o.x=Math.max(95,Math.min(1105,o.x+f.face*22))}this.events.push({x:box.a.x,y:box.a.y,blocked,kind:f.action==='kick'?'kick':'punch'})}
}
