// Firebase finto per i test: imita le parti di firebase "compat" usate dal gioco (login, Firestore),
// salvando tutto nel localStorage del browser così più schede condividono lo stesso "database".
(()=>{
const K='mockfb:';
const read=p=>{const v=localStorage.getItem(K+p);return v?JSON.parse(v):null};
const snap=(p,d)=>({id:p.split('/').pop(),exists:!!d,data:()=>d||undefined});
const poll=(fn,next)=>{let last;const tick=()=>{const v=fn();const s=JSON.stringify(v[1]);if(s!==last){last=s;next(v[0])}};setTimeout(tick,5);const h=setInterval(tick,120);return()=>clearInterval(h)};
function docRef(path){return{id:path.split('/').pop(),path,
  get:async()=>snap(path,read(path)),
  set:async(d,o)=>{const cur=o&&o.merge?read(path)||{}:{};localStorage.setItem(K+path,JSON.stringify({...cur,...d}))},
  update:async d=>{const c=read(path);if(!c)throw new Error('not-found');localStorage.setItem(K+path,JSON.stringify({...c,...d}))},
  delete:async()=>localStorage.removeItem(K+path),
  onSnapshot:(next,err)=>poll(()=>{const d=read(path);return[snap(path,d),d]},next),
  collection:p=>coll(path+'/'+p)}}
function coll(path,f=[],ob=null,lim=1000){
  const run=()=>{let docs=Object.keys(localStorage).filter(k=>k.startsWith(K+path+'/')&&!k.slice((K+path+'/').length).includes('/')).map(k=>{const p=k.slice(K.length);return snap(p,read(p))});
    for(const [fl,op,v] of f) docs=docs.filter(d=>d.data()[fl]===v);
    if(ob){docs=docs.filter(d=>d.data()[ob[0]]!=null);docs.sort((a,b)=>(b.data()[ob[0]]-a.data()[ob[0]])*(ob[1]==='desc'?1:-1))}
    docs=docs.slice(0,lim);return{docs,size:docs.length,empty:!docs.length}};
  return{where:(a,b,c)=>coll(path,[...f,[a,b,c]],ob,lim),orderBy:(a,d)=>coll(path,f,[a,d||'asc'],lim),limit:n=>coll(path,f,ob,n),
    get:async()=>run(),onSnapshot:(next)=>poll(()=>{const r=run();return[r,r.docs.map(d=>d.data())]},next),doc:id=>docRef(path+'/'+id)}}
const uid=new URLSearchParams(location.search).get('u')||'u1';
const auth={currentUser:null,_cb:null,
  onAuthStateChanged(cb){this._cb=cb;setTimeout(()=>cb(this.currentUser),20);return()=>{}},
  async signInAnonymously(){this.currentUser={uid};this._cb&&this._cb(this.currentUser)},
  async signInWithPopup(){this.currentUser={uid};this._cb&&this._cb(this.currentUser)},
  async signOut(){this.currentUser=null;this._cb&&this._cb(null)}};
const fs={doc:docRef,collection:p=>coll(p),runTransaction:async fn=>fn({get:r=>r.get(),set:(r,d,o)=>r.set(d,o)})};
window.firebase={initializeApp(){},auth:Object.assign(()=>auth,{GoogleAuthProvider:function(){}}),firestore:()=>fs};
})();
