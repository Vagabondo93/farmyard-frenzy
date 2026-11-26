// Estrae dal gioco tutti i testi visibili in italiano, come "frammenti" con segnaposto {0},{1}…
// Uso: node tools/i18n-estrai.js index.html > testi.json   (richiede: npm install)
const fs=require('fs'),acorn=require('acorn'),walk=require('acorn-walk');
const src=fs.readFileSync(process.argv[2],'utf8');
const keys=new Map();
const norm=s=>s.replace(/\s+/g,' ').trim();
const TAG=/<[^>]*>/g;
function isText(s){
  const t=s.replace(/\{\d+\}/g,'').replace(/&[a-z]+;/g,' ');
  if(!/[A-Za-zÀ-ÿ]{2,}/.test(t)) return false;
  if(/^[\w.#\-\s,:%()]*$/.test(t)&&!/\s/.test(t.trim())&&!/[A-Z][a-zà-ù]/.test(t)) return false; // id, classi, parole chiave
  if(/(stroke|fill|xmlns|viewBox|rgba?\(|px|var\(--|font-|translate\(|data:image|https?:|\/\/|=>|function|\bconst\b|\breturn\b|rooms\/|players\/|nicks\/)/.test(t)) return false;
  if(/^(M|m)[\d\s.,\-]/.test(t)) return false;
  return true;
}
function add(raw,where){
  // spezza sui tag: ogni pezzo di testo diventa una chiave; dai tag prendo title/alt/aria-label/placeholder
  for(const m of raw.matchAll(/\b(?:title|alt|aria-label|placeholder)="([^"]*)"/g)) push(m[1],where);
  for(const part of raw.split(TAG)) push(part,where);
}
function push(p,where){
  let k=norm(p);if(!k)return;
  // rinumera i segnaposto da 0
  let i=0;const map={};k=k.replace(/\{(\d+)\}/g,(m,n)=>{if(!(n in map))map[n]=i++;return '{'+map[n]+'}'});
  if(/^\{\d+\}$/.test(k)) return;
  if(!isText(k)) return;
  if(!keys.has(k)) keys.set(k,where);
}
function tpl(node){let s='';node.quasis.forEach((q,i)=>{s+=q.value.cooked;if(i<node.expressions.length)s+='{'+i+'}'});return s}
function flat(n,out){if(n.type==='BinaryExpression'&&n.operator==='+'){flat(n.left,out);flat(n.right,out)}else out.push(n);return out}
const scripts=[...src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
for(const m of scripts){
  const off=src.slice(0,m.index).split('\n').length;
  let ast;try{ast=acorn.parse(m[1],{ecmaVersion:'latest',allowReturnOutsideFunction:true,allowAwaitOutsideFunction:true,locations:true})}catch(e){console.error('parse',e.message);continue}
  walk.full(ast,node=>{
    const where=off+(node.loc?node.loc.start.line-1:0);
    if(node.type==='Literal'&&typeof node.value==='string') add(node.value,where);
    else if(node.type==='TemplateLiteral') add(tpl(node),where);
    else if(node.type==='BinaryExpression'&&node.operator==='+'){
      const parts=flat(node,[]);if(!parts.some(p=>p.type==='Literal'&&typeof p.value==='string'))return;
      let s='',i=0;for(const p of parts){if(p.type==='Literal'&&typeof p.value==='string')s+=p.value;else if(p.type==='TemplateLiteral'&&!p.expressions.length)s+=p.quasis[0].value.cooked;else s+='{'+(i++)+'}'}
      add(s,where);
    }
  });
}
// HTML statico (fuori dagli script e dagli stili)
const html=src.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g,m=>m.replace(/[^\n]/g,' '));
for(const m of html.matchAll(/>([^<>]+)</g)) push(m[1].replace(/&nbsp;/g,' ').replace(/&amp;/g,'&'),html.slice(0,m.index).split('\n').length);
for(const m of html.matchAll(/\b(?:title|alt|aria-label|placeholder|content)="([^"]*)"/g)) push(m[1],html.slice(0,m.index).split('\n').length);
const t=src.match(/<title>([^<]*)<\/title>/);
const out=[...keys].map(([k,l])=>({k,l})).sort((a,b)=>a.l-b.l);
process.stdout.write(JSON.stringify(out,null,0).replace(/\},\{/g,'},\n{'));
console.error(out.length,'chiavi');
