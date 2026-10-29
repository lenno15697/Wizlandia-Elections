'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
module.exports=function(){
  const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
  function node(attrs=''){
    const attributes=Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]])),classes=new Set(),properties={};
    return{attributes,id:attributes.id,dataset:Object.fromEntries(Object.entries(attributes).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,a)=>a.toUpperCase()),v])),value:attributes.value||'',checked:/\bchecked\b/.test(attrs),hidden:/\bhidden\b/.test(attrs),innerHTML:'',textContent:'',files:[],listeners:{},style:{setProperty(k,v){properties[k]=v;},getPropertyValue:k=>properties[k]},classList:{toggle(k,on){if(on===undefined)on=!classes.has(k);on?classes.add(k):classes.delete(k);},contains:k=>classes.has(k)},setAttribute(k,v){attributes[k]=v;},addEventListener(k,v){this.listeners[k]=v;},querySelector(){return null;},appendChild(){},focus(){},click(){},remove(){},showModal(){},close(){}};
  }
  const all=[...html.matchAll(/<[a-z][^>]*>/g)].map(m=>node(m[0])),nodes=new Map(all.filter(n=>n.id).map(n=>[n.id,n]));
  for(const m of html.matchAll(/<select[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)){const o=m[2].match(/<option[^>]*value="([^"]+)"/);if(o)nodes.get(m[1]).value=o[1];}
  const body=node(),scroll=node();let lastBlob;
  const document={body,activeElement:null,getElementById(id){assert.ok(nodes.has(id),'Missing HTML element: '+id);return nodes.get(id);},querySelectorAll(query){const key=query.slice(1,-1);return all.filter(n=>Object.hasOwn(n.attributes,key));},querySelector:()=>scroll,createElement:()=>node()};
  const context={window:{WizlandiaData:require('../data.js'),WizlandiaEngine:require('../engine.js'),WizlandiaDiagrams:require('../diagrams.js'),WizlandiaGeography:require('../district-geography.js'),WizlandiaSenate:require('../senate.js')},document,getComputedStyle:()=>({getPropertyValue:()=>'#202535'}),localStorage:{getItem(){return null;},setItem(){}},setTimeout:f=>setTimeout(f,0),clearTimeout,cancelAnimationFrame(){},requestAnimationFrame:f=>{f();return 1;},URL:{createObjectURL(blob){lastBlob=blob;return'blob:test';},revokeObjectURL(){}},Blob,console};
  vm.runInNewContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),context);
  return{get:id=>nodes.get(id),config:async()=>{nodes.get('save-config').onclick();return JSON.parse(await lastBlob.text());},blob:()=>lastBlob,html};
};
