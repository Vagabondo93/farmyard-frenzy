// Test dell'app installabile (PWA): manifest, icone, service worker e gioco offline.
// Uso: node tools/test-pwa.js
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
const ok=(c,m)=>{console.log((c?'  OK   ':'  NO   ')+m);if(!c)process.exitCode=1};
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
function serve(){return new Promise(res=>{const s=http.createServer((q,r)=>{let f=q.url.split('?')[0];if(f==='/')f='/index.html';
  const p=path.join(ROOT,f);if(!fs.existsSync(p)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(p))});
  s.listen(0,'127.0.0.1',()=>res(s))})}
(async()=>{
  console.log('App installabile');
  const man=JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.webmanifest'),'utf8'));
  ok(man.icons.every(i=>fs.existsSync(path.join(ROOT,i.src)))&&man.icons.some(i=>i.sizes==='512x512')&&man.icons.some(i=>i.purpose==='maskable'),'manifest valido: icone 192, 512 e maskable presenti');
  ok(man.display==='fullscreen'&&man.orientation==='landscape','a schermo intero e in orizzontale');
  const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8'),pre=JSON.parse(sw.slice(sw.indexOf('PRECACHE=')+9,sw.indexOf(';',sw.indexOf('PRECACHE='))));
  const icons=fs.readdirSync(path.join(ROOT,'icons')).filter(f=>f.endsWith('.webp')).map(f=>'icons/'+f);
  const miss=icons.filter(i=>!pre.includes(i)),gone=pre.filter(u=>u!=='./'&&!fs.existsSync(path.join(ROOT,u)));
  ok(!miss.length,miss.length?'icone da aggiungere a PRECACHE in sw.js: '+miss.join(', '):'tutte le icone sono salvate per l\'uso offline');
  ok(!gone.length,gone.length?'file in PRECACHE che non esistono: '+gone.join(', '):'tutti i file di PRECACHE esistono');
  const srv=await serve(),url=`http://127.0.0.1:${srv.address().port}/`,errs=[];
  const b=await chromium.launch(),ctx=await b.newContext({locale:'it-IT'});
  await ctx.addInitScript({content:fs.readFileSync(path.join(__dirname,'mock-db.js'),'utf8')+";try{localStorage.setItem('uovo-tut','1')}catch(e){}"});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto(url+'?sw=1'); // nei browser automatici il service worker si attiva solo con ?sw=1
  const active=await p.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return !!r.active});
  ok(active,'il service worker si attiva');
  await p.waitForTimeout(1500); // lascia finire il salvataggio delle copie
  await ctx.setOffline(true);await p.reload();await p.waitForTimeout(800);
  ok(await p.isVisible('#playBtn'),'senza rete la pagina si riapre dalla copia salvata');
  await p.evaluate(()=>openPlay('bot','classic'));await p.click('#botBtn');await p.waitForSelector('#game:not(.hidden)');
  const img=await p.evaluate(()=>{const i=new Image();i.src='icons/lupo.webp';return new Promise(r=>{i.onload=()=>r(true);i.onerror=()=>r(false)})});
  ok(img,'senza rete si gioca contro il bot e le icone si caricano');
  ok(errs.length===0,errs.length?'errori: '+errs.join(' | '):'nessun errore JavaScript');
  await b.close();srv.close();
})();
