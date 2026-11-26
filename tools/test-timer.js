// Test del tempo per il Pronto nell'1 contro 1 online (database finto, tools/mock-db.js).
// Controlla: niente timer al round 1; dal round 2 il conto alla rovescia parte quando il primo preme Pronto;
// a tempo scaduto la squadra parte da sola; chi è sparito gioca con la squadra vuota e la partita va avanti.
// Uso: node tools/test-timer.js
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
const toEnd=async ps=>{for(const p of ps){await p.bringToFront();await p.waitForFunction(()=>['result','over'].includes(window.__g().phase),null,{timeout:120000})}};
(async()=>{
  const srv=await serve(),url=`http://127.0.0.1:${srv.address().port}/`,errs=[];
  const b=await chromium.launch(),ctx=await b.newContext({locale:'it-IT'});
  await ctx.route(/firebase-config\.js/,r=>r.fulfill({contentType:'text/javascript',body:'window.FF_FIREBASE=null;'}));
  await ctx.addInitScript({content:fs.readFileSync(path.join(__dirname,'mock-db.js'),'utf8')+";try{localStorage.setItem('uovo-tut','1')}catch(e){}window.__mpx=4;"});
  const P=[];for(const n of ['anna','bruno']){const p=await ctx.newPage({locale:'it-IT'});p.on('pageerror',e=>errs.push(n+': '+e.message));
    await p.goto(url+'?u='+n);await p.waitForSelector('#nickIn',{state:'visible'});await p.fill('#nickIn',n+'T');await p.click('#regBtn');await p.waitForSelector('#meBox:not(.hidden)');P.push(p)}
  await P[0].selectOption('#winSel','5');
  await P[0].click('#roomFriendly');await P[0].waitForSelector('#roomBox:not(.hidden)');
  await P[1].fill('#codeIn',await P[0].textContent('#roomCode'));await P[1].click('#joinBtn');
  for(const p of P) await p.waitForSelector('#game:not(.hidden)');
  // round 1: nessun limite
  await buy(P[0]);await P[0].click('#readyBtn');await P[1].waitForTimeout(1500);
  ok(await P[1].evaluate(()=>window.__g().deadline===null&&document.getElementById('timerPill').classList.contains('hidden')),'round 1: nessun conto alla rovescia');
  await buy(P[1]);await P[1].click('#readyBtn');await toEnd(P);
  for(const p of P) await p.click('#bBtn');
  // round 2: Anna pronta, Bruno no
  await buy(P[0]);const t0=Date.now();await P[0].click('#readyBtn');await P[1].bringToFront();await P[1].waitForTimeout(1500);
  const d=await P[1].evaluate(()=>({dl:window.__g().deadline,pill:document.getElementById('timerPill').textContent}));
  ok(Math.abs(d.dl-t0-60000)<3000,`round 2: Bruno ha 60 s dal Pronto di Anna (${Math.round((d.dl-t0)/1000)} s) — "${d.pill}"`);
  await P[1].evaluate(()=>{window.__g().deadline=Date.now()+1500});         // accorcia l'attesa del test
  await P[1].waitForFunction(()=>window.__g().phase!=='shop',null,{timeout:10000});
  ok(true,'tempo scaduto: la squadra di Bruno parte da sola');
  await toEnd(P);
  const s=await Promise.all(P.map(p=>p.evaluate(()=>JSON.stringify([window.__g().score,window.__g().sim.t.toFixed(3)]))));
  ok(s[0]===s[1],'stesso risultato sui due schermi '+s[0]);
  if(await phase(P[0])!=='over'){
    // round 3: Bruno chiude la pagina; Anna aspetta la scadenza + 15 s, poi gioca contro una squadra vuota
    await P[1].close();await P[0].click('#bBtn');await buy(P[0]);await P[0].click('#readyBtn');
    await P[0].waitForTimeout(800);await P[0].evaluate(()=>{window.__g().deadline=Date.now()-16000});
    await P[0].waitForFunction(()=>['reveal','battle','result','over'].includes(window.__g().phase),null,{timeout:15000});
    ok(await P[0].evaluate(()=>window.__g().players[1-window.__g().me].board.length===0),'Bruno sparito: il round parte con la sua squadra vuota');
  }
  ok(errs.length===0,errs.length?'errori: '+errs.join(' | '):'nessun errore JavaScript');
  await b.close();srv.close();
})();
