(()=>{
const K='mockdb:';
const read=p=>{const v=localStorage.getItem(K+p);return v?JSON.parse(v):null};
const snap=(p,d)=>({id:p.split('/').pop(),exists:!!d,data:()=>d||undefined,metadata:{fromCache:false,hasPendingWrites:false}});
function docRef(path){return{id:path.split('/').pop(),path,
  get:async()=>snap(path,read(path)),
  set:async d=>{localStorage.setItem(K+path,JSON.stringify(d))},
  update:async d=>{const c=read(path);if(!c)throw{code:'invalid_argument'};localStorage.setItem(K+path,JSON.stringify({...c,...d}))},
  onSnapshot(next){let last;const tick=()=>{const v=localStorage.getItem(K+path);if(v!==last){last=v;next(snap(path,read(path)))}};setTimeout(tick,5);const h=setInterval(tick,120);return()=>clearInterval(h)},
  acquire:async o=>{const k='lease:'+path,v=localStorage.getItem(k);if(v){const [h,exp]=v.split('|');if(+exp>Date.now()&&h!==o.holder)return{acquired:false}}localStorage.setItem(k,o.holder+'|'+(Date.now()+(o.ttlMs||30000)));return{acquired:true}},
  collection:p=>collRef(path+'/'+p)}}
function collRef(path,f=[],ob=null,lim=1000){
  const run=()=>{let docs=Object.keys(localStorage).filter(k=>k.startsWith(K+path+'/')&&k.slice((K+path+'/').length).indexOf('/')<0).map(k=>{const p=k.slice(K.length);return snap(p,read(p))});
    for(const [fl,op,v] of f) docs=docs.filter(d=>op==='=='?d.data()[fl]===v:true);
    if(ob) docs.sort((a,b)=>(b.data()[ob[0]]-a.data()[ob[0]])*(ob[1]==='desc'?1:-1));
    docs=docs.slice(0,lim);return{docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{fromCache:false}}};
  return{path,doc:id=>docRef(path+'/'+id),where:(a,b,c)=>collRef(path,[...f,[a,b,c]],ob,lim),orderBy:(a,d)=>collRef(path,f,[a,d||'asc'],lim),limit:n=>collRef(path,f,ob,n),
   get:async()=>run(),onSnapshot(next){let last;const tick=()=>{const r=run();const s=JSON.stringify(r.docs.map(d=>d.data()));if(s!==last){last=s;next(r)}};setTimeout(tick,5);const h=setInterval(tick,150);return()=>clearInterval(h)}}}
const uid=new URLSearchParams(location.search).get('u')||'u1';
window.claude={use:async n=>n==='db'?{doc:docRef,collection:p=>collRef(p)}:n==='user'?{id:async()=>uid,can:async()=>true}:null};
})();

// i test non aspettano il conto alla rovescia di inizio partita
window.FF_NOCOUNT=window.FF_NOCOUNT??1;
