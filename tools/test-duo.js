// Test del 2 contro 2 (database finto, tools/mock-db.js).
// Controlla: contro i bot nessuno a piedi resta dentro i campi arati; online due giocatori (più due bot)
// in squadre diverse vedono lo stesso risultato a ogni round.
// Uso: node tools/test-duo.js
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
const ok=(c,m)=>{console.log((c?'  OK   ':'  NO   ')+m);if(!c)process.exitCode=1};
function serve(){return new Promise(res=>{const s=http.createServer((q,r)=>{let f=q.url.split('?')[0];if(f==='/')f='/index.html';
  const p=path.join(ROOT,f);if(!fs.existsSync(p)){r.writeHead(404);return r.end()}
  let body=fs.readFileSync(p);if(f==='/index.html')body=body.toString().replace('let G;','let G;window.__g=()=>G;');
  r.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'text/javascript':'application/octet-stream'});r.end(body)});
  s.listen(0,'127.0.0.1',()=>res(s))})}
const phase=p=>p.evaluate(()=>window.__g()?.phase);
const buy=async p=>{for(let k=0;k<3;k++){const cs=await p.$$('#shop [data-buy]:not(.off)');if(!cs[0])break;await cs[0].click()}};
// unità che girano intorno a un ostacolo ma restano ferme nello stesso punto per più di 2 s
const stuck=p=>p.evaluate(()=>{const S=window.__g().sim;if(!S)return 0;const M=window.__pos=window.__pos||{};let n=0;
  for(const u of S.units){if(!u.alive||!u.nav||!(S.t-(u.navT||-9)<.1)||u.stun>0||u.snare>0||u.sleep>0||u.eatT>0){delete M[u.id];continue}
    const m=M[u.id];if(m&&Math.abs(m.x-u.x)<1&&Math.abs(m.y-u.y)<1){if(S.t-m.t>2){n++;m.t=S.t}}else M[u.id]={x:u.x,y:u.y,t:S.t}}
  return n});
const inside=p=>p.evaluate(()=>{const S=window.__g().sim;if(!S)return 0;let n=0;
  for(const u of S.units) if(u.alive&&!u.def.flying&&!u.underground) for(const q of S.plots) if(!(q.water&&u.def.swim)&&u.x>q.x+2&&u.x<q.x+q.w-2&&u.y>q.y+2&&u.y<q.y+q.h-2) n++;return n});
(async()=>{
  const srv=await serve(),url=`http://127.0.0.1:${srv.address().port}/`,errs=[];
  const b=await chromium.launch(),ctx=await b.newContext({locale:'it-IT'});
  await ctx.route(/firebase-config\.js/,r=>r.fulfill({contentType:'text/javascript',body:'window.FF_FIREBASE=null;'}));
  await ctx.addInitScript({content:fs.readFileSync(path.join(__dirname,'mock-db.js'),'utf8')+";try{localStorage.setItem('uovo-tut','1')}catch(e){}window.__mpx=8;"});
  // --- contro i bot
  console.log('2 contro 2 contro i bot');
  {const p=await ctx.newPage();p.on('pageerror',e=>errs.push('bot: '+e.message));await p.goto(url+'?u=solo');await p.waitForTimeout(500);
    await p.evaluate(()=>openPlay('bot','duo'));await p.click('#duoBot');await p.waitForSelector('#game:not(.hidden)');
    ok(await p.evaluate(()=>window.__g().duo.P.length===4&&document.getElementById('field').style.aspectRatio.replace(/\s/g,'')==='960/760'),'4 giocatori e campo alto 760');
    let bad=0,blk=0;
    for(let r=0;r<4;r++){await buy(p);await p.click('#readyBtn');await p.waitForFunction(()=>window.__g().phase==='battle',null,{timeout:20000});
      if(await p.isVisible('[data-speed="4"]'))await p.click('[data-speed="4"]');
      while(!['result','over'].includes(await phase(p))){bad+=await inside(p);blk+=await stuck(p);await p.waitForTimeout(100)}
      if(await phase(p)==='over')break;await p.click('#bBtn')}
    ok(bad===0,`nessuna unità a piedi dentro i campi arati (${bad})`);
    ok(blk===0,`nessuna unità ferma per più di 2 s mentre aggira un ostacolo (${blk})`);
    const back=await p.evaluate(()=>{const g=window.__g();return g.duo.P.map(x=>x.board.length).join(',')});ok(true,'unità dei 4 giocatori: '+back);
    await p.close()}
  // --- online: anna (blu) crea, bruno (rosso) entra, i 2 posti liberi vanno ai bot
  console.log('2 contro 2 online');
  const P=[];for(const n of ['anna','bruno']){const p=await ctx.newPage();p.on('pageerror',e=>errs.push(n+': '+e.message));
    await p.goto(url+'?u='+n);await p.waitForSelector('#nickIn',{state:'visible'});await p.fill('#nickIn',n+'D');await p.click('#regBtn');await p.waitForSelector('#meBox:not(.hidden)');P.push(p)}
  await P[0].evaluate(()=>openPlay('friendly','duo'));await P[0].click('#duoOnline');await P[0].waitForSelector('#rumbleBox:not(.hidden)');
  await P[1].fill('#codeIn',await P[0].textContent('#roomCode'));await P[1].click('#joinBtn');
  await P[0].waitForFunction(()=>document.querySelectorAll('#rumbleList li').length===4&&document.getElementById('rumbleList').textContent.includes('brunoD'),null,{timeout:15000});
  ok(true,'lobby con 2 giocatori e 2 posti per i bot');
  await P[0].click('#rumbleStart');for(const p of P) await p.waitForSelector('#game:not(.hidden)');
  ok(await P[1].evaluate(()=>{const g=window.__g();return g.duo.me===1&&g.me===1&&g.duo.P.filter(p=>p.bot).length===2}),'bruno è nella squadra rossa, 2 bot in partita');
  for(let r=0;r<3;r++){
    for(const p of P){await buy(p);await p.click('#readyBtn')}
    for(const p of P){await p.bringToFront();await p.waitForFunction(()=>['result','over'].includes(window.__g().phase),null,{timeout:120000})}
    const st=await Promise.all(P.map(p=>p.evaluate(()=>{const g=window.__g();return JSON.stringify([g.score,g.sim.t.toFixed(3),g.sim.units.length])})));
    ok(st[0]===st[1],`round ${r+1}: stesso risultato sui due schermi ${st[0]}`);
    if(await phase(P[0])==='over'||await phase(P[1])==='over')break;
    for(const p of P) await p.click('#bBtn');
  }
  ok(errs.length===0,errs.length?'errori: '+errs.join(' | '):'nessun errore JavaScript');
  await b.close();srv.close();
})();
