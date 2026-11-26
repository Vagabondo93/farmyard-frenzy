// Test del sito pubblico con Firebase simulato (tools/mock-firebase.js): accesso, profilo, partita online, uscita.
// Uso: node tools/test-firebase.js
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
const ok=(c,m)=>{console.log((c?'  OK   ':'  NO   ')+m);if(!c)process.exitCode=1};
function serve(cfg){return new Promise(res=>{const s=http.createServer((q,r)=>{let f=q.url.split('?')[0];if(f==='/')f='/index.html';
  if(f==='/firebase-config.js'){r.writeHead(200,{'Content-Type':'text/javascript'});return r.end(cfg)}
  const p=path.join(ROOT,f);if(!fs.existsSync(p)){r.writeHead(404);return r.end()}
  let body=fs.readFileSync(p);if(f==='/index.html')body=body.toString().replace('let G;','let G;window.__g=()=>G;');
  r.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'text/javascript':'application/octet-stream'});r.end(body)});
  s.listen(0,'127.0.0.1',()=>res(s))})}
const doBans=async(ps)=>{for(let i=0;i<200;i++){let all=true;for(const p of ps){if(await p.isHidden('#game')){all=false;const b=await p.$('#banPool [data-ban]:not([disabled])');if(b)await b.click().catch(()=>{})}}if(all)return;await ps[0].waitForTimeout(150)}};
(async()=>{
  const b=await chromium.launch(),errs=[];
  // 1) senza configurazione: modalità offline
  {const srv=await serve('window.FF_FIREBASE=null;');const p=await b.newPage({locale:'it-IT'});p.on('pageerror',e=>errs.push(e.message));
    await p.goto(`http://127.0.0.1:${srv.address().port}/`);await p.waitForTimeout(800);
    ok((await p.textContent('#onlineNote')).includes('non è disponibile'),'senza configurazione il gioco resta offline');
    await p.close();srv.close()}
  // 2) con Firebase (simulato)
  const srv=await serve('window.FF_FIREBASE={apiKey:"test",projectId:"test"};'),base=`http://127.0.0.1:${srv.address().port}/`;
  const ctx=await b.newContext({locale:'it-IT'});
  await ctx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:r.request().url().includes('app-compat')?fs.readFileSync(path.join(__dirname,'mock-firebase.js'),'utf8'):''}));
  await ctx.addInitScript({content:"try{localStorage.setItem('uovo-tut','1')}catch(e){}window.__mpx=4;"});
  const P=[];for(const n of ['anna','bruno']){const p=await ctx.newPage({locale:'it-IT'});p.on('pageerror',e=>errs.push(n+': '+e.message));await p.goto(base+'?u='+n);P.push(p)}
  await P[0].evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('mockfb:'))localStorage.removeItem(k)});
  for(const p of P){await p.waitForSelector('#loginBox:not(.hidden)',{timeout:10000})}
  ok(true,'compare il riquadro di accesso');
  await P[0].click('#loginGoogle');await P[1].click('#loginAnon');
  for(const [i,p] of P.entries()){await p.waitForSelector('#nickIn',{state:'visible'});await p.fill('#nickIn',['Anna','Bruno'][i]);await p.click('#regBtn');await p.waitForSelector('#meBox:not(.hidden)')}
  ok(true,'accesso e iscrizione di due giocatori');
  await P[0].waitForTimeout(400);ok((await P[0].textContent('#rankList')).includes('Bruno'),'classifica condivisa: Anna vede Bruno');
  await P[0].click('#roomRanked');await P[0].waitForSelector('#roomBox:not(.hidden)');
  await P[1].fill('#codeIn',await P[0].textContent('#roomCode'));await P[1].click('#joinBtn');await P[0].waitForSelector('#pvpStart:not([disabled]):not(.hidden)');await P[0].click('#pvpStart');
  await doBans(P);for(const p of P) await p.waitForSelector('#game:not(.hidden)');
  for(let r=0;r<2;r++){
    for(const p of P){for(let k=0;k<3;k++){const cs=await p.$$('#shop [data-buy]:not(.off)');if(!cs[0])break;await cs[0].click()}await p.click('#readyBtn')}
    for(const p of P){await p.bringToFront();await p.waitForFunction(()=>['battle','result','over'].includes(window.__g().phase),null,{timeout:60000});if(await p.evaluate(()=>window.__g().phase==='battle')&&await p.isVisible('[data-speed="4"]'))await p.click('[data-speed="4"]')}
    for(const p of P){await p.bringToFront();await p.waitForFunction(()=>['result','over'].includes(window.__g().phase),null,{timeout:120000})}
    const s=await Promise.all(P.map(p=>p.evaluate(()=>JSON.stringify([window.__g().score,window.__g().sim.t.toFixed(3)]))));
    ok(s[0]===s[1],`round ${r+1} online: stesso risultato per entrambi ${s[0]}`);
    if(await P[0].evaluate(()=>window.__g().phase==='over'))break;for(const p of P) await p.click('#bBtn')}
  await P[0].reload();await P[0].waitForSelector('#loginBox:not(.hidden)');await P[0].click('#loginGoogle');await P[0].waitForSelector('#meBox:not(.hidden)');
  await P[0].click('#logoutBtn');await P[0].waitForSelector('#loginBox:not(.hidden)');ok(true,'"Esci" riporta alla schermata di accesso');
  ok(errs.length===0,errs.length?'errori: '+errs.join(' | '):'nessun errore JavaScript');
  await b.close();srv.close();
})();
