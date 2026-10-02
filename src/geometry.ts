import type { Fighter } from './combat';
export const ACTIVE_START = .9;
export const ACTIVE_END = .18;
export interface Point {x:number;y:number}
export interface Capsule {a:Point;b:Point;r:number;part:string}
export function pose(f:Fighter,t:number){
 const x=f.x,y=443-f.y,phase=f.timer/f.duration||0;
 const strike=Math.sin(Math.min(1,(1-phase)*2)*Math.PI/2);
 const punch=f.action==='punch',kick=f.action==='kick',block=f.action==='block',dodge=f.action==='dodge',hurt=f.action==='hurt';
 const sway=Math.sin(t*3+f.face)*2,step=Math.sin(f.walk)*15;
 const lean=(punch?12*strike:kick?-8*strike:dodge?-22:hurt?-12:0)*f.face;
 const hip={x,y:y-53+(dodge?20:0)},neck={x:x+lean,y:y-111+(dodge?24:sway)};
 const head={x:neck.x+f.face*3,y:neck.y-23};
 const backKnee={x:x-f.face*19-step*.35,y:y-28},backFoot={x:x-f.face*29-step,y};
 const knee=kick?{x:x+f.face*45*strike,y:y-64-25*strike}:{x:x+f.face*16+step*.3,y:y-27};
 const foot=kick?{x:x+f.face*125*strike,y:y-65-30*strike}:{x:x+f.face*29+step,y};
 const shoulder={x:neck.x,y:neck.y+8},elbow={x:neck.x-f.face*25,y:neck.y+35};
 const fist={x:neck.x+f.face*(block?24:9),y:neck.y+(block?-19:12)};
 const e2={x:neck.x+f.face*(punch?45*strike:24),y:neck.y+15};
 const h2={x:neck.x+f.face*(punch?94*strike:block?29:33),y:neck.y+(block?-25:punch?10:-3)};
 return {x,y,phase,strike,punch,kick,block,dodge,hurt,hip,neck,head,backKnee,backFoot,knee,foot,shoulder,elbow,fist,e2,h2};
}
export function hurtboxes(f:Fighter,t:number):Capsule[]{const p=pose(f,t);return[
 {a:p.head,b:p.head,r:15,part:'head'}, {a:p.hip,b:p.neck,r:12,part:'torso'},
 {a:p.hip,b:p.backKnee,r:7.5,part:'back-thigh'},{a:p.backKnee,b:p.backFoot,r:6,part:'back-shin'},
 {a:p.hip,b:p.knee,r:8,part:'front-thigh'},{a:p.knee,b:p.foot,r:6,part:'front-shin'},
 {a:p.shoulder,b:p.elbow,r:6.5,part:'back-arm'},{a:p.elbow,b:p.fist,r:5.5,part:'back-forearm'},
 {a:p.shoulder,b:p.e2,r:7,part:'front-arm'},{a:p.e2,b:p.h2,r:5.5,part:'front-forearm'},
]}
export function hitbox(f:Fighter,t:number):Capsule|null {
 if(!['punch','kick'].includes(f.action)||f.hit)return null;
 const p=pose(f,t); // Only the extended part of the animation can deal damage.
 if(p.phase>ACTIVE_START||p.phase<ACTIVE_END)return null;
 return p.punch?{a:p.h2,b:p.h2,r:8,part:'fist'}:{a:p.foot,b:{x:p.foot.x+f.face*13,y:p.foot.y-2},r:5,part:'foot'};
}
function distance(p:Point,a:Point,b:Point){const dx=b.x-a.x,dy=b.y-a.y;const length=dx*dx+dy*dy;const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
function cross(a:Point,b:Point,c:Point){return(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)}
export function overlaps(a:Capsule,b:Capsule){
 const c1=cross(a.a,a.b,b.a),c2=cross(a.a,a.b,b.b),c3=cross(b.a,b.b,a.a),c4=cross(b.a,b.b,a.b);
 if(c1*c2<0&&c3*c4<0)return true;
 return Math.min(distance(a.a,b.a,b.b),distance(a.b,b.a,b.b),distance(b.a,a.a,a.b),distance(b.b,a.a,a.b))<=a.r+b.r;
}

function capsuleDistance(a:Capsule,b:Capsule){
 const c1=cross(a.a,a.b,b.a),c2=cross(a.a,a.b,b.b),c3=cross(b.a,b.b,a.a),c4=cross(b.a,b.b,a.b);
 if(c1*c2<0&&c3*c4<0)return 0;
 return Math.min(distance(a.a,b.a,b.b),distance(a.b,b.a,b.b),distance(b.a,a.a,a.b),distance(b.b,a.a,a.b));
}
export function lerpCapsule(a:Capsule,b:Capsule,t:number):Capsule{
 const point=(p:Point,q:Point)=>({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});
 return {a:point(a.a,b.a),b:point(a.b,b.b),r:a.r+(b.r-a.r)*t,part:a.part};
}
/** Sweep both capsules along their frame-to-frame paths, at the same time.
 * Conservative advancement uses a bound on relative endpoint speed so it cannot
 * jump over a collision. Returns the first contact fraction (within .001px).
 */
export function sweptContact(a0:Capsule,a1:Capsule,b0:Capsule,b1:Capsule):number|null{
 const travel=(p:Point,q:Point)=>Math.hypot(q.x-p.x,q.y-p.y);
 const speed=Math.max(travel(a0.a,a1.a),travel(a0.b,a1.b))+Math.max(travel(b0.a,b1.a),travel(b0.b,b1.b))+Math.abs(a1.r-a0.r)+Math.abs(b1.r-b0.r);
 let t=0;
 for(let i=0;i<512;i++){
  const a=lerpCapsule(a0,a1,t),b=lerpCapsule(b0,b1,t);
  const gap=capsuleDistance(a,b)-a.r-b.r;
  if(gap<=.001)return t;
  if(speed===0)return null;
  const next=t+gap/speed;
  if(next>1)return overlaps(a1,b1)?1:null;
  t=next;
 }
 return null;
}
/** Un-gated weapon geometry used when clipping a sweep to the active window. */
export function weaponBox(f:Fighter,t:number):Capsule{
 const p=pose(f,t);
 return f.action==='punch'?{a:p.h2,b:p.h2,r:8,part:'fist'}:{a:p.foot,b:{x:p.foot.x+f.face*13,y:p.foot.y-2},r:5,part:'foot'};
}
