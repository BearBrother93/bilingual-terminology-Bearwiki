"use strict";
// BearWiki general English dictionary V1.2.2.
// One English dictionary API per lookup, zero machine translation / AI summary calls.
// The local overview is a deterministic count of the API data, not generated prose.
const $ = id => document.getElementById(id);
const state = {word:"", audio:"", requestId:0, groups:[]};
const API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const MAX_GROUPS=12, MAX_DEFS_PER_GROUP=40, VISIBLE_DEFS_PER_GROUP=5;
const POS_ZH={noun:"名词",verb:"动词",adjective:"形容词",adverb:"副词",pronoun:"代词",preposition:"介词",conjunction:"连词",interjection:"感叹词",determiner:"限定词",article:"冠词",numeral:"数词",prefix:"前缀",suffix:"后缀",phrase:"短语"};
function node(tag,cls="",value){const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el;}
function clear(el){el.replaceChildren();}
function status(message,kind=""){const el=$("status");el.textContent=message;el.className="status "+kind;}
function limitWord(value){return value.trim().replace(/\s+/g," ").slice(0,90);}
function validQuery(q){return q.length>0&&q.length<=90&&!/[<>]/.test(q);}
function links(q){
  const map=[
    ["剑桥英汉词典","https://dictionary.cambridge.org/dictionary/english-chinese-simplified/"+encodeURIComponent(q)],
    ["必应词典","https://www.bing.com/dict/search?q="+encodeURIComponent(q)],
    ["维基词典","https://en.wiktionary.org/wiki/"+encodeURIComponent(q)],
    ["Google 查词","https://www.google.com/search?q="+encodeURIComponent("define:"+q)]
  ];
  const box=$("externalLinks");clear(box);
  for(const [label,url] of map){const a=node("a","",label);a.href=url;a.rel="noopener noreferrer";a.target="_blank";a.append(node("span","","↗"));box.append(a);}
}
function getFirstPhonetic(entry){return entry.phonetic||entry.phonetics?.find(p=>p.text)?.text||"";}
function getAudio(entry){
  const candidate=entry.phonetics?.find(p=>typeof p.audio==="string"&&p.audio.trim());
  if(!candidate)return "";
  let src=candidate.audio;if(src.startsWith("//"))src="https:"+src;
  try{const url=new URL(src);return url.protocol==="https:"?url.href:"";}catch{return "";}
}
function speak(word){
  if(state.audio){try{const audio=new Audio(state.audio),promise=audio.play();if(promise?.catch)promise.catch(()=>speakSystem(word));return;}catch{/* fallback */}}
  speakSystem(word);
}
function speakSystem(word){
  if(!("speechSynthesis" in window)){status("当前设备无法语音合成，请尝试外部词典发音。","error");return;}
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(word);u.lang="en-US";u.rate=.9;speechSynthesis.speak(u);}catch{status("发音暂时不可用。","error");}
}
function posLabel(pos){const key=(pos||"").toLowerCase();return POS_ZH[key]?POS_ZH[key]+" · "+pos:(pos||"词义");}
async function fetchJSON(url,timeout=11000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{const res=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"}});if(!res.ok)throw Error("HTTP "+res.status);return await res.json();}finally{clearTimeout(timer);}
}
function groupSenses(entries){
  const seen=new Set(),groups=[];
  for(const entry of entries.slice(0,5)){
    for(const meaning of entry.meanings||[]){
      if(groups.length>=MAX_GROUPS)break;
      const definitions=[];
      for(const d of meaning.definitions||[]){
        if(typeof d.definition!=="string"||!d.definition.trim())continue;
        const key=(meaning.partOfSpeech||"")+"|"+d.definition.trim().toLowerCase();
        if(seen.has(key))continue;seen.add(key);definitions.push(d);
        if(definitions.length>=MAX_DEFS_PER_GROUP)break;
      }
      if(definitions.length)groups.push({pos:meaning.partOfSpeech||"词义",definitions});
    }
  }
  return groups;
}
function renderOverview(groups){
  const target=$("overview");clear(target);
  const totalSenses=groups.reduce((n,g)=>n+g.definitions.length,0);
  const exampleCount=groups.reduce((n,g)=>n+g.definitions.filter(d=>typeof d.example==="string"&&d.example.trim()).length,0);
  const posCounts=new Map();
  for(const g of groups){const k=g.pos;posCounts.set(k,(posCounts.get(k)||0)+g.definitions.length);}
  if(!totalSenses){target.append(node("p","overview-empty","当前没有可统计的英文义项。"));return;}
  const stats=node("div","overview-stats");
  for(const [num,label] of [[totalSenses,"英文义项"],[exampleCount,"附例句的义项"],[posCounts.size,"不同词性"],[groups.length,"义项分组"]]){
    const box=node("div","overview-stat");box.append(node("strong","",String(num)),node("span","",label));stats.append(box);
  }
  target.append(stats,node("h4","overview-title","词性分布"));
  const list=node("ul","overview-pos-list");
  for(const [pos,count] of posCounts){const li=node("li");li.append(node("b","",posLabel(pos)),node("span","",count+" 条释义"));list.append(li);}
  target.append(list);
  target.append(node("h4","overview-title","各词性首条释义 · 英文摘录"));
  const samples=node("ul","overview-samples");
  const used=new Set();
  for(const g of groups){
    if(used.has(g.pos))continue;used.add(g.pos);
    const li=node("li");li.append(node("strong","",posLabel(g.pos)),node("span","",g.definitions[0].definition));
    samples.append(li);
  }
  target.append(samples,node("p","overview-caution","摘录为该词性在本次数据中的首条英文释义，不代表最常见或唯一的用法。"));
}
function renderEntry(entries,word){
  const head=$("wordHead"),dest=$("meanings");clear(head);clear(dest);
  const entry=entries[0],row=node("div","word-head-row"),names=node("div");
  names.append(node("h2","",entry.word||word));
  const phonetic=getFirstPhonetic(entry);if(phonetic)names.append(node("div","phonetic",phonetic));
  names.append(node("p","metadata","Free Dictionary API · 英文原始释义 · 不调用翻译接口"));
  const action=node("div","audio-actions"),button=node("button","audio-btn","▶ 发音");button.type="button";
  button.addEventListener("click",()=>speak(entry.word||word));action.append(button);row.append(names,action);head.append(row);
  state.audio=entries.map(getAudio).find(Boolean)||"";
  state.groups=groupSenses(entries);
  for(const group of state.groups){
    const block=node("section","mean-block");block.append(node("h3","meaning-pos",posLabel(group.pos)));
    const ol=node("ol","definition-list");
    for(const [index,def] of group.definitions.entries()){
      const li=node("li","sense-item");li.hidden=index>=VISIBLE_DEFS_PER_GROUP;
      li.append(node("div","definition",def.definition));
      if(def.example)li.append(node("div","example",def.example));
      if(Array.isArray(def.synonyms)&&def.synonyms.length)li.append(node("div","synset","近义词："+def.synonyms.slice(0,5).join(" / ")));
      ol.append(li);
    }
    block.append(ol);
    if(group.definitions.length>VISIBLE_DEFS_PER_GROUP){
      const more=node("button","more-btn","展开全部 "+group.definitions.length+" 条英文义项");more.type="button";
      let expanded=false;more.addEventListener("click",()=>{
        expanded=!expanded;for(const [i,li] of Array.from(ol.children).entries())li.hidden=!expanded&&i>=VISIBLE_DEFS_PER_GROUP;
        more.textContent=expanded?"收起额外义项":"展开全部 "+group.definitions.length+" 条英文义项";
      });block.append(more);
    }
    dest.append(block);
  }
  if(!state.groups.length)dest.append(node("p","","当前免费词典未返回可展示的英文释义。"));
  renderOverview(state.groups);
}
async function lookup(value,{updateUrl=true}={}){
  const word=limitWord(value);$("wordInput").value=word;
  if(!validQuery(word)){status("请输入不超过 90 个字符的有效词语。","error");return;}
  state.word=word;state.audio="";state.groups=[];
  const id=++state.requestId;
  if(updateUrl){const url=new URL(location.href);url.searchParams.set("q",word);try{history.replaceState(null,"",url.pathname+url.search);}catch{/* local preview */}}
  links(word);$("emptyFeature").hidden=true;$("results").hidden=false;
  clear($("wordHead"));clear($("meanings"));$("overview").textContent="等待英文词条数据…";
  $("searchBtn").disabled=true;status("正在查询："+word+" …","loading");
  if(/\p{Script=Han}/u.test(word)){
    $("wordHead").append(node("h2","",word));
    $("meanings").append(node("p","","本页目前仅提供英语词义查询，已停用中文词语的机器翻译。可以点击右侧外部词典查询。"));
    $("overview").textContent="中文查词暂不支持，本次未向外部接口发送查询。";
    $("searchBtn").disabled=false;status("中文机器翻译已关闭；本站不会为此查询消耗翻译额度。");return;
  }
  try{
    const data=await fetchJSON(API_BASE+encodeURIComponent(word));
    if(id!==state.requestId)return;
    if(!Array.isArray(data)||!data.length)throw Error("no entry");
    renderEntry(data,word);
    const count=state.groups.reduce((n,g)=>n+g.definitions.length,0);
    status("已显示 "+state.groups.length+" 组、"+count+" 条英文释义；右侧概览由本次词条直接统计，未使用机器翻译。 ");
  }catch(err){
    if(id!==state.requestId)return;
    $("wordHead").append(node("h2","",word));
    $("meanings").append(node("p","","当前免费接口未返回英文释义。可能是未收录、网络连接或接口暂时不可用，请使用右侧外部词典链接。"));
    $("overview").textContent="本次查询未获得可统计的词条数据。";
    status("英文词典接口暂不可用。请稍后重试或使用外部词典。","error");
  }finally{if(id===state.requestId)$("searchBtn").disabled=false;}
}
$("searchForm").addEventListener("submit",event=>{event.preventDefault();lookup($("wordInput").value);});
for(const button of document.querySelectorAll("[data-example]"))button.addEventListener("click",()=>lookup(button.dataset.example));
const initial=new URLSearchParams(location.search).get("q");
if(initial)lookup(initial,{updateUrl:false});
