import {test,expect} from '@playwright/test';
test('body collision, active window, one hit, mirrored attacks, and wall dodge',async({page})=>{
 await page.goto('http://localhost:5173');
 const results=await page.evaluate(async()=>{
  const {Combat}=await import('/src/combat.ts');
  function setup(action,distance,face=1,dodge=false){const c=new Combat();c.reset();c.p.x=face===1?95:1105;c.p.face=face;c.b.x=c.p.x+face*distance;c.b.face=-face;if(dodge){c.p.action='dodge';c.p.timer=.2;c.p.duration=.35;c.b.action=action;c.b.duration=action==='kick'?.55:.34;c.b.timer=c.b.duration*.4}else{c.p.action=action;c.p.duration=action==='kick'?.55:.34;c.p.timer=c.p.duration*.4}return c}
  const near=setup('punch',90);near.resolve(near.p,near.b);const hp=near.b.hp;near.resolve(near.p,near.b);
  const far=setup('punch',180);far.resolve(far.p,far.b);
  const early=setup('punch',90);early.p.timer=early.p.duration*.8;early.resolve(early.p,early.b);
  const mirror=setup('punch',90,-1);mirror.resolve(mirror.p,mirror.b);
  const wall=setup('kick',100,1,true);wall.update(wall.p,wall.b,{},.02);const wallX=wall.p.x;wall.resolve(wall.b,wall.p);
  const escape=setup('kick',65,1,true);escape.p.x=200;escape.b.x=265;escape.update(escape.p,escape.b,{},.3);escape.resolve(escape.b,escape.p);
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
  return {endpoints:overlaps(a,target)||overlaps(z,target),cross,miss,moving,parallel,active:simulate(.4),startup:simulate(.9),recovery:simulate(.1)};
 });
 expect(result.endpoints).toBe(false);expect(result.cross).toBeCloseTo(.4,3);expect(result.miss).toBeNull();expect(result.moving).not.toBeNull();expect(result.parallel).toBeNull();expect(result.active.hp).toBe(91);expect(result.active.twice).toBe(91);expect(result.startup.hp).toBe(100);expect(result.recovery.hp).toBe(100);
});
