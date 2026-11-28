// Search adapter: indexes are built from actual rows, independent of upstream shard hashes.
export const normalize = value => String(value).normalize('NFC').trim().replace(/\s+/gu,' ').toLowerCase();
const cached=new Map(),pending=new Map();let cacheBytes=0;
export const metrics={requests:0,cacheHits:0,bytes:0};
export async function getJSON(path,{fresh=false,timeout=15000}={}){
 if(!fresh&&cached.has(path)){const e=cached.get(path);cached.delete(path);cached.set(path,e);metrics.cacheHits++;return e.data;}
 if(pending.has(path))return pending.get(path);
 const task=(async()=>{
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeout);
  try{
   const res=await fetch(path,{signal:abort.signal,cache:fresh?'no-cache':'default'});
   if(!res.ok)throw new Error(`HTTP ${res.status}`);
   const text=await res.text(),data=JSON.parse(text),size=new TextEncoder().encode(text).length;
   metrics.requests++;metrics.bytes+=size;
   if(!fresh){while(cacheBytes+size>8*1024*1024&&cached.size){const key=cached.keys().next().value;cacheBytes-=cached.get(key).size;cached.delete(key);}cached.set(path,{data,size});cacheBytes+=size;}
   return data;
  }finally{clearTimeout(timer);}
 })();pending.set(path,task);
 try{return await task;}finally{pending.delete(path);}
}

// Only explicitly published shards are read. No automatic fine slicing or reverse index files.
export class LocalDictionary{
 constructor(config,root='./'){this.config=config;this.base=root+config.base;this.loading=null;}
 async load(){if(!this.loading)this.loading=this.build().catch(e=>{this.loading=null;throw e;});return this.loading;}
 async build(){
  const [manifest,ed,refs]=await Promise.all(['manifest.json','corrections.json','references.json'].map(n=>getJSON(this.base+n,{fresh:true})));
  if(!Array.isArray(manifest.shards)||manifest.shards.some(n=>!/^zh-en-(?:[0-5][0-9]|6[0-3])\.json$/.test(n))||new Set(manifest.shards).size!==manifest.shards.length)throw Error('发布清单分片名不合法或重复');
  if(!Array.isArray(ed.corrections)||!Array.isArray(ed.aliases)||!refs.references||typeof refs.references!=='object')throw Error('修订或来源文件格式错误');
  const rows=[],byWord=new Map(),warnings=[];
  for(let i=0;i<manifest.shards.length;i+=4){const files=manifest.shards.slice(i,i+4);const groups=await Promise.all(files.map(n=>getJSON(this.base+'shards/'+n,{fresh:true})));
   groups.forEach((group,j)=>{if(!Array.isArray(group))throw Error(files[j]+' 不是词条数组');for(const r of group){if(!r||typeof r.w!=='string'||!r.w.trim()||typeof r.t!=='string'||!Array.isArray(r.d))throw Error(files[j]+' 词条结构不合法');if(byWord.has(r.w))throw Error('重复词头：'+r.w);byWord.set(r.w,rows.length);rows.push({record:r,id:rows.length,shard:files[j],review:null});}});
  }
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b), seen=new Set();
  for(const c of ed.corrections){if(c.status!=='human_confirmed'||!byWord.has(c.w))continue;const item=rows[byWord.get(c.w)];if(seen.has(c.w))throw Error('重复人工修订：'+c.w);seen.add(c.w);
   const patch=c.set||{},expected=c.expected||{},keys=Object.keys(patch);if(keys.some(k=>!['t','d'].includes(k))||keys.some(k=>!(k in expected))||('t'in patch&&typeof patch.t!=='string')||('d'in patch&&!Array.isArray(patch.d)))throw Error('不合法的修订：'+c.w);
   if(!keys.every(k=>equal(item.record[k],expected[k])||equal(item.record[k],patch[k]))){warnings.push(c.w);item.review={conflict:true};continue;}
   item.record={...item.record,...patch};item.review={...c,references:(c.reference_ids||[]).map(id=>({id,...(refs.references[id]||{})}))};
  }
  const zh=new Map(),en=new Map();function add(map,key,id){key=normalize(key);if(!key)return;if(!map.has(key))map.set(key,new Set());map.get(key).add(id);}
  // Translation strings and individual pipe/semicolon-separated alternatives only; no word tokenization.
  for(const {record:r,id} of rows){for(const k of [r.w,r.zh_cn,r.zh_tw])if(typeof k==='string')add(zh,k,id);for(const t of [r.t,...r.d.map(s=>s.translation||''),...(r.senses_enrichment?.detailed_senses||[]).map(s=>s.en_translation||'')]){const clean=String(t).replace(/<\/?(?:u|b|i|em|strong|sup|sub)>/gi,'');add(en,clean,id);for(const a of clean.split(/[|;；]/))add(en,a,id);}}
  for(const a of ed.aliases){if(typeof a.query==='string'&&byWord.has(a.w))add(zh,a.query,byWord.get(a.w));}
  return {rows,warnings,shardCount:manifest.shards.length,maps:{'zh-en':zh,'en-zh':en},keys:{'zh-en':[...zh.keys()].sort(),'en-zh':[...en.keys()].sort()}};
 }
 async exact(dir,query){const s=await this.load();return [...(s.maps[dir].get(normalize(query))||[])];}
 async prefix(dir,query,offset=0,limit=40){const q=normalize(query);if(!q)return {items:[],more:false};const s=await this.load(),keys=s.keys[dir],map=s.maps[dir];let lo=0,hi=keys.length;while(lo<hi){const mid=(lo+hi)>>1;if(keys[mid]<q)lo=mid+1;else hi=mid;}let i=lo+offset;const items=[];for(;i<keys.length&&keys[i].startsWith(q)&&items.length<limit;i++)items.push({key:keys[i],count:map.get(keys[i]).size});return {items,more:i<keys.length&&keys[i].startsWith(q)};}
 async records(ids){const s=await this.load();return ids.map(id=>s.rows[id]);}
}
