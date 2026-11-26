// Test del tutorial guidato: segue tutti i passi come un giocatore e controlla che arrivi alla fine.
// Uso: node tools/test-tutorial.js
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
const ok=(c,m)=>{console.log((c?'  OK   ':'  NO   ')+m);if(!c)process.exitCode=1};
function serve(){return new Promise(res=>{const s=http.createServer((q,r)=>{let f=q.url.split('?')[0];if(f==='/')f='/index.html';
  if(f==='/firebase-config.js'){r.writeHead(200,{'Content-Type':'text/javascript'});return r.end('window.FF_FIREBASE=null;')}
  const p=path.join(ROOT,f);if(!fs.existsSync(p)){r.writeHead(404);return r.end()}
  let body=fs.readFileSync(p);if(f==='/index.html')body=body.toString().replace('let G;','let G;window.__g=()=>G;');
  r.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'text/javascript':'application/octet-stream'});r.end(body)});
  s.listen(0,'127.0.0.1',()=>res(s))})}
(async()=>{
  const srv=await serve(),b=await chromium.launch(),errs=[];
  const p=await (await b.newContext({locale:'it-IT',viewport:{width:1400,height:900}})).newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto(`http://127.0.0.1:${srv.address().port}/`);await p.click('#tutSkip');
  const step=()=>p.textContent('#coachStep');
  const next=async()=>{await p.waitForSelector('#coachNext:not(.hidden)');await p.click('#coachNext')};
  await p.click('#tutBtn');await p.waitForSelector('#coach:not(.hidden)');ok(true,'il tutorial parte: '+(await p.textContent('#coachT')).slice(0,60)+'…');
  await next();await next();await next();await next();await next();
  await p.click('[data-buy="0"]');await p.click('[data-buy="1"]');
  ok(await p.evaluate(()=>window.__g().players[0].board.map(b=>b.type).join()==='faina,tacchino'),'comprati Faina e Tacchino');
  await next(); // squadra
  await next(); // salta il trascinamento
  await p.click('#readyBtn');
  await p.waitForFunction(()=>window.__g().phase==='battle',null,{timeout:20000});await next();
  await p.click('[data-speed="4"]');
  await p.waitForFunction(()=>['result','over'].includes(window.__g().phase),null,{timeout:120000});
  await p.waitForFunction(()=>document.getElementById('coachT').textContent.includes('secondo round'));await p.click('#bBtn');
  await next();
  await p.click('[data-buy="0"]');await p.click('[data-buy="1"]');
  ok(await p.evaluate(()=>window.__g().players[0].board.some(b=>b.type==='faina'&&b.star===2)),'tre Faine unite in una Faina ★★');
  await p.waitForFunction(()=>document.getElementById('coachT').textContent.includes('selezionarla'));
  await p.click('#board [data-sel]');await p.click('[data-ord="scatto"]');
  ok(await p.evaluate(()=>window.__g().players[0].board.some(b=>b.order==='scatto')),'ordine Scatto dato');
  await next(); // blocca e rimescola
  await p.click('#readyBtn');await p.waitForFunction(()=>window.__g().phase==='battle',null,{timeout:20000});await p.click('[data-speed="4"]');
  await p.waitForFunction(()=>['result','over'].includes(window.__g().phase),null,{timeout:120000});
  ok((await p.textContent('#bBtn')).includes('menu'),'fine del tutorial: '+await p.textContent('#coachT'));
  await p.click('#bBtn');await p.waitForSelector('#lobby:not(.hidden)');ok(await p.isHidden('#coach'),'si torna al menu e il fumetto sparisce');
  ok(errs.length===0,errs.length?'errori: '+errs.join(' | '):'nessun errore JavaScript');
  await b.close();srv.close();
})();
