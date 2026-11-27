// Test della sezione Meta: a fine partita si salva un riepilogo anonimo delle scelte e la home lo mostra.
// Uso: node tools/test-meta.js
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const shopBuy=async p=>{const b=await p.$('#cmBuy:not(.hidden) [data-buy]:not([disabled])');if(b)await b.click();if(await p.isVisible('#cardModal'))await p.click('#cmClose')}; // compra dalla scheda del market
const ROOT=path.join(__dirname,'..');
const ok=(c,m)=>{console.log((c?'  OK   ':'  NO   ')+m);if(!c)process.exitCode=1};
function serve(){return new Promise(res=>{const s=http.createServer((q,r)=>{let f=q.url.split('?')[0];if(f==='/')f='/index.html';
  const p=path.join(ROOT,f);if(!fs.existsSync(p)){r.writeHead(404);return r.end()}
  let body=fs.readFileSync(p);if(f==='/index.html')body=body.toString().replace('let G;','let G;window.__g=()=>G;');
  r.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'text/javascript':'application/octet-stream'});r.end(body)});
  s.listen(0,'127.0.0.1',()=>res(s))})}
(async()=>{
  const srv=await serve(),url=`http://127.0.0.1:${srv.address().port}/`,errs=[];
  const b=await chromium.launch(),ctx=await b.newContext({locale:'it-IT'});
  await ctx.route(/firebase-config\.js/,r=>r.fulfill({contentType:'text/javascript',body:'window.FF_FIREBASE=null;'}));
  await ctx.addInitScript({content:fs.readFileSync(path.join(__dirname,'mock-db.js'),'utf8')+";try{localStorage.setItem('uovo-tut','1')}catch(e){}"});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto(url+'?u=meta');await p.waitForSelector('#nickIn',{state:'visible'});await p.fill('#nickIn','MetaM');await p.click('#regBtn');await p.waitForSelector('#meBox:not(.hidden)');
  console.log('Meta dei giocatori');
  await p.evaluate(()=>openPlay('bot','classic'));await p.selectOption('#winSel','1');await p.click('#botBtn');await p.waitForSelector('#game:not(.hidden)');
  for(let r=0;r<20;r++){
    {// compra la carta più economica, così resta oro per l'ordine
     const i=await p.evaluate(()=>{let best=-1,bc=99;for(const el of document.querySelectorAll('#shop [data-shopcard]:not(.off)')){if(/Asino/.test(el.getAttribute('aria-label')))continue;
       const c=+(el.querySelector('.si-cost')?.textContent??el.querySelector('[data-buy]').getAttribute('aria-label').match(/per (\d+) oro/)[1]);if(c<bc){bc=c;best=+el.dataset.shopcard}}return best});
     const c=i>=0&&await p.$(`#shop [data-shopcard="${i}"]:not(.off)`);if(c){await c.click();await shopBuy(p)}}
    // sceglie un'unità che accetta ordini (l'Asino non ne prende)
    for(const s of await p.$$('[data-sel]')){const ty=await p.evaluate(el=>{const g=window.__g();const b=g.players[g.me].board.find(x=>x.uid===+el.dataset.sel);return b&&b.type},s);
      if(ty&&ty!=='asino'){await s.click();const o=await p.$('#orders [data-ord]:not([disabled])');if(o)await o.click();break}}
    for(let k=0;k<2;k++){const cs=await p.$$('#shop [data-shopcard]:not(.off)');if(!cs[0])break;(await cs[0].click(),await shopBuy(p))}
    await p.click('#readyBtn');await p.waitForFunction(()=>window.__g().phase==='battle',null,{timeout:20000});
    if(await p.isVisible('[data-speed="4"]'))await p.click('[data-speed="4"]');
    await p.waitForFunction(()=>['result','over'].includes(window.__g().phase),null,{timeout:120000});
    if(await p.evaluate(()=>window.__g().phase)==='over')break;await p.click('#bBtn')}
  ok(await p.evaluate(()=>window.__g().phase)==='over','partita finita');
  await p.waitForTimeout(300);
  const docs=await p.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('mockdb:telemetry/')).map(k=>JSON.parse(localStorage.getItem(k))));
  const d=docs[0]||{};const sum=o=>Object.values(o||{}).reduce((a,b)=>a+b,0);
  ok(docs.length===1,`un riepilogo salvato (${docs.length})`);
  ok(sum(d.of)>0&&sum(d.bo)>0&&sum(d.fi)>0,`registra carte offerte (${sum(d.of)}), comprate (${sum(d.bo)}) e in campo (${sum(d.fi)})`);
  ok(sum(d.oc)>0&&Object.keys(d.ot||{}).length>0,`registra gli ordini dati (${sum(d.oc)})`);
  ok(!JSON.stringify(d).includes('MetaM')&&!JSON.stringify(d).includes('"meta"'),'il riepilogo non contiene nickname né id del giocatore');
  await p.click('#menuBtn');if(await p.isVisible('#leaveYes'))await p.click('#leaveYes');await p.waitForSelector('#metaPanel');await p.waitForFunction(()=>document.querySelectorAll('#metaBody tr').length>0&&!/nessuna partita/i.test(document.getElementById('metaBody').textContent),null,{timeout:10000});
  ok(true,'la sezione Meta mostra i personaggi: '+(await p.$$eval('#metaBody tr',r=>r.slice(0,3).map(x=>x.textContent.replace(/\s+/g,' ').trim()).join(' | '))));
  ok(errs.length===0,errs.length?'errori: '+errs.join(' | '):'nessun errore JavaScript');
  await b.close();srv.close();
})();
