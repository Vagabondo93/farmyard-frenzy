// Test degli ordini di posizione: simula battaglie brevi e controlla che l'ordine cambi davvero il comportamento.
// Uso: node tools/test-ordini.js
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
const ok=(c,m)=>{console.log((c?'  OK   ':'  NO   ')+m);if(!c)process.exitCode=1};
function serve(){return new Promise(res=>{const s=http.createServer((q,r)=>{let f=q.url.split('?')[0];if(f==='/')f='/index.html';
  const p=path.join(ROOT,f);if(!fs.existsSync(p)){r.writeHead(404);return r.end()}
  let body=fs.readFileSync(p);if(f==='/index.html')body=body.toString().replace('let G;','let G;window.__g=()=>G;window.__t={makeSim:(...a)=>makeSim(...a),step:(...a)=>step(...a),dist:(...a)=>dist(...a)};');
  r.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'text/javascript':'application/octet-stream'});r.end(body)});
  s.listen(0,'127.0.0.1',()=>res(s))})}
(async()=>{
  const srv=await serve(),url=`http://127.0.0.1:${srv.address().port}/`,errs=[];
  const b=await chromium.launch(),ctx=await b.newContext({locale:'it-IT'});
  await ctx.addInitScript({content:fs.readFileSync(path.join(__dirname,'mock-db.js'),'utf8')+";try{localStorage.setItem('uovo-tut','1')}catch(e){}"});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForTimeout(500);
  await p.evaluate(()=>openPlay('bot','classic'));await p.click('#botBtn');await p.waitForSelector('#game:not(.hidden)');
  // sim(mia squadra, squadra avversaria, secondi) → posizioni nel tempo
  const run=(mine,foe,secs)=>p.evaluate(([mine,foe,secs])=>{const g=window.__g(),T=window.__t;
    const mk=l=>l.map((x,i)=>({uid:i+1,type:x.t,star:1,order:x.o||null,bench:false,px:x.x,py:x.y}));
    const sv=[g.players[0].board,g.players[1].board,g.players[0].ovr,g.players[1].ovr];
    g.players[0].ovr=mk(mine);g.players[1].ovr=mk(foe);const S=T.makeSim(12345);g.players[0].ovr=sv[2];g.players[1].ovr=sv[3];
    const out=[];let maxEgg={},minFoe={},near={},hit=0;
    for(let k=0;k<secs*60&&!S.over;k++){T.step(S,1/60);
      for(const u of S.units) if(u.alive&&u.side===0){const d=Math.hypot(u.x-S.eggs[0].home.x,u.y-S.eggs[0].home.y);maxEgg[u.type]=Math.max(maxEgg[u.type]||0,d);
        minFoe[u.type]=Math.min(minFoe[u.type]??1e9,Math.hypot(u.x-S.eggs[1].home.x,u.y-S.eggs[1].home.y))}}
    const fin={};for(const u of S.units) if(u.alive&&u.side===0) fin[u.type]=Math.hypot(u.x-S.eggs[0].home.x,u.y-S.eggs[0].home.y);
    const hp={};for(const u of S.units) hp[u.side+u.type]=Math.round(u.hp)+'/'+Math.round(u.maxHp);
    const units=S.units.filter(u=>u.alive).map(u=>({s:u.side,t:u.type,x:Math.round(u.x),y:Math.round(u.y)}));
    return {maxEgg,minFoe,hp,units,t:S.t,fin}},[mine,foe,secs]);
  console.log('Ordini di posizione');
  {const r=await run([{t:'bracconiere',o:'guardia',x:260,y:120},{t:'coltivatore',o:'guardia',x:300,y:420},{t:'puzzola',o:'guardia',x:200,y:300}],[{t:'tartaruga',x:40,y:40}],12);
    ok(Object.values(r.fin).every(d=>d<=150),`con Guardia Bracconiere, Coltivatore e Puzzola tornano e restano entro 150 dall'uovo (${Object.entries(r.fin).map(([k,v])=>k+' '+Math.round(v)).join(', ')})`)}
  {const r=await run([{t:'bracconiere',x:260,y:120},{t:'coltivatore',x:300,y:420}],[{t:'tartaruga',x:40,y:40}],12);
    ok(Object.values(r.maxEgg).some(d=>d>170),`senza ordine invece vanno a metà campo (max ${Object.entries(r.maxEgg).map(([k,v])=>k+' '+Math.round(v)).join(', ')})`)}
  {const r=await run([{t:'gatto',o:'assalto',x:200,y:270},{t:'veterinario',o:'assalto',x:200,y:300},{t:'trombettiere',o:'assalto',x:200,y:240}],[{t:'tartaruga',x:40,y:40}],14);
    ok(Object.values(r.minFoe).every(d=>d<200),`con Assalto Gatto, Veterinario e Trombettiere vanno all'uovo nemico (dist minima ${Object.entries(r.minFoe).map(([k,v])=>k+' '+Math.round(v)).join(', ')})`)}
  {const r=await p.evaluate(()=>{const g=window.__g(),T=window.__t;
    g.players[0].ovr=[{uid:1,type:'ladro',star:1,order:null,bench:false,px:120,py:100},{uid:2,type:'gatto',star:1,order:'scorta',bench:false,px:200,py:440}];
    g.players[1].ovr=[{uid:1,type:'mais',star:1,order:null,bench:false,px:600,py:440}];
    const S=T.makeSim(7);g.players[0].ovr=null;g.players[1].ovr=null;let far=0,n=0;
    for(let k=0;k<12*60&&!S.over;k++){T.step(S,1/60);const l=S.units.find(u=>u.type==='ladro'&&u.alive),c=S.units.find(u=>u.type==='gatto'&&u.alive);
      if(l&&c&&k>180){n++;if(Math.hypot(l.x-c.x,l.y-c.y)>110)far++}}
    return {far,n}});
    ok(r.n>0&&r.far/r.n<.15,`con Scorta il Gatto resta vicino al Ladro e ignora il Mais (lontano ${r.far}/${r.n} istanti)`)}
  {const r=await run([{t:'mucca',x:110,y:270}],[{t:'ladro',x:120,y:270}],20);
    const l=r.hp['1ladro'];ok(l&&+l.split('/')[0]<+l.split('/')[1],`la Mucca che spinge fa anche danno al Ladro (vita ${l})`)}
  // Nebbia: due nemici sul ponte non devono fare avanti e indietro senza combattere
  await p.click('#menuBtn');await p.evaluate(()=>openPlay('bot','fog'));await p.click('#botBtn');await p.waitForSelector('#game:not(.hidden)');
  {const r=await p.evaluate(()=>{const g=window.__g(),T=window.__t;
    g.players[0].ovr=[{uid:1,type:'gatto',star:1,order:null,bench:false,px:430,py:96},{uid:2,type:'ladro',star:1,order:'attesa',bench:false,px:40,py:500}];
    g.players[1].ovr=[{uid:1,type:'puzzola',star:1,order:'attesa',bench:false,px:455,py:96},{uid:2,type:'tartaruga',star:1,order:null,bench:false,px:40,py:40}];
    const S=T.makeSim(3);g.players[0].ovr=null;g.players[1].ovr=null;let flips=0,last={};hp0=S.units.find(u=>u.type==='puzzola').hp;
    for(let k=0;k<4*60&&!S.over;k++){T.step(S,1/60);for(const u of S.units) if(u.type==='gatto'||u.type==='puzzola'){const v=Math.sign(Math.round(u.x-(last[u.id]??u.x)));
      if(v&&last['d'+u.id]&&v!==last['d'+u.id])flips++;if(v)last['d'+u.id]=v;last[u.id]=u.x}}
    const pz=S.units.find(u=>u.type==='puzzola');return {flips,hp:Math.round(pz.hp),hp0:Math.round(hp0)}});
    ok(r.flips<12&&r.hp<r.hp0,`sul ponte in Nebbia Gatto e Puzzola si affrontano senza fare avanti e indietro (cambi di direzione ${r.flips}, vita Puzzola ${r.hp0}→${r.hp})`)}
  // Asino: esca che si difende
  console.log('Asino');
  await p.click('#menuBtn');await p.evaluate(()=>openPlay('bot','classic'));await p.click('#botBtn');await p.waitForSelector('#game:not(.hidden)');
  {const r=await p.evaluate(()=>{const g=window.__g(),T=window.__t,mk=(t,o,x,y)=>({uid:Math.floor(Math.random()*1e6),type:t,star:1,order:o,bench:false,px:x,py:y});
    const sim=(mine,foe,secs)=>{g.players[0].ovr=mine;g.players[1].ovr=foe;const S=T.makeSim(11);g.players[0].ovr=null;g.players[1].ovr=null;for(let k=0;k<secs*60&&!S.over;k++)T.step(S,1/60);return S};
    // la Cacciatrice nemica spara all'Asino invece che al Ladro
    // senza l'Asino la Cacciatrice (a x 520) sparerebbe al Cane, più vicino; l'Asino è a 120 da lei, dentro l'area dell'esca
    let S=sim([mk('asino','guardia',400,270),mk('cane','attesa',480,270),mk('ladro','attesa',60,60)],[mk('cacciatore','attesa',440,270),mk('tartaruga',null,40,40)],6);
    const as=S.units.find(u=>u.type==='asino'),cn=S.units.find(u=>u.type==='cane'),lured=as.hp<as.maxHp&&cn.hp===cn.maxHp,ord=as.order;
    // corazza: danni presi dall'Asino rispetto a una Mucca (senza corazza) contro lo stesso attaccante
    const lossVs=(t,me)=>{const S=sim([mk(me,null,440,270),mk('ladro','attesa',60,60)],[mk(t,null,440,270),mk('tartaruga',null,40,40)],4);const a=S.units.find(u=>u.type===me);return a.maxHp-a.hp};
    // calci: un Umano finisce più lontano di un Animale
    const kick=t=>{const S=sim([mk('asino',null,440,270),mk('ladro','attesa',60,60)],[mk(t,'attesa',475,270),mk('tartaruga',null,40,40)],1.2);const a=S.units.find(u=>u.type==='asino'),e=S.units.find(u=>u.type===t);return Math.hypot(e.x-a.x,e.y-a.y)};
    const q=t=>lossVs(t,'asino')/Math.max(1,lossVs(t,'mucca'));
    // un Apicoltore nemico lontano: l'Asino lascia il centro e va ad aggredirlo
    {const S=sim([mk('asino',null,300,270),mk('ladro','attesa',60,60)],[mk('apicoltore',null,150,500),mk('tartaruga',null,40,40)],25);
     const a=S.units.find(u=>u.type==='asino'),k=S.units.find(u=>u.type==='apicoltore');var beek={dist:Math.round(Math.hypot(a.x-k.x,a.y-k.y)),hit:!k.alive||k.hp<k.maxHp}}
    return{beek,lured,ord,hunter:q('cacciatore').toFixed(2),wolf:q('lupo').toFixed(2),human:Math.round(kick('poliziotto')),animal:Math.round(kick('cane'))}});
    ok(r.lured,'la Cacciatrice nemica spara all\'Asino invece che al Cane più vicino');
    ok(r.ord===null,'l\'Asino non prende ordini (Guardia ignorata)');
    ok(r.beek.hit,`con un Apicoltore nemico l'Asino va ad aggredirlo (distanza finale ${r.beek.dist})`);
    ok(+r.hunter<.8&&+r.wolf>.85,`corazza: danni rispetto alla Mucca ×${r.hunter} contro la Cacciatrice, ×${r.wolf} contro il Lupo (che la ignora)`);
    ok(r.human>r.animal,`i calci spingono un Umano più lontano di un Animale (${r.human} contro ${r.animal})`)}
  ok(errs.length===0,errs.length?'errori: '+errs.join(' | '):'nessun errore JavaScript');
  await b.close();srv.close();
})();
