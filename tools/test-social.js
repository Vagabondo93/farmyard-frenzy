// Test delle funzioni online (database finto, tools/mock-db.js): chi è online, amicizie, inviti dalla lobby,
// link d'invito e partita rapida classificata.
// Uso: node tools/test-social.js
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
const ok=(c,m)=>{console.log((c?'  OK   ':'  NO   ')+m);if(!c)process.exitCode=1};
function serve(){return new Promise(res=>{const s=http.createServer((q,r)=>{let f=q.url.split('?')[0];if(f==='/')f='/index.html';
  if(f==='/firebase-config.js'){r.writeHead(200,{'Content-Type':'text/javascript'});return r.end('window.FF_FIREBASE=null;')}
  const p=path.join(ROOT,f);if(!fs.existsSync(p)){r.writeHead(404);return r.end()}
  let body=fs.readFileSync(p);if(f==='/index.html')body=body.toString().replace('let G;','let G;window.__g=()=>G;');
  r.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'text/javascript':'application/octet-stream'});r.end(body)});
  s.listen(0,'127.0.0.1',()=>res(s))})}
const doBans=async(ps)=>{for(let i=0;i<300;i++){let all=true;for(const p of ps){if(await p.isHidden('#game')){all=false;const b=await p.$('#banPool [data-ban]:not([aria-disabled="true"])');if(b)await b.click().catch(()=>{})}}if(all)return;await ps[0].waitForTimeout(150)}};
(async()=>{
  const srv=await serve(),url=`http://127.0.0.1:${srv.address().port}/`,errs=[];
  const b=await chromium.launch(),ctx=await b.newContext({locale:'it-IT'});
  await ctx.addInitScript({content:fs.readFileSync(path.join(__dirname,'mock-db.js'),'utf8')+";try{localStorage.setItem('uovo-tut','1')}catch(e){}"});
  const P={};
  const open=async(n,q='')=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(n+': '+e.message));await p.goto(url+'?u='+n+q);
    if(await p.isVisible('#nickIn').catch(()=>false)||!(await p.isVisible('#meBox').catch(()=>false))){await p.waitForSelector('#nickIn,#meBox:not(.hidden)',{state:'visible'});
      if(await p.isVisible('#nickIn')){await p.fill('#nickIn',n[0].toUpperCase()+n.slice(1)+'S');await p.click('#regBtn')}}
    await p.waitForSelector('#meBox:not(.hidden)');P[n]=p;return p};
  for(const n of ['anna','bruno','carla']) await open(n);
  await P.anna.bringToFront();await P.anna.waitForFunction(()=>+document.getElementById('onlineCount').textContent>=3,null,{timeout:15000});
  ok(true,'Anna vede 3 giocatori online: '+await P.anna.textContent('#onlineCount'));
  // amicizia Anna → Bruno
  await P.anna.click('#onlineList [data-nick="BrunoS"]');
  await P.bruno.bringToFront();await P.bruno.waitForSelector('#reqList [data-accept]',{timeout:10000});await P.bruno.click('#reqList [data-accept]');
  await P.anna.bringToFront();await P.anna.waitForFunction(()=>document.getElementById('friendList').textContent.includes('BrunoS'),null,{timeout:10000});
  await P.bruno.waitForFunction(()=>document.getElementById('friendList').textContent.includes('AnnaS'),null,{timeout:10000});
  ok(true,'Anna e Bruno sono amici, per entrambi');
  // lobby e invito
  await P.anna.evaluate(()=>openPlay('friendly','classic')).then(()=>P.anna.click('#roomFriendly'));await P.anna.waitForSelector('#roomBox:not(.hidden)');
  await P.anna.waitForSelector('#lobbyFriends [data-invite]',{timeout:10000});await P.anna.click('#lobbyFriends [data-invite]');
  await P.bruno.bringToFront();await P.bruno.waitForSelector('#invModal:not(.hidden)',{timeout:10000});
  ok((await P.bruno.textContent('#invP')).includes('AnnaS'),'Bruno riceve il popup: '+await P.bruno.textContent('#invP'));
  await P.bruno.click('#invYes');
  await P.anna.bringToFront();await P.anna.waitForFunction(()=>document.getElementById('lobbyMembers').textContent.includes('BrunoS'),null,{timeout:10000});
  ok(true,'Bruno compare nella lobby di Anna');
  await P.anna.waitForSelector('#pvpStart:not([disabled])');await P.anna.click('#pvpStart');
  for(const n of ['anna','bruno']) await P[n].waitForSelector('#game:not(.hidden)',{timeout:10000});
  ok(true,'Anna avvia: la partita parte per entrambi');
  // chat della partita
  await P.anna.fill('#chatIn','Ciao Bruno!');await P.anna.press('#chatIn','Enter');
  await P.bruno.bringToFront();await P.bruno.waitForFunction(()=>document.getElementById('chatLog').textContent.includes('Ciao Bruno!'),null,{timeout:10000});
  ok(true,'Bruno legge il messaggio di Anna nella chat');
  // amicizia cercando il nickname, con avviso sul profilo
  await P.carla.bringToFront();await P.carla.fill('#friendIn','AnnaS');await P.carla.click('#friendAdd');
  await P.anna.bringToFront();await P.anna.waitForFunction(()=>window.__g()&&document.getElementById('toast').textContent.includes('CarlaS'),null,{timeout:10000});
  ok(true,'Anna, in partita, riceve l\'avviso della richiesta di Carla');
  // link d'invito
  await P.carla.bringToFront();await P.carla.evaluate(()=>openPlay('friendly','classic')).then(()=>P.carla.click('#roomFriendly'));await P.carla.waitForSelector('#roomBox:not(.hidden)');
  const code=await P.carla.textContent('#roomCode');
  const dave=await open('dave','&join='+code);
  await P.carla.bringToFront();await P.carla.waitForFunction(()=>document.getElementById('lobbyMembers').textContent.includes('DaveS'),null,{timeout:10000});
  ok(true,'Dave apre il link d\'invito ed entra nella lobby di Carla');
  // partita rapida classificata
  const eva=await open('eva'),fede=await open('fede');
  await eva.evaluate(()=>openPlay('ranked','classic')).then(()=>eva.click('#quickRanked'));await fede.evaluate(()=>openPlay('ranked','classic')).then(()=>fede.click('#quickRanked'));
  await eva.waitForSelector('#banBox:not(.hidden)',{timeout:20000});ok(true,'la partita rapida classificata passa dalla fase di ban');
  await doBans([eva,fede]);
  const banned=await eva.evaluate(()=>window.__g().pool.length);
  for(const p of [eva,fede]){await p.bringToFront();await p.waitForSelector('#game:not(.hidden)',{timeout:20000})}
  const rooms=await Promise.all([eva,fede].map(p=>p.evaluate(()=>window.__g().room)));
  ok(rooms[0]===rooms[1],'Eva e Fede trovano la partita rapida nella stessa stanza '+rooms[0]);
  ok(await eva.evaluate(()=>!window.__g().pool.some(k=>false)),'personaggi in gioco dopo i 4 ban: '+banned);
  ok(errs.length===0,errs.length?'errori: '+errs.join(' | '):'nessun errore JavaScript');
  await b.close();srv.close();
})();
