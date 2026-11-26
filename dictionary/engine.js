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
export function lowerRoute(routes,q){let lo=0,hi=routes.length;while(lo<hi){const mid=(lo+hi)>>1;if(routes[mid].last<q)lo=mid+1;else hi=mid;}return lo;}
export class LocalDictionary{
 constructor(config,root='./'){this.config=config;this.base=root+config.base;this.chunk=config.chunk_size;}
 async index(direction){if(!this.config.directions.includes(direction))throw Error('Unsupported direction');return getJSON(this.base+direction+'.json');}
 async exact(direction,query){
  const q=normalize(query),{routes}=await this.index(direction),i=lowerRoute(routes,q);
  if(!routes[i]||routes[i].first>q)return [];
  const rows=await getJSON(this.base+routes[i].path);return rows.find(r=>r[0]===q)?.[1]||[];
 }
 async prefix(direction,query,offset=0,limit=40){
  const q=normalize(query);if(!q)return {items:[],more:false};
  const {routes}=await this.index(direction);const items=[];let skipped=0;
  for(let i=lowerRoute(routes,q);i<routes.length&&routes[i].first<=q+'\uffff';i++){
   const rows=await getJSON(this.base+routes[i].path);
   for(const [key,ids] of rows){
    if(!key.startsWith(q))continue;
    if(skipped++<offset)continue;
    if(items.length===limit)return {items,more:true};
    items.push({key,count:ids.length});
   }
  }return {items,more:false};
 }
 async records(ids){
  // At most four record shards in flight. Caller pages the full posting list.
  const chunks=[...new Set(ids.map(id=>Math.floor(id/this.chunk)))],data=new Map();
  for(let i=0;i<chunks.length;i+=4)await Promise.all(chunks.slice(i,i+4).map(async c=>data.set(c,await getJSON(this.base+'records/'+String(c).padStart(4,'0')+'.json'))));
  return ids.map(id=>{const record=data.get(Math.floor(id/this.chunk))[id%this.chunk];if(!record)throw Error('Missing record '+id);return {id,record};});
 }
}
