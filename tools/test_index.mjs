import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]||'work/site/dist/dictionary');
const moduleURL=pathToFileURL(root+'/engine.js');
const {normalize,lowerRoute,LocalDictionary,metrics}=await import(moduleURL);
const cat=JSON.parse(await fs.readFile(root+'/catalog.json','utf8')),config=cat.local[0],base=root+'/'+config.base;
let checks=0,keys=0,postings=0;const counts={};
for(const dir of config.directions){
 const idx=JSON.parse(await fs.readFile(base+dir+'.json','utf8'));let prev=null,total=0;
 for(let p=0;p<idx.routes.length;p++){
  const route=idx.routes[p],buf=await fs.readFile(base+route.path),rows=JSON.parse(buf);assert.equal(buf.length,route.bytes);assert.equal(rows[0][0],route.first);assert.equal(rows.at(-1)[0],route.last);
  for(const [key,refs] of rows){assert.equal(normalize(key),key);assert(prev===null||prev<key);assert.equal(lowerRoute(idx.routes,key),p);assert.equal(refs.length,new Set(refs).size);assert(refs.every(id=>Number.isInteger(id)&&id>=0&&id<config.records));prev=key;keys++;postings+=refs.length;total++;}
 }
 assert.equal(total,idx.keys);counts[dir]=total;checks++;
}
const originalFetch=globalThis.fetch;let requestCount=0,failNext=false;
globalThis.fetch=async(u,options)=>{requestCount++;if(failNext){failNext=false;return new Response('failure',{status:503});}const url=new URL(u,'http://localhost/dictionary/');try{return new Response(await fs.readFile(root+'/'+url.pathname.replace('/dictionary/','')),{status:200});}catch{return new Response('missing',{status:404});}};
const dict=new LocalDictionary(config);const results=[];
for(const [dir,q,expected] of [['zh-en','苹果','蘋果'],['zh-en','蘋果','蘋果'],['zh-en','中央银行','中央銀行'],['zh-en','巴勒斯坦','巴勒斯坦'],['en-zh','apple','蘋果'],['en-zh','APPLE','蘋果'],['en-zh','  APPLE  ','蘋果'],['en-zh','central bank','中央銀行']]){
 const ids=await dict.exact(dir,q),rows=await dict.records(ids.slice(0,20));assert(rows.some(x=>x.record.w===expected),q);results.push({direction:dir,query:q,count:ids.length,expected,pass:true});checks++;
}
assert.deepEqual(await dict.exact('en-zh','apple'),await dict.exact('en-zh','APPLE'));checks++;
assert.equal((await dict.exact('zh-en','不存在的测试词zzzz999')).length,0);checks++;
const poly=await dict.records(await dict.exact('zh-en','巴勒斯坦'));assert.equal(poly[0].record.d.length,5);checks++;
for(const [dir,prefix] of [['zh-en','中'],['zh-en','𠮷'],['en-zh','a'],['en-zh','app'],['en-zh','central ']]){
 let result=[],offset=0,p;do{p=await dict.prefix(dir,prefix,offset,40);result.push(...p.items);offset+=p.items.length;}while(p.more);
 const index=JSON.parse(await fs.readFile(base+dir+'.json','utf8'));let expected=[];for(const r of index.routes){if(r.last<normalize(prefix)||r.first>normalize(prefix)+'\uffff')continue;const rows=JSON.parse(await fs.readFile(base+r.path,'utf8'));expected.push(...rows.filter(r=>r[0].startsWith(normalize(prefix))).map(r=>r[0]));}
 assert.deepEqual(result.map(r=>r.key),expected);results.push({direction:dir,prefix,candidates:result.length,pagination:'40 per page',pass:true});checks++;
}
const before=requestCount;await dict.exact('en-zh','APPLE');const after=requestCount;await dict.exact('en-zh','APPLE');assert.equal(requestCount,after);checks++;
const {getJSON}=await import(moduleURL);failNext=true;await assert.rejects(()=>getJSON('./catalog.json?retry=1'));const retry=await getJSON('./catalog.json?retry=1');assert.equal(retry.schema,1);checks++;
const report={transport:'Local file-backed fetch; live HTTP/UI tested separately in browser',checks,all_index_keys_verified:keys,all_index_postings_verified:postings,counts,cases:results,cache_reuse_pass:true,failed_request_retry_pass:true,metrics};
const output=path.resolve(process.argv[3]||'reports');await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'index_tests.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
