import {policyObservation,actionInput,policyAction,type PolicyData} from './rl';
import {pose,hitboxes,hurtboxes,type Capsule} from './geometry';
import {CombatAudio} from './audio';
import Phaser from 'phaser';import './style.css';import {Combat,type Fighter,type Input} from './combat';
const sim=new Combat();const $=(id:string)=>document.getElementById(id)!;let debugBoxes=false;let wins=[0,0],round=1,started=false,sound=true;const held=new Set<string>();const mapping:Record<string,string>={ArrowLeft:'A',ArrowRight:'D',ArrowUp:'W',' ':'SPACE'};
let mode:'scripted'|'rl'='scripted',selection=0;
let policyPromise:Promise<PolicyData>|undefined;
function selectScripted(level:number){
 selection++;mode='scripted';sim.superEnabled=true;sim.level=level;sim.botController=undefined;sim.think=0;sim.bot={};
 document.title='Shadow Duel — Đấu với bóng tối';
 document.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(b=>b.classList.toggle('active',Number(b.dataset.level)===level));
 $('rl-mode').classList.remove('active');$('rl-mode').setAttribute('aria-pressed','false');
 $('rl-status').textContent='Đấu với model tốt nhất sau 1 triệu bước luyện tập.';
 ($('start') as HTMLButtonElement).disabled=false;
}
async function selectRL(){
 const ticket=++selection;mode='rl';sim.superEnabled=false;sim.botController=undefined;
 document.querySelectorAll('[data-level]').forEach(b=>b.classList.remove('active'));
 $('rl-mode').classList.add('active');$('rl-mode').setAttribute('aria-pressed','true');
 $('rl-status').textContent='Đang tải bot AI…';($('start') as HTMLButtonElement).disabled=true;
 try{
  policyPromise??=fetch('/models/ppo-best.json').then(r=>{if(!r.ok)throw new Error('Missing RL model');return r.json()}).then((policy:PolicyData)=>{policyAction(policy,policyObservation(policy,sim.b,sim.p,sim));return policy});
  const policy=await policyPromise;if(ticket!==selection||mode!=='rl')return;
  sim.superEnabled=policy.version>=2;
  sim.botController=(self,other,combat)=>actionInput(policyAction(policy,policyObservation(policy,self,other,combat)),self,other);
  sim.think=0;sim.bot={};document.title='Shadow Duel — Đấu với bóng tối · PPO bot';
  $('rl-status').textContent=policy.version>=2?'Sẵn sàng · Bot AI đã học Super.':'Sẵn sàng · Model tốt nhất sau 1 triệu bước luyện tập.';
  ($('start') as HTMLButtonElement).disabled=false;
 }catch(error){policyPromise=undefined;if(ticket!==selection)return;
  $('rl-status').textContent='Tải bot AI thất bại. Bấm lại để thử hoặc chọn bot thường.';console.error(error);
 }
}
const combatAudio=new CombatAudio();combatAudio.enabled=true;$('sound').textContent='Âm thanh: bật';
function pause(){if(!started||!sim.active)return;sim.paused=!sim.paused;$('overlay').classList.toggle('hidden',!sim.paused);if(sim.paused){$('result').hidden=false;$('description').hidden=false;$('result').textContent='Nghỉ một nhịp.';$('description').textContent='Trận đấu đang tạm dừng.';$('start').textContent='TIẾP TỤC ↗';document.querySelector<HTMLElement>('.mode-picker')!.style.display='none'}}
window.addEventListener('keydown',e=>{const k=mapping[e.key]??e.key.toUpperCase();if(k==='H'&&!e.repeat)debugBoxes=!debugBoxes;if(['A','D','W','J','K','L','SPACE','I','ESCAPE'].includes(k)){e.preventDefault();if(k==='ESCAPE'&&!e.repeat)pause();else held.add(k)}});window.addEventListener('keyup',e=>held.delete(mapping[e.key]??e.key.toUpperCase()));window.addEventListener('blur',()=>{held.clear();if(sim.active&&!sim.paused)pause()});const touchPointers=new Map<number,{key:string;button:HTMLButtonElement}>();
const pressed=(key:string)=>held.has(key)||[...touchPointers.values()].some(p=>p.key===key);
function refreshTouch(){document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>b.classList.toggle('pressed',[...touchPointers.values()].some(p=>p.button===b)))}
function clearTouch(){touchPointers.clear();refreshTouch()}
window.addEventListener('blur',clearTouch);
window.addEventListener('pointerup',e=>{touchPointers.delete(e.pointerId);refreshTouch()});
window.addEventListener('pointercancel',e=>{touchPointers.delete(e.pointerId);refreshTouch()});
// Capture each finger independently, so movement and attacks can be held together.
document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>{
 b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touchPointers.set(e.pointerId,{key:b.dataset.key!,button:b});refreshTouch()};
 b.onlostpointercapture=e=>{touchPointers.delete(e.pointerId);refreshTouch()};
});

$('pause').onclick=pause;$('sound').onclick=async()=>{sound=!sound;combatAudio.enabled=sound;$('sound').textContent=`Âm thanh: ${sound?'bật':'tắt'}`;if(sound){try{await combatAudio.enable();combatAudio.play('punch')}catch{sound=false;combatAudio.enabled=false;$('sound').textContent='Âm thanh: tải lỗi'}}};document.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(b=>b.onclick=()=>selectScripted(Number(b.dataset.level)));$('start').onclick=()=>{if(sound){void combatAudio.enable().catch(()=>{$('sound').textContent='Âm thanh: tải lỗi'})}if(sim.paused)sim.paused=false;else{if(!started||wins.some(n=>n>=2)){wins=[0,0];round=1}sim.reset();started=true}$('overlay').classList.add('hidden');held.clear();clearTouch()};
$('rl-mode').onclick=()=>{void selectRL()};
if(new URLSearchParams(location.search).get('rl')==='1')void selectRL();
class Arena extends Phaser.Scene{g!:Phaser.GameObjects.Graphics;fx:{x:number;y:number;life:number;blocked:boolean}[]=[];create(){this.paintBackground();this.g=this.add.graphics();}
 paintBackground(){const g=this.add.graphics();g.fillGradientStyle(0x8b9b88,0x8b9b88,0x344840,0x344840,1);g.fillRect(0,0,1200,600);g.fillStyle(0xe9dba9,.75);g.fillCircle(620,182,68);g.fillStyle(0xc2ceb1,.2);g.fillCircle(620,182,91);
 for(let layer=0;layer<3;layer++){g.fillStyle([0x667b69,0x4b6356,0x304a40][layer],.8);g.beginPath();g.moveTo(0,400);for(let x=0;x<=1250;x+=70)g.lineTo(x,260+layer*42+Math.sin(x*.008+layer)*40+Math.cos(x*.019)*25);g.lineTo(1200,500);g.lineTo(0,500);g.closePath();g.fillPath()}
 // temple roofs, pillars, and suspended lanterns
 g.fillStyle(0x243a31);g.fillRect(490,294,270,140);g.fillStyle(0x1d3029);g.fillTriangle(450,306,800,306,625,240);g.fillRect(465,305,320,12);g.fillStyle(0x12271f);for(let x=510;x<760;x+=58)g.fillRect(x,326,17,110);g.fillRect(584,340,81,95);
 for(const x of [70,1120]){g.fillStyle(0x182d26);g.fillRect(x,215,30,235);g.fillRect(x-13,210,56,17);g.fillTriangle(x-45,211,x+73,211,x+14,180);g.lineStyle(2,0x152b24);g.lineBetween(x+14,225,x+14,282);g.fillStyle(0xdbb270,.8);g.fillRoundedRect(x+2,278,24,34,5)}
 g.fillStyle(0x182a23);g.fillRect(0,445,1200,155);g.fillStyle(0x6e7760);g.fillRect(0,441,1200,5);g.lineStyle(1,0x85917b,.13);for(let y=460;y<600;y+=31){g.lineBetween(0,y,1200,y);for(let x=(y%2)*55;x<1200;x+=125)g.lineBetween(x,y,x-20,y+31)}g.fillStyle(0x11251e);for(let x=0;x<1200;x+=37){g.fillTriangle(x,445,x+6,415+Math.sin(x)*15,x+11,445)} }
 drawFighter(f:Fighter,color:number,t:number,alpha=1){const g=this.g;const {x,y,hip,neck,head,backKnee,backFoot,backToe,knee,foot,toe,shoulder,elbow,fist,e2,h2,block}=pose(f,t);
 const line=(a:{x:number;y:number},b:{x:number;y:number},w:number)=>{g.lineStyle(w,0x090e0d,alpha);g.lineBetween(a.x,a.y,b.x,b.y);g.fillStyle(0x090e0d,alpha);g.fillCircle(b.x,b.y,w/2)};g.fillStyle(0x000000,.25*alpha);g.fillEllipse(x,447,91-f.y*.08,12);if(alpha===1&&sim.superEnabled&&f.superMeter>=100&&f.hp>0){
 // Draw a 1.5px rim behind the existing silhouette; physics remains in geometry.ts.
 const rim=0xffedaa;g.fillStyle(rim);
 const segments:[{x:number;y:number},{x:number;y:number},number][]=[
  [hip,neck,24],[neck,{x:(neck.x+head.x)/2,y:(neck.y+head.y)/2},13],
  [hip,backKnee,15],[backKnee,backFoot,12],[backFoot,backToe,10],
  [hip,knee,16],[knee,foot,12],[foot,toe,10],
  [shoulder,elbow,13],[elbow,fist,11],[shoulder,e2,14],[e2,h2,11],
 ];
 for(const [a,b,w] of segments){g.lineStyle(w+3,rim);g.lineBetween(a.x,a.y,b.x,b.y);g.fillCircle(b.x,b.y,w/2+1.5)}
 g.fillCircle(head.x,head.y,16.5);g.fillCircle(h2.x,h2.y,9.5);
 }
 line(hip,neck,24);g.fillStyle(0x090e0d,alpha);g.fillCircle(head.x,head.y,15);line(neck,{x:(neck.x+head.x)/2,y:(neck.y+head.y)/2},13);
line(hip,backKnee,15);line(backKnee,backFoot,12);line(backFoot,backToe,10);
line(hip,knee,16);line(knee,foot,12);line(foot,toe,10);
line(shoulder,elbow,13);line(elbow,fist,11);line(shoulder,e2,14);line(e2,h2,11);g.fillCircle(h2.x,h2.y,8);
 g.lineStyle(4,color,alpha);g.lineBetween(hip.x-12,hip.y-2,hip.x+12,hip.y+1);g.lineStyle(3,color,alpha);g.lineBetween(neck.x-12,neck.y-28,neck.x+12,neck.y-28);g.lineBetween(neck.x-f.face*10,neck.y-28,neck.x-f.face*35,neck.y-20+Math.sin(t*8)*4);if(block){g.lineStyle(2,0xc8dcca,.4*alpha);g.beginPath();g.arc(x+f.face*15,y-85,53,-1.3,1.3,f.face<0);g.strokePath()}}
 update(time:number,delta:number){const input:Input={left:pressed('A'),right:pressed('D'),jump:pressed('W'),punch:pressed('J'),kick:pressed('K'),block:pressed('L'),dodge:pressed('SPACE'),super:pressed('I')};sim.step(delta/1000,input);for(const key of sim.sounds.splice(0))combatAudio.play(key);this.g.clear();for(const f of [sim.p,sim.b])if(f.superStage){this.g.fillStyle(0xe9c98b,.13);this.g.fillCircle(f.x,390-f.y,34);if(f.superStage==='punch'||f.superStage==='kick'){for(let j=1;j<=3;j++){this.drawFighter({...f,x:f.x-f.face*j*15},0xe9c98b,sim.elapsed,.15/j)}}}
 this.drawFighter(sim.p,0xcabb8b,sim.elapsed);this.drawFighter(sim.b,0xc0775b,sim.elapsed);if(debugBoxes){const draw=(c:Capsule,color:number)=>{this.g.lineStyle(c.r*2,color,.3);this.g.lineBetween(c.a.x,c.a.y,c.b.x,c.b.y);this.g.fillStyle(color,.3);this.g.fillCircle(c.a.x,c.a.y,c.r);this.g.fillCircle(c.b.x,c.b.y,c.r)};for(const f of [sim.p,sim.b]){for(const h of hurtboxes(f,sim.elapsed))draw(h,0x53d9f5);for(const h of hitboxes(f,sim.elapsed))draw(h,0xff4c55)}}for(const event of sim.events.splice(0)){this.fx.push({...event,life:.25});this.cameras.main.shake(event.blocked?35:65,event.blocked?.001:.003);combatAudio.play(event.blocked?'block':event.kind)}this.fx=this.fx.filter(e=>e.life>0);for(const e of this.fx){e.life-=delta/1000;this.g.lineStyle(2,e.blocked?0xc7ddc8:0xffd6a0,Math.max(0,e.life*4));for(let j=0;j<8;j++){const a=j*Math.PI/4;const r=(.25-e.life)*150;this.g.lineBetween(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,e.x+Math.cos(a)*(r+10),e.y+Math.sin(a)*(r+10))}}
 for(const [prefix,f] of [['p',sim.p],['b',sim.b]] as const){$(`${prefix}-health`).style.width=`${f.hp}%`;$(`${prefix}-energy`).style.width=`${f.energy}%`}for(const [id,f] of [['p',sim.p],['b',sim.b]] as const){const meter=$(`${id}-super`);meter.style.width=`${f.superMeter}%`;meter.parentElement!.classList.toggle('ready',f.superMeter>=100);meter.parentElement!.hidden=!sim.superEnabled}const superButton=$('super-button') as HTMLButtonElement;superButton.disabled=!sim.superEnabled||sim.p.superMeter<100;superButton.classList.toggle('ready',sim.p.superMeter>=100);
 $('time').textContent=String(Math.ceil(sim.time)).padStart(2,'0');$('round').textContent=`ROUND ${String(round).padStart(2,'0')} · ${wins[0]} : ${wins[1]}`;
 if(sim.winner){$('result').hidden=false;$('description').hidden=false;const winner=sim.winner;sim.winner='';if(winner==='player')wins[0]++;if(winner==='bot')wins[1]++;const match=wins.some(n=>n>=2);$('result').textContent=winner==='draw'?'Hòa hiệp này.':winner==='player'?(match?'Thắng trận!':'Thắng hiệp!'):(match?'Bot thắng trận.':'Bot thắng hiệp.');$('description').textContent=match?`Tỉ số ${wins[0]} : ${wins[1]} · Một trận mới đang chờ.`:'Giữ đỡ để giảm sát thương. Né khi bot bắt đầu tung đòn.';$('start').textContent=match?'ĐẤU LẠI ↗':'HIỆP TIẾP THEO ↗';document.querySelector<HTMLElement>('.mode-picker')!.style.display=match?'block':'none';if(!match)round++;$('overlay').classList.remove('hidden')}
 }}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1200,height:600,backgroundColor:'#344840',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Arena});
