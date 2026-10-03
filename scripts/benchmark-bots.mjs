import {chromium} from '@playwright/test';
import {writeFileSync,unlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
// Run against the local Vite server. Baseline is main before this tuning branch.
const path='src/benchmark-baseline.ts';
writeFileSync(path,execFileSync('git',['show','b5cc4be:src/bot.ts']));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.goto('http://localhost:5173');
 const result=await page.evaluate(async()=>{
  const{Combat}=await import('/src/combat.ts');const{chooseBotAction,BotMemory,botDecisionIntervals}=await import('/src/bot.ts');const{chooseBotAction:old}=await import('/src/benchmark-baseline.ts');const result=[];
  for(const level of [1,2])for(const modern of [false,true]){
   let bhp=0,php=0,wins=0;
   for(let seed=1;seed<=32;seed++){
    let state=seed;const rng=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296};
    const c=new Combat();c.reset();c.p.x=480;c.b.x=570;c.think=99999;const mem=new BotMemory();let think=0;
    for(let i=0;i<1500&&c.active;i++){
     think-=.02;mem.observe(c.p,.02);
     if(think<=0){think=modern?botDecisionIntervals[level]:[.42,.25,.14][level];c.bot=modern?chooseBotAction(c.b,c.p,level,rng,mem):old(c.b,c.p,level,rng)}
     const d=c.b.x-c.p.x;c.step(.02,{left:d<0&&Math.abs(d)>90,right:d>0&&Math.abs(d)>90,kick:true});
    }
    bhp+=c.b.hp;php+=c.p.hp;if(c.b.hp>c.p.hp)wins++;
   }
   result.push({level,modern,botHp:Math.round(bhp/32),playerHp:Math.round(php/32),botWins:wins,runs:32});
  }return result;
 });console.log(JSON.stringify(result,null,2));
}finally{await browser.close();unlinkSync(path)}
