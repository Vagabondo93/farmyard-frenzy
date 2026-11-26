// Test della Royal Rumble online con bot di riempimento (database finto, tools/mock-db.js).
// Controlla: la stanza con l'opzione attiva parte con 8 posti, i bot schierano squadre,
// e i due giocatori umani vedono le stesse uova a ogni round.
// Uso: node tools/test-rumble-bot.js
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
(async()=>{
  const srv=await serve(),url=`http://127.0.0.1:${srv.address().port}/`,errs=[];
  const b=await chromium.launch(),ctx=await b.newContext({locale:'it-IT'});
  await ctx.route(/firebase-config\.js/,r=>r.fulfill({contentType:'text/javascript',body:'window.FF_FIREBASE=null;'}));
  await ctx.addInitScript({content:fs.readFileSync(path.join(__dirname,'mock-db.js'),'utf8')+";try{localStorage.setItem('uovo-tut','1')}catch(e){}window.__mpx=8;"});
  const P=[];for(const n of ['anna','bruno']){const p=await ctx.newPage({locale:'it-IT'});p.on('pageerror',e=>errs.push(n+': '+e.message));
    await p.goto(url+'?u='+n);await p.waitForSelector('#nickIn',{state:'visible'});await p.fill('#nickIn',n+'R');await p.click('#regBtn');await p.waitForSelector('#meBox:not(.hidden)');P.push(p)}
  await P[0].click('#rumbleOnline');await P[0].waitForSelector('#rumbleBox:not(.hidden)');
  await P[1].fill('#codeIn',await P[0].textContent('#roomCode'));await P[1].click('#joinBtn');
  await P[0].waitForFunction(()=>document.querySelectorAll('#rumbleList li').length===2,null,{timeout:15000});
  await P[0].check('#rumbleFill');
  await P[1].waitForFunction(()=>document.getElementById('rumbleList').textContent.includes('6 bot'),null,{timeout:10000});
  ok(true,'l\'opzione si vede anche nella lobby di chi è entrato');
  await P[0].click('#rumbleStart');for(const p of P) await p.waitForSelector('#game:not(.hidden)');
  ok(await P[0].evaluate(()=>window.__g().rmb.P.length===8&&window.__g().rmb.P.filter(p=>p.bot).length===6),'la Rumble parte con 2 giocatori e 6 bot');
  for(let r=0;r<3;r++){
    for(const p of P){await buy(p);await p.click('#readyBtn')}
    for(const p of P){await p.bringToFront();await p.waitForFunction(()=>['result','over'].includes(window.__g().phase),null,{timeout:120000})}
    const st=await Promise.all(P.map(p=>p.evaluate(()=>window.__g().rmb.P.map(x=>x.lives+(x.out?'x':'')).join(' '))));
    const bots=await P[0].evaluate(()=>window.__g().rmb.P.filter(p=>p.bot).map(p=>p.board.length));
    const sk=await Promise.all(P.map(p=>p.evaluate(()=>window.__g().rmb.skill.toFixed(3))));
    ok(st[0]===st[1]&&sk[0]===sk[1],`round ${r+1}: uova uguali per tutti (${st[0]}), bravura bot ${sk[0]}, unità dei bot ${bots.join(',')}`);
    if(await phase(P[0])==='over'||await phase(P[1])==='over')break;
    for(const p of P) await p.click('#bBtn');
  }
  ok(errs.length===0,errs.length?'errori: '+errs.join(' | '):'nessun errore JavaScript');
  await b.close();srv.close();
})();
