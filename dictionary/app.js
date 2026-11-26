import {getJSON,LocalDictionary,normalize,metrics} from './engine.js?v=2.0.1';
const $=id=>document.getElementById(id),el=(tag,cls='',value)=>{const n=document.createElement(tag);n.className=cls;if(value!==undefined)n.textContent=value;return n;};
let configPromise,localPromise,request=0,suggestRequest=0,timer,active=null;
function catalog(){return configPromise??=(getJSON('./catalog.json',{fresh:true}).catch(e=>{configPromise=null;throw e;}));}
async function local(){if(!localPromise)localPromise=catalog().then(c=>new LocalDictionary(c.local.find(d=>d.id==='wikdict-zh-en'))).catch(e=>{localPromise=null;throw e;});return localPromise;}
function status(s,error=false){$('status').textContent=s;$('status').className='status'+(error?' error':'');}
function direction(q){const d=$('direction').value;return d==='auto'?(/[\p{Script=Han}]/u.test(q)?'zh-en':'en-en'):d;}
function note(){const d=$('direction').value;$('directionNote').textContent=({'auto':'中文查询支持简繁检索别名；英文默认保留在线英英查询，也可切换本地反查。','zh-en':'简繁字形仅用于检索匹配；原词头、译法、词性及来源评分保持原样。','en-zh':'从汉英词库的现有英文译法反查中文，不是独立英汉词典；英文不区分大小写。','en-en':'使用 Free Dictionary API 在线查询；会发送所查词语。前缀候选来自本地汉英词库反向索引，英英查询仍为精确查询。'})[d];}
function links(q){const n=$('externalLinks');n.replaceChildren();for(const [label,url] of [['维基词典','https://zh.wiktionary.org/wiki/'+encodeURIComponent(q)],['必应词典','https://www.bing.com/dict/search?q='+encodeURIComponent(q)],['剑桥英汉词典','https://dictionary.cambridge.org/dictionary/english-chinese-simplified/'+encodeURIComponent(q)]]){const a=el('a','',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';n.append(a);}}
function link(label,url){try{const u=new URL(url);if(u.protocol!=='https:')return el('span','',label);const a=el('a','',label);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';return a;}catch{return el('span','',label);}}
// Safe, narrowly whitelisted formatting. Unknown tags stay visible as literal source text.
function rich(value){const root=el('span'),stack=[root],parts=String(value??'').split(/(<\/?(?:u|b|i|em|strong|sup|sub)>|<br\s*\/?>)/gi);for(const part of parts){if(/^<br\s*\/?>$/i.test(part)){stack.at(-1).append(el('br'));continue;}const m=part.match(/^<(\/)?(u|b|i|em|strong|sup|sub)>$/i);if(m){if(m[1]){if(stack.length>1&&stack.at(-1).tagName.toLowerCase()===m[2].toLowerCase())stack.pop();else stack.at(-1).append(document.createTextNode(part));}else{const n=el(m[2]);stack.at(-1).append(n);stack.push(n);}}else stack.at(-1).append(document.createTextNode(part));}return root;}
function speak(word,lang,audio=''){
 const synth=()=>{if(!('speechSynthesis' in window)){status('当前浏览器无法系统朗读。',true);return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(word);u.lang=lang;u.rate=.9;u.onerror=()=>status('系统朗读暂不可用，可尝试其他设备或外部词典。',true);speechSynthesis.speak(u);};
 if(audio){const a=new Audio(audio);a.play().catch(synth);}else synth();
}
function speechButton(word,lang,audio=''){const b=el('button','audio-btn',audio?'播放音频':'系统朗读');b.type='button';b.title=audio?'播放词典返回的音频；失败时尝试系统语音':'使用设备语音，不是词典录音';b.onclick=()=>speak(word,lang,audio);return b;}
function overview(stats,noteText){const n=$('overview');n.replaceChildren();const grid=el('div','stats');for(const [v,k] of stats){const cell=el('div','stat');cell.append(el('strong','',String(v)),el('span','',k));grid.append(cell);}n.append(grid,el('p','muted',noteText));}
function metadata(record){const d=el('details');d.append(el('summary','','原始字段与来源评分'));d.append(el('p','meta','s / score：原始来源评分；i / importance：重要性；g / source_is_good：原始来源标记。它们不等于本站准确率。'));const pre=el('pre','',JSON.stringify(record,null,2));d.append(pre);return d;}
function renderLocal({record:r,id},q,dir){
 const card=el('article','entry');card.dataset.recordId=String(id);
 const h=el('div','entry-head');h.append(el('h3','',r.w),speechButton(r.w,'zh-CN'));card.append(h);
 const caption=el('p','source-label');caption.append(link('WikDict · Gemini 初步复核版','https://www.wikdict.com/page/about'),document.createTextNode(' · '+(dir==='en-zh'?'英文译法反查':'汉英')+' · 记录 '+id));card.append(caption);
 if(dir==='zh-en'&&normalize(r.w)!==normalize(q))card.append(el('p','meta','通过简繁检索别名匹配；原词头为“'+r.w+'”。'));
 const t=el('p','translation');t.append(rich(r.t));card.append(t);
 if(!r.g)card.append(el('p','warning','原始来源标记 g=false；尚未通过全面人工审校，请结合语境核实。'));
 if(!r.d.length)card.append(el('p','muted','本条未提供详细义项或词性，仅展示原文件已有译法。'));
 const groups=new Map();for(const s of r.d){const pos=s.pos||'词性未提供';if(!groups.has(pos))groups.set(pos,[]);groups.get(pos).push(s);}
 for(const [pos,senses] of groups){const section=el('section','sense-group'),list=el('ol');section.append(el('h4','',pos));for(const s of senses){const li=el('li');li.append(rich(s.translation));if(s.gloss!==null&&s.gloss!==undefined&&s.gloss!==''){const g=el('div','gloss');g.append(rich(s.gloss));li.append(g);}li.append(el('div','meta','来源评分：'+String(s.score)+' · 原编号：'+String(s.id)));list.append(li);}section.append(list);card.append(section);}
 card.append(link('查看维基词典词头','https://zh.wiktionary.org/wiki/'+encodeURIComponent(r.w)),document.createTextNode(' · '),link('CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'),metadata(r));return card;
}
async function showPage(id){
 const s=active;if(!s||id!==request)return;const more=$('loadMore');more.disabled=true;
 try{
  if(s.kind==='records'){
   const selected=s.ids.slice(s.offset,s.offset+20),rows=await s.dict.records(selected);if(id!==request)return;
   for(const row of rows)$('meanings').append(renderLocal(row,s.q,s.dir));s.offset+=selected.length;
   s.senses+=rows.reduce((n,x)=>n+x.record.d.length,0);
   overview([[s.ids.length,'匹配记录'],[s.offset,'已展示记录'],[s.senses,'已展示详细义项']],'所有匹配记录均可分批展开；每条记录的全部详细义项同时展示。');
   more.hidden=s.offset>=s.ids.length;more.textContent=`继续显示（${s.offset} / ${s.ids.length}）`;
   status(`找到 ${s.ids.length} 条记录，已显示 ${s.offset} 条。来源：WikDict 汉英${s.dir==='en-zh'?'反向索引':''}。`);
  }else{
   const {items,more:hasMore}=await s.dict.prefix(s.indexDir,s.q,s.offset,40);if(id!==request)return;
   let grid=$('meanings').querySelector('.candidate-grid');if(!grid){grid=el('div','candidate-grid');$('meanings').append(grid);}
   for(const c of items){const b=el('button','candidate',c.key);b.append(el('small','',c.count+' 条关联记录'));b.onclick=()=>{ $('match').value='auto';lookup(c.key);};grid.append(b);}
   s.offset+=items.length;more.hidden=!hasMore;more.textContent='更多前缀候选';overview([[s.offset,'已展示候选']],'点击候选词查看完整记录；候选包含本地索引中的简繁别名。');
   status(s.offset?`已显示 ${s.offset} 个前缀候选${hasMore?'，可以继续展开':''}。${s.dir==='en-en'?'候选来自本地反向索引；选择后查询在线英英释义。':''}`:'当前词库没有匹配项；这不代表该词不存在。');
   if(!s.offset)$('meanings').append(el('p','entry','本批数据尚未收录该检索词。可以尝试另一种字形、缩短前缀，或使用右侧外部词典。'));
  }
 }catch(e){if(id!==request)return;status('数据未能完整加载，请重试。'+(e.name==='AbortError'?'请求超时。':e.message),true);more.hidden=false;more.textContent='重试加载';}
 finally{if(id===request)more.disabled=false;}
}
function validAudio(url){try{const u=new URL(url.startsWith('//')?'https:'+url:url);return u.protocol==='https:'?u.href:'';}catch{return '';}}
async function online(q,id){
 try{
  const entries=await getJSON('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(normalize(q)),{timeout:11000});if(id!==request)return;
  if(!Array.isArray(entries)||!entries.length)throw Error('未返回词条');
  let senses=0,examples=0,groups=0;
  for(const entry of entries){const card=el('article','entry'),h=el('div','entry-head'),word=entry.word||q;const audio=(entry.phonetics||[]).map(p=>validAudio(p.audio||'')).find(Boolean)||'';h.append(el('h3','',word),speechButton(word,'en-US',audio));card.append(h,el('p','source-label','Free Dictionary API · 在线英英 · 原始释义'));
   const phonetics=[...new Set([entry.phonetic,...(entry.phonetics||[]).map(p=>p.text)].filter(Boolean))];for(const p of phonetics)card.append(el('p','phonetic',p));
   if(entry.origin)card.append(el('p','gloss',entry.origin));
   for(const meaning of entry.meanings||[]){groups++;const section=el('section','sense-group'),ol=el('ol');section.append(el('h4','',meaning.partOfSpeech||'词性未提供'));
    for(const def of meaning.definitions||[]){senses++;const li=el('li');li.append(el('span','',def.definition||''));if(def.example){examples++;li.append(el('p','example',def.example));}for(const [key,label] of [['synonyms','近义词'],['antonyms','反义词']])if(def[key]?.length)li.append(el('p','meta',label+'：'+def[key].join(' / ')));ol.append(li);}
    section.append(ol);for(const [key,label] of [['synonyms','词性组近义词'],['antonyms','词性组反义词']])if(meaning[key]?.length)section.append(el('p','meta',label+'：'+meaning[key].join(' / ')));card.append(section);
   }
   const source=el('p','meta');for(const url of entry.sourceUrls||[])source.append(link('原始词条',url),document.createTextNode(' '));if(entry.license?.url)source.append(link(entry.license.name||'许可',entry.license.url));for(const p of entry.phonetics||[]){if(p.sourceUrl)source.append(document.createTextNode(' · '),link('音频来源',p.sourceUrl));if(p.license?.url)source.append(document.createTextNode(' · '),link(p.license.name||'音频许可',p.license.url));}card.append(source);const raw=el('details');raw.append(el('summary','','接口原始数据'),el('pre','',JSON.stringify(entry,null,2)));card.append(raw);$('meanings').append(card);
  }overview([[entries.length,'英文词条'],[groups,'词性分组'],[senses,'全部义项'],[examples,'例句']],'概览直接统计本次接口数据；没有翻译、AI 总结或义项截断。');status(`已显示 ${entries.length} 个英文词条、${senses} 个义项。`);
 }catch(e){if(id!==request)return;$('meanings').append(el('p','entry','在线英英词典暂未返回结果，可能是未收录、网络限制或接口故障。可使用本地反查或外部词典。'));const b=el('button','secondary','改查本地英文译法');b.onclick=()=>{$('direction').value='en-zh';$('match').value='auto';note();lookup(q);};$('meanings').append(b);overview([],'本次没有可统计的在线词条。');status('英英接口暂不可用；本地词库不受此影响。',true);}
}
async function lookup(value,{updateUrl=true}={}){
 const q=String(value).trim();if(!q||q.length>256){status('请输入 1–256 个字符的词语。',true);return;}
 $('wordInput').value=q;const dir=direction(q),id=++request;++suggestRequest;$('candidates').replaceChildren();active=null;
 if(updateUrl){const u=new URL(location.href);u.searchParams.set('q',q);u.searchParams.set('dir',$('direction').value);u.searchParams.set('match',$('match').value);history.replaceState(null,'',u.pathname+u.search);}
 $('emptyFeature').hidden=true;$('results').hidden=false;$('meanings').replaceChildren();$('loadMore').hidden=true;$('resultTitle').textContent=q;$('resultKind').textContent=({'zh-en':'WikDict · 汉英','en-zh':'WikDict · 反向检索','en-en':'在线英英'})[dir];$('overview').replaceChildren(el('p','muted','正在查询…'));links(q);status('正在查询：'+q+' …');$('searchBtn').disabled=true;
 try{
  if(dir==='en-en'&&$('match').value!=='prefix'){await online(q,id);return;}
  const dict=await local();if(id!==request)return;const indexDir=dir==='en-en'?'en-zh':dir;
  const ids=$('match').value==='prefix'?[]:await dict.exact(indexDir,q);if(id!==request)return;
  if(ids.length){active={kind:'records',dict,q,dir,ids,offset:0,senses:0};await showPage(id);}
  else if($('match').value==='exact'){$('meanings').append(el('p','entry','当前数据没有精确匹配。可切换前缀搜索，或使用外部词典。'));overview([[0,'精确匹配']],'没有以机器翻译补造结果。');status('没有精确匹配。');}
  else{active={kind:'prefix',dict,q,dir,indexDir,offset:0};await showPage(id);}
 }catch(e){if(id!==request)return;status('本地词库加载失败。请确认 dictionary/data 目录完整，稍后重试。',true);$('meanings').append(el('p','entry','数据暂不可用；已有内容没有被删除。错误：'+e.message));}
 finally{if(id===request)$('searchBtn').disabled=false;}
}
$('searchForm').onsubmit=e=>{e.preventDefault();lookup($('wordInput').value);};
$('loadMore').onclick=()=>showPage(request);
$('toggleOverview').onclick=()=>{const n=$('overview');n.hidden=!n.hidden;$('toggleOverview').textContent=n.hidden?'展开':'关闭';$('toggleOverview').setAttribute('aria-expanded',String(!n.hidden));};
for(const b of document.querySelectorAll('[data-q]'))b.onclick=()=>{$('direction').value=b.dataset.dir;$('match').value='auto';note();lookup(b.dataset.q);};
$('direction').onchange=()=>{++request;++suggestRequest;$('searchBtn').disabled=false;$('candidates').replaceChildren();note();if($('wordInput').value.trim())lookup($('wordInput').value);};
$('wordInput').oninput=()=>{clearTimeout(timer);const token=++suggestRequest;$('candidates').replaceChildren();const q=$('wordInput').value.trim();if(!q)return;timer=setTimeout(async()=>{try{const d=direction(q),dict=await local(),r=await dict.prefix(d==='en-en'?'en-zh':d,q,0,12);if(token!==suggestRequest)return;for(const item of r.items){const o=el('option');o.value=item.key;$('candidates').append(o);}}catch{/* Candidate failures must not prevent explicit retry/search. */}},250);};
window.addEventListener('popstate',()=>{const p=new URLSearchParams(location.search);$('direction').value=['auto','zh-en','en-zh','en-en'].includes(p.get('dir'))?p.get('dir'):'auto';$('match').value=['auto','exact','prefix'].includes(p.get('match'))?p.get('match'):'auto';note();if(p.get('q'))lookup(p.get('q'),{updateUrl:false});});
const params=new URLSearchParams(location.search);if(['auto','zh-en','en-zh','en-en'].includes(params.get('dir')))$('direction').value=params.get('dir');if(['auto','exact','prefix'].includes(params.get('match')))$('match').value=params.get('match');note();if(params.get('q'))lookup(params.get('q'),{updateUrl:false});
// Exposes only counters for performance QA, never query history or dictionary payloads.
window.bearwikiMetrics=metrics;
