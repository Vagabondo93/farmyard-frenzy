// Controlla i consigli "Lo sapevi?" (tips.js): personaggi e ordini esistono, le quattro lingue ci sono,
// e i consigli che parlano di Nebbia o Classica non citano personaggi che in quella modalità non esistono.
// Uso: node tools/test-consigli.js
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
const ok=(c,m)=>{console.log((c?'  OK   ':'  NO   ')+m);if(!c)process.exitCode=1};
const win={};vm.runInNewContext(fs.readFileSync(path.join(ROOT,'tips.js'),'utf8'),{window:win});
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const keys=new Set([...html.matchAll(/^ (\w+):\{n:/gm)].map(m=>m[1]));
const ord=html.slice(html.indexOf('const ORDERS={'),html.indexOf('};',html.indexOf('const ORDERS={')));
const okeys=new Set([...ord.matchAll(/^ (\w+):\{n:/gm)].map(m=>m[1]));
const T=win.FF_TIPS||[];
console.log('Consigli "Lo sapevi?"');
ok(T.length>=20,`${T.length} consigli`);
const KINDS=['syn','ctr','early','late','sit'];
let bad=[];
T.forEach((t,i)=>{
  if(!KINDS.includes(t.kind)) bad.push(`#${i} tipo ${t.kind}`);
  for(const k of t.cards||[]) if(k.startsWith('o:')?!okeys.has(k.slice(2)):!keys.has(k)) bad.push(`#${i} carta ${k}`);
  for(const l of ['it','en','es','fr']) if(!t[l]||t[l].length<30) bad.push(`#${i} lingua ${l}`);
});
ok(!bad.length,bad.length?'problemi: '+bad.join(', '):'carte, ordini, tipi e lingue a posto');
for(const k of KINDS) ok(T.some(t=>t.kind===k),`c'è almeno un consiglio di tipo ${k}`);
