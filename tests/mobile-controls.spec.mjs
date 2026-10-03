import {test,expect} from '@playwright/test';
test.use({viewport:{width:390,height:844},hasTouch:true});
test('mobile dpad supports simultaneous move and attack and clears released fingers',async({page})=>{
 await page.goto('http://localhost:5173/');
 await page.locator('#sound').click();await page.locator('#start').click();
 await expect(page.locator('.dpad')).toBeVisible();
 const client=await page.context().newCDPSession(page);
 const point=async(selector,id)=>{const r=await page.locator(selector).boundingBox();return{id,x:r.x+r.width/2,y:r.y+r.height/2}};
 const left=await point('.dpad-left',1),punch=await point('.touch-actions [data-key="J"]',2);
 // Observe input at the exact module URL that the live game imports.
 const source=await (await page.request.get('http://localhost:5173/src/main.ts')).text();
 const url=source.match(/import \{ Combat \} from "([^"]+)"/)[1];
 await page.evaluate(async(url)=>{const {Combat}=await import(url);const step=Combat.prototype.step;Combat.prototype.step=function(dt,input){window.latestInput={...input};return step.call(this,dt,input)}},url);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,punch]});
 await expect.poll(()=>page.evaluate(()=>window.latestInput?.left&&window.latestInput?.punch)).toBe(true);
 await expect(page.locator('.dpad-left')).toHaveClass(/pressed/);
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[left]});
 await expect.poll(()=>page.evaluate(()=>!window.latestInput?.left&&window.latestInput?.punch)).toBe(true);
 await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 await expect.poll(()=>page.evaluate(()=>!window.latestInput?.left&&!window.latestInput?.punch)).toBe(true);
 await expect(page.locator('.touch .pressed')).toHaveCount(0);
 await page.screenshot({path:'preview-mobile-dpad.png'});
});
test('small screens fit the controls and desktop hides the dpad',async({page})=>{
 await page.goto('http://localhost:5173/');
 for(const width of [320,390,760]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const b of await page.locator('.touch button').all()){
   const r=await b.boundingBox();expect(r.width).toBeGreaterThanOrEqual(44);expect(r.height).toBeGreaterThanOrEqual(44);
  }
 }
 await page.setViewportSize({width:1200,height:900});await expect(page.locator('.touch')).toBeHidden();await expect(page.locator('.controls')).toBeVisible();
});
