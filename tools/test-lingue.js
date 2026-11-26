// Test delle lingue: gioca nel menu, nel tutorial, nel market e in battaglia con la lingua scelta
// e segnala i testi rimasti in italiano (a schermo e disegnati sul campo).
// Uso: node tools/test-lingue.js [en|es|fr]   (senza argomento: tutte e tre)
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
// Un testo è "rimasto in italiano" se coincide con una frase del dizionario (o la contiene)
// e quella frase nella lingua scelta ha una traduzione diversa.
global.window={};for(const l of ['en','es','fr'])require(path.join(ROOT,'lang',l+'.js'));
function untranslated(L){
  const D=window.FF_I18N[L]||{},ex=new Set(),long=[],pats=[];
  for(const [k,v] of Object.entries(D)){if(k===v||!/[a-zà-ù]{3}/i.test(k.replace(/\{\d+\}/g,'')))continue;
    if(/\{\d+\}/.test(k)){const lit=k.replace(/\{\d+\}/g,'').trim();if(lit.length>=8)pats.push(new RegExp('^'+k.replace(/[.*+?^$()|[\]\\]/g,'\\$&').replace(/\\?\{\d+\}/g,'[\\s\\S]*?')+'$'))}
    else{ex.add(k);if(k.length>=14)long.push(k)}}
  return t=>{const c=t.replace(/^[\s·:•\-–—]+/,'').trim();return ex.has(c)||long.some(k=>c.includes(k))||pats.some(r=>r.test(c))};
}
function serve(){return new Promise(res=>{const s=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';
  if(f==='/firebase-config.js'){r.writeHead(200,{'Content-Type':'text/javascript'});return r.end('window.FF_FIREBASE=null;')}
  const p=path.join(ROOT,f);if(!fs.existsSync(p)){r.writeHead(404);return r.end()}
  let body=fs.readFileSync(p);if(f==='/index.html')body=body.toString().replace('let G;','let G;window.__g=()=>G;');
  r.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'text/javascript':f.endsWith('.webp')?'image/webp':f.endsWith('.jpg')?'image/jpeg':'application/octet-stream'});r.end(body)});
  s.listen(0,'127.0.0.1',()=>res(s))})}
(async()=>{
  const srv=await serve(),b=await chromium.launch();let bad=0;
  for(const L of (process.argv[2]?[process.argv[2]]:['en','es','fr'])){
    const p=await (await b.newContext({viewport:{width:1500,height:1000}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n').slice(1,4).join(' | ')));
    await p.addInitScript(()=>{window.__canvas=new Set();const o=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...a){window.__canvas.add(String(t));return o.call(this,t,...a)}});
    await p.goto(`http://127.0.0.1:${srv.address().port}/?lang=${L}`);
    const seen=new Set();
    const grab=async()=>{for(const t of await p.evaluate(()=>{const out=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
      while(n=w.nextNode()){const e=n.parentElement;if(!e||e.closest('script,style,[data-notr]'))continue;const s=n.nodeValue.trim();if(s)out.push(s)}
      document.querySelectorAll('[title],[placeholder],[aria-label],[alt]').forEach(e=>{for(const a of ['title','placeholder','aria-label','alt']){const v=e.getAttribute(a);if(v)out.push(v)}});
      return out.concat([...window.__canvas])}))seen.add(t)};
    await grab();
    for(let i=0;i<6;i++){await p.click('#tutNext');await grab()}
    await p.click('#botBtn').catch(()=>{});await p.waitForTimeout(400);await grab();
    for(let k=0;k<3;k++){const cs=await p.$$('#shop [data-buy]:not(.off)');if(cs[0])await cs[0].click();await grab()}
    const c=await p.$('[data-card]:visible');if(c){await c.click();await p.waitForTimeout(200);await grab();await p.keyboard.press('Escape')}
    await p.click('#readyBtn');await p.waitForTimeout(1500);await grab();
    await p.click('[data-speed="4"]').catch(()=>{});
    await p.waitForFunction(()=>['result','over'].includes(window.__g().phase),null,{timeout:120000});await grab();
    await p.click('#bBtn');await p.waitForTimeout(300);await grab();
    const isIt=untranslated(L),left=[...seen].filter(isIt);
    console.log(`${L}: ${seen.size} testi controllati, ${left.length} ancora in italiano${errs.length?', ERRORI: '+errs.join(' | '):''}`);
    for(const t of left.slice(0,60))console.log('   · '+t.slice(0,160));
    bad+=left.length+errs.length;await p.close();
  }
  await b.close();srv.close();process.exitCode=bad?1:0;
})();
