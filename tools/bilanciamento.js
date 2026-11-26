// Bilanciamento: battaglie casuali a budget uguale, simulate senza grafica.
// Uso (dalla cartella del progetto):  node tools/bilanciamento.js [battaglie] [oro] [quota ★★] [round]
//   es. node tools/bilanciamento.js 6000 14 0.2 4      VAR=fog node tools/bilanciamento.js 3000
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),os=require('os');
const VAR=process.env.VAR||'classic',N=+process.argv[2]||3000, BUDGET=+process.argv[3]||12, STAR2=+process.argv[4]||0, ROUND=+process.argv[5]||3;
(async()=>{
const src=fs.readFileSync(process.env.F||path.join(__dirname,'..','index.html'),'utf8').replace('let G;',
 'let G;window.__api={UNITS:()=>UNITS,ORD:()=>ORDERS,COST:()=>COST,makeSim:(s)=>makeSim(s),step:(S,d)=>step(S,d),setG:g=>{G=g},pos:(t,n,r)=>defaultPos(t,n,r),mul:mulberry};');
const tmp=path.join(os.tmpdir(),'ff-bilanciamento-'+process.pid+'.html');fs.writeFileSync(tmp,src);
const b=await chromium.launch();const p=await b.newPage({locale:'it-IT'});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+tmp);
const res=await p.evaluate(({N,BUDGET,STAR2,ROUND,VAR})=>{
  const A=window.__api,U=A.UNITS(),O=Object.keys(A.ORD()),C=A.COST();
  // solo i personaggi davvero acquistabili in questa mappa e in questo round
  const types=Object.keys(U).filter(k=>!U[k].hidden&&(VAR==='fog'||!U[k].fogOnly)&&!(VAR==='fog'&&U[k].classicOnly)&&(U[k].minRound||1)<=ROUND&&(U[k].t<3||ROUND>=3));
  const rng=A.mul(12345);
  const thieves=types.filter(t=>U[t].tags.includes('Ladro'));
  const team=()=>{let g=BUDGET,list=[];let guard=0;
    {const t=thieves.filter(t=>(U[t].cost??C[U[t].t])<=g)[Math.floor(rng()*thieves.filter(t=>(U[t].cost??C[U[t].t])<=g).length)];g-=(U[t].cost??C[U[t].t]);list.push({type:t,star:1,order:rng()<.3?O[Math.floor(rng()*O.length)]:null})}
    while(g>=1&&list.length<7&&guard++<50){const t=types[Math.floor(rng()*types.length)];const c=(U[t].cost??C[U[t].t])*(STAR2&&rng()<STAR2?3:1);if(c>g)continue;g-=c;
      list.push({type:t,star:c>(U[t].cost??C[U[t].t])?2:1,order:rng()<.3?O[Math.floor(rng()*O.length)]:null})}
    return list.map((x,i)=>({uid:i+1,...x,bench:false,...A.pos(x.type,i,rng)}));};
  const st={};for(const t of types)st[t]={n:0,w:0,l:0,d:0};const os={};for(const o of O)os[o]={n:0,w:0,l:0,d:0};
  let draws=0,timeouts=0,tot=0,len=0;
  for(let i=0;i<N;i++){
    const tA=team(),tB=team();
    A.setG({me:0,variant:VAR,round:ROUND,players:[{board:tA},{board:tB}]});
    const S=A.makeSim(Math.floor(rng()*1e9));let k=0;
    while(!S.over&&k++<6000)A.step(S,1/60);
    const w=S.over?S.over.winner:null; tot++; len+=S.t;
    if(w===null){draws++;if(S.t>=S.T-0.02)timeouts++}
    [tA,tB].forEach((tm,side)=>{const seen=new Set();for(const u of tm){
      const r=w===null?'d':w===side?'w':'l';
      if(!seen.has(u.type)){seen.add(u.type);st[u.type].n++;st[u.type][r]++}
      if(u.order){os[u.order].n++;os[u.order][r]++}}});
  }
  return{st,os,draws,timeouts,tot,avg:len/tot};
},{N,BUDGET,STAR2,ROUND,VAR});
const f=x=>(100*x).toFixed(0).padStart(3)+'%';
console.log(`\n${res.tot} battaglie, budget ${BUDGET} oro, round ${ROUND}${STAR2?`, ${STAR2*100}% ★★`:''}: senza presa ${f(res.draws/res.tot)} (a tempo scaduto ${f(res.timeouts/res.tot)}), durata media ${res.avg.toFixed(1)}s`);
console.log('UNITÀ            presenze  vince  perde  pari   vittorie sulle partite decise');
for(const [t,s] of Object.entries(res.st).sort((a,b)=>(b[1].w/(b[1].w+b[1].l||1))-(a[1].w/(a[1].w+a[1].l||1))))
  console.log(t.padEnd(16),String(s.n).padStart(7),f(s.w/s.n),f(s.l/s.n),f(s.d/s.n),'   ',f(s.w/(s.w+s.l||1)));
console.log('ORDINI');
for(const [t,s] of Object.entries(res.os).sort((a,b)=>(b[1].w/(b[1].w+b[1].l||1))-(a[1].w/(a[1].w+a[1].l||1))))
  console.log(t.padEnd(16),String(s.n).padStart(7),'   ',f(s.w/(s.w+s.l||1)));
if(process.env.OUT)fs.writeFileSync(process.env.OUT,JSON.stringify({VAR,N,BUDGET,STAR2,ROUND,...res}));
console.log(errs.length?'ERRORI: '+errs.join(' | '):'Nessun errore.');await b.close();})();
