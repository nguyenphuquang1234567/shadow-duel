import {test,expect} from '@playwright/test';
test('body collision, active window, one hit, mirrored attacks, and wall dodge',async({page})=>{
 await page.goto('http://localhost:5173');
 const results=await page.evaluate(async()=>{
  const {Combat}=await import('/src/combat.ts');
  function setup(action,distance,face=1,dodge=false){const c=new Combat();c.reset();c.p.x=face===1?95:1105;c.p.face=face;c.b.x=c.p.x+face*distance;c.b.face=-face;if(dodge){c.p.action='dodge';c.p.timer=.2;c.p.duration=.35;c.b.action=action;c.b.duration=action==='kick'?.55:.34;c.b.timer=c.b.duration*.4}else{c.p.action=action;c.p.duration=action==='kick'?.55:.34;c.p.timer=c.p.duration*.4}return c}
  const near=setup('punch',90);near.resolve(near.p,near.b);const hp=near.b.hp;near.resolve(near.p,near.b);
  const far=setup('punch',180);far.resolve(far.p,far.b);
  const early=setup('punch',90);early.p.timer=early.p.duration*.98;early.resolve(early.p,early.b);
  const mirror=setup('punch',90,-1);mirror.resolve(mirror.p,mirror.b);
  const wall=setup('kick',100,1,true);wall.update(wall.p,wall.b,{},.02);const wallX=wall.p.x;wall.resolve(wall.b,wall.p);
  const escape=setup('kick',65,1,true);escape.p.x=200;escape.b.x=265;escape.p.timer=.35;escape.update(escape.p,escape.b,{},.3);escape.resolve(escape.b,escape.p);
  const jump=setup('punch',90);jump.b.y=200;jump.resolve(jump.p,jump.b);
  const blocked=setup('punch',90);blocked.b.action='block';blocked.resolve(blocked.p,blocked.b);
  return{near:hp,once:near.b.hp,far:far.b.hp,early:early.b.hp,mirror:mirror.b.hp,wallX,wall:wall.p.hp,escape:escape.p.hp,jump:jump.b.hp,blocked:blocked.b.hp};
 });
 expect(results.near).toBe(91);expect(results.once).toBe(91);expect(results.far).toBe(100);expect(results.early).toBe(100);expect(results.mirror).toBe(91);expect(results.wallX).toBe(95);expect(results.wall).toBeLessThan(100);expect(results.escape).toBe(100);expect(results.jump).toBe(100);expect(results.blocked).toBeGreaterThan(91);expect(results.blocked).toBeLessThan(100);
});
test('game starts and shows debug hurtboxes without runtime errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5173');await page.click('#start');await page.keyboard.press('h');await page.keyboard.down('d');await page.waitForTimeout(700);await page.keyboard.up('d');await page.keyboard.down('k');await page.waitForTimeout(500);await page.keyboard.up('k');await page.screenshot({path:'preview-hitboxes.png'});expect(errors).toEqual([]);
});
test('sweeps catch crossed targets without inventing contact or damage outside active frames',async({page})=>{
 await page.goto('http://localhost:5173');
 const result=await page.evaluate(async()=>{
  const {sweptContact,overlaps}=await import('/src/geometry.ts');
  const {Combat}=await import('/src/combat.ts');
  const circle=(x,y=0,r=1)=>({a:{x,y},b:{x,y},r,part:'test'});
  const a=circle(100),z=circle(120),target=circle(110);
  const cross=sweptContact(a,z,target,target);
  const miss=sweptContact(circle(100,10),circle(120,10),target,target);
  const moving=sweptContact(circle(0),circle(20),circle(20),circle(0));
  const parallel=sweptContact(circle(0),circle(20),circle(10),circle(30));
  function simulate(phase){const c=new Combat();c.reset();c.p.x=100;c.p.action='punch';c.p.duration=.34;c.p.timer=.34*phase;c.b.x=300;const oldP={...c.p},oldB={...c.b};c.p.x=400;c.elapsed=.01;c.p.timer-=.01;c.resolve(c.p,c.b,oldP,oldB,0);const hp=c.b.hp;c.resolve(c.p,c.b,oldP,oldB,0);return {hp,twice:c.b.hp}}
  return {endpoints:overlaps(a,target)||overlaps(z,target),cross,miss,moving,parallel,active:simulate(.4),startup:simulate(.98),recovery:simulate(.1)};
 });
 expect(result.endpoints).toBe(false);expect(result.cross).toBeCloseTo(.4,3);expect(result.miss).toBeNull();expect(result.moving).not.toBeNull();expect(result.parallel).toBeNull();expect(result.active.hp).toBe(91);expect(result.active.twice).toBe(91);expect(result.startup.hp).toBe(100);expect(result.recovery.hp).toBe(100);
});
test('real simulation lands close-range strikes during extension at different frame rates',async({page})=>{
 await page.goto('http://localhost:5173');
 const cases=await page.evaluate(async()=>{
  const {Combat}=await import('/src/combat.ts');const results=[];
  for(const action of ['punch','kick'])for(const face of [-1,1])for(const distance of [58,65,75,90,110])for(const fps of [30,60,144]){
   const c=new Combat();c.reset();c.p.x=500;c.b.x=500+face*distance;c.p.face=face;c.b.face=-face;c.think=100;c.bot={};c.attack(c.p,action);
   for(let i=0;i<Math.ceil(.7*fps);i++)c.step(1/fps,{});
   results.push({action,face,distance,fps,hp:c.b.hp});
  }return results;
 });
 for(const c of cases)expect(c.hp,JSON.stringify(c)).toBe(c.action==='punch'?91:85);
});
test('bot saves its second jump until threatened and releases jump between presses',async({page})=>{
 await page.goto('http://localhost:5173');const result=await page.evaluate(async()=>{
  const {Combat}=await import('/src/combat.ts');const {chooseBotAction}=await import('/src/bot.ts');const c=new Combat();c.reset();c.b.x=500;c.p.x=600;c.p.action='punch';c.p.duration=.34;c.p.timer=.25;
  const ground=chooseBotAction(c.b,c.p,2,()=>0);
  c.b.y=50;c.b.jumps=1;c.b.vy=-100;const second=chooseBotAction(c.b,c.p,2,()=>0);
  c.b.y=150;const safe=chooseBotAction(c.b,c.p,2,()=>0);
  c.b.y=50;c.b.jumps=2;const spent=chooseBotAction(c.b,c.p,2,()=>0);
  c.b.jumps=1;c.b.jumpHeld=true;const held=chooseBotAction(c.b,c.p,2,()=>0);
  c.b.jumpHeld=false;c.p.action='idle';const calm=chooseBotAction(c.b,c.p,2,()=>0);
  c.b.y=0;c.b.jumps=0;c.p.x=750;c.p.y=80;const chase=chooseBotAction(c.b,c.p,2,()=>0);
  c.bot={jump:true};c.think=100;c.step(.016,{});const pulse=c.bot.jump;c.step(.016,{});const released=c.b.jumpHeld;
  return{ground:!!ground.jump,second:!!second.jump,safe:!!safe.jump,spent:!!spent.jump,held:!!held.jump,calm:!!calm.jump,chase:!!chase.jump,pulse,released};
 });expect(result).toEqual({ground:true,second:true,safe:false,spent:false,held:false,calm:false,chase:true,pulse:false,released:false});
});
test('active strikes cover limb middles as well as extremities, including somersault poses',async({page})=>{
 await page.goto('http://localhost:5173');const cases=await page.evaluate(async()=>{
  const {Combat}=await import('/src/combat.ts');const {hitboxes,overlaps}=await import('/src/geometry.ts');const result=[];
  for(const action of ['punch','kick'])for(const face of [-1,1])for(const rolling of [false,true]){
   const c=new Combat();const f=c.p;f.action=action;f.duration=action==='punch'?.34:.55;f.timer=f.duration*.4;f.face=face;if(rolling){f.y=100;f.jumps=2;f.jumpAge=.18}
   const boxes=hitboxes(f,0),tip=boxes[2];
   const middle=boxes.slice(0,2).map(box=>{const point={x:(box.a.x+box.b.x)/2,y:(box.a.y+box.b.y)/2};const probe={a:point,b:point,r:.1,part:'target'};return {limb:boxes.some(b=>overlaps(b,probe)),tip:overlaps(tip,probe)}});
   result.push({parts:boxes.map(b=>b.part),middle});f.hit=true;result.push({afterHit:hitboxes(f,0).length});
  }return result;
 });
 for(const c of cases){if('afterHit'in c)expect(c.afterHit).toBe(0);else{expect(c.parts).toHaveLength(3);for(const m of c.middle){expect(m.limb).toBe(true);expect(m.tip).toBe(false)}}}
});
