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
