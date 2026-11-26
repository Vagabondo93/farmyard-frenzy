// Test automatico delle partite: apre il gioco in un browser senza grafica e gioca da solo.
// Uso (dalla cartella del progetto):  node tools/test-partite.js
// Controlla: partita contro il bot, Royal Rumble contro i bot, 1 contro 1 online e Rumble online
// (l'online usa un database finto in memoria del browser, tools/mock-db.js).
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png'};
function serve(){return new Promise(res=>{const s=http.createServer((q,r)=>{
  let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';
  if(f==='/test.html'){r.writeHead(200,{'Content-Type':TYPES['.html']});return r.end(fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace('let G;','let G;window.__g=()=>G;'))}
  const p=path.join(ROOT,f);if(!p.startsWith(ROOT)||!fs.existsSync(p)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'Content-Type':TYPES[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p))});
  s.listen(0,'127.0.0.1',()=>res(s))})}
const ok=(c,m)=>{console.log((c?'  OK   ':'  NO   ')+m);if(!c)process.exitCode=1};
async function buyAndReady(p){
  for(let k=0;k<4;k++){const cs=await p.$$('#shop [data-buy]:not(.off)');let c=null;
    for(const x of cs){if((await x.textContent()).match(/Faina|Ladro|Gazza|Topi|Talpa|Cane/)){c=x;break}}if(!c)c=cs[0];if(!c)break;await c.click()}
  await p.click('#readyBtn');
}
const phase=p=>p.evaluate(()=>window.__g()?.phase);
async function playRound(pages){
  for(const p of pages) if(await phase(p)==='shop') await buyAndReady(p);
  for(const p of pages){await p.bringToFront();await p.waitForFunction(()=>['battle','result','over'].includes(window.__g().phase),null,{timeout:60000});
    if(await phase(p)==='battle'&&await p.isVisible('[data-speed="4"]')) await p.click('[data-speed="4"]')}
  for(const p of pages){await p.bringToFront();await p.waitForFunction(()=>['result','over'].includes(window.__g().phase),null,{timeout:120000})}
}
const doBans=async(ps)=>{for(let i=0;i<200;i++){let all=true;for(const p of ps){if(await p.isHidden('#game')){all=false;const b=await p.$('#banPool [data-ban]:not([disabled])');if(b)await b.click().catch(()=>{})}}if(all)return;await ps[0].waitForTimeout(150)}};
(async()=>{
  const srv=await serve(),url=`http://127.0.0.1:${srv.address().port}/test.html`,errs=[];
  const b=await chromium.launch();
  // --- contro i bot
  {const ctx=await b.newContext({locale:'it-IT'});const p=await ctx.newPage({locale:'it-IT'});p.on('pageerror',e=>errs.push(e.message));
    await p.goto(url);await p.click('#tutSkip');
    console.log('Partita contro il bot');await p.evaluate(()=>openPlay('bot','classic')).then(()=>p.click('#botBtn'));
    for(let r=0;r<3;r++){await playRound([p]);if(await phase(p)==='over')break;await p.click('#bBtn')}
    ok(true,'3 round giocati');await p.click('#menuBtn');
    console.log('Royal Rumble contro 7 bot');await p.evaluate(()=>openPlay('bot','rumble')).then(()=>p.click('#rumbleBot'));
    for(let r=0;r<3;r++){await playRound([p]);if(await phase(p)==='over')break;await p.click('#bBtn')}
    const st=await p.evaluate(()=>window.__g().rmb.P.map(x=>x.lives+(x.out?'x':'')).join(' '));ok(true,'uova dopo 3 round: '+st);
    console.log('Contro il bot con ban e scelte');await p.click('#menuBtn');
    await p.evaluate(()=>openPlay('bot','classic'));await p.check('#banOpt');await p.click('#botBtn');
    for(let i=0;i<300&&await p.isHidden('#game');i++){const c=await p.$('#botBanPool [data-bban]:not([disabled])');if(c)await c.click().catch(()=>{});await p.waitForTimeout(150)}
    const bb=await p.evaluate(()=>{const g=window.__g();return {pool:g.pool,bans:g.bans,picks:g.picks}});
    ok(bb.bans.length===4&&bb.picks.length===2&&bb.picks.every(k=>bb.pool.includes(k))&&!bb.bans.some(k=>bb.pool.includes(k)),`4 ban e 2 scelte con il bot: via ${bb.bans.join(', ')}, scelti ${bb.picks.join(', ')}`);
    await playRound([p]);ok(true,'round giocato dopo i ban');
    await ctx.close()}
  // --- online con database finto
  const ctx=await b.newContext({locale:'it-IT'});
  await ctx.addInitScript({content:fs.readFileSync(path.join(__dirname,'mock-db.js'),'utf8')+";try{localStorage.setItem('uovo-tut','1')}catch(e){}window.__mpx=4;"});
  const names=['anna','bruno','carla'],P=[];
  for(const n of names){const p=await ctx.newPage({locale:'it-IT'});p.on('pageerror',e=>errs.push(n+': '+e.message));P.push(p)}
  for(let i=0;i<3;i++){const p=P[i];await p.goto(url+'?u='+names[i]);await p.waitForSelector('#nickIn',{state:'visible'});
    await p.fill('#nickIn',names[i]+'X');await p.click('#regBtn');await p.waitForSelector('#meBox:not(.hidden)')}
  console.log('1 contro 1 online (classificata)');
  await P[0].evaluate(()=>openPlay('ranked','classic')).then(()=>P[0].click('#roomRanked'));await P[0].waitForSelector('#roomBox:not(.hidden)');
  await P[1].fill('#codeIn',await P[0].textContent('#roomCode'));await P[1].click('#joinBtn');await P[0].waitForSelector('#pvpStart:not([disabled]):not(.hidden)');await P[0].click('#pvpStart');
  await doBans(P.slice(0,2));for(const p of P.slice(0,2)) await p.waitForSelector('#game:not(.hidden)');
  {const v=await Promise.all(P.slice(0,2).map(p=>p.evaluate(()=>{const g=window.__g();return JSON.stringify({pool:g.pool,bans:g.bans,picks:g.picks})})));const x=JSON.parse(v[0]);
   ok(v[0]===v[1]&&x.bans.length===4&&x.picks.length===2&&x.picks.every(k=>x.pool.includes(k))&&!x.bans.some(k=>x.pool.includes(k)),`4 ban e 2 scelte uguali per tutti: via ${x.bans.join(', ')}, scelti ${x.picks.join(', ')}`)}
  for(let r=0;r<2;r++){await playRound(P.slice(0,2));
    const s=await Promise.all(P.slice(0,2).map(p=>p.evaluate(()=>JSON.stringify([window.__g().score,window.__g().sim.t.toFixed(3)]))));
    ok(s[0]===s[1],`round ${r+1}: stesso risultato sui due schermi ${s[0]}`);
    if(await phase(P[0])==='over')break;for(const p of P.slice(0,2)) await p.click('#bBtn')}
  for(const p of P.slice(0,2)){await p.reload();await p.waitForSelector('#meBox:not(.hidden)')}
  console.log('Royal Rumble online con 3 giocatori');
  await P[0].evaluate(()=>openPlay('ranked','rumble')).then(()=>P[0].click('#rumbleOnline'));await P[0].waitForSelector('#rumbleBox:not(.hidden)');const code=await P[0].textContent('#roomCode');
  for(const p of P.slice(1)){await p.fill('#codeIn',code);await p.click('#joinBtn');await p.waitForTimeout(500)}
  await P[0].waitForFunction(()=>document.querySelectorAll('#rumbleList li').length===3,null,{timeout:20000});
  await P[0].click('#rumbleStart');await doBans(P);for(const p of P) await p.waitForSelector('#game:not(.hidden)');
  for(let r=0;r<3;r++){const live=[];for(const p of P) if(await phase(p)!=='over') live.push(p);
    await playRound(live);
    const s=await Promise.all(live.map(p=>p.evaluate(()=>window.__g().rmb.P.map(x=>x.lives+(x.out?'x':'')).join(' '))));
    ok(s.every(x=>x===s[0]),`round ${r+1}: uova uguali per tutti (${s[0]})`);
    for(const p of live) if(await phase(p)==='result') await p.click('#bBtn')}
  ok(errs.length===0,errs.length?'errori: '+errs.join(' | '):'nessun errore JavaScript');
  await b.close();srv.close();
})();
