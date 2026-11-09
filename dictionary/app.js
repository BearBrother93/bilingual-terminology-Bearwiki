"use strict";
// BearWiki general dictionary V1.1 — sense-aligned Chinese aids.
// The Free Dictionary API is the English source; MyMemory provides explicitly
// unreviewed, optional Chinese translations. No API keys or proprietary scraping.
const $ = (id) => document.getElementById(id);
const state = {
  word:"", audio:"", requestId:0, groups:[], senses:[], autoTranslating:false,
  translationCache:new Map()
};
const API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const TRANSLATE_BASE = "https://api.mymemory.translated.net/get";
const MAX_GROUPS = 12;
const MAX_DEFS_PER_GROUP = 40;
const VISIBLE_DEFS_PER_GROUP = 5;
const MAX_AUTO_TRANSLATIONS = 8;
const MAX_AUTO_CONCURRENT = 2;
const MAX_TRANSLATION_BYTES = 470; // MyMemory q hard limit is 500 UTF-8 bytes.
const POS_ZH = {noun:"名词",verb:"动词",adjective:"形容词",adverb:"副词",pronoun:"代词",preposition:"介词",conjunction:"连词",interjection:"感叹词",determiner:"限定词",article:"冠词",numeral:"数词",prefix:"前缀",suffix:"后缀",phrase:"短语"};
function node(tag,cls="",value){const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el;}
function clear(el){el.replaceChildren();}
function status(message,kind=""){const el=$("status");el.textContent=message;el.className="status "+kind;}
function limitWord(value){return value.trim().replace(/\s+/g," ").slice(0,90);}
function validQuery(q){return q.length>0 && q.length<=90 && !/[<>]/.test(q);}
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
  if(state.audio){try{const audio=new Audio(state.audio),promise=audio.play();if(promise?.catch)promise.catch(()=>speakSystem(word));return;}catch{/* fall back */}}
  speakSystem(word);
}
function speakSystem(word){
  if(!("speechSynthesis" in window)){status("当前设备无法语音合成，请尝试外部词典发音。","error");return;}
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(word);u.lang="en-US";u.rate=.9;speechSynthesis.speak(u);}catch{status("发音暂时不可用。","error");}
}
function posLabel(pos){const key=(pos||"").toLowerCase();return POS_ZH[key]?POS_ZH[key]+" · "+pos:(pos||"词义");}
function trimTranslationSource(english){
  const encoder=new TextEncoder(),txt=english.replace(/\s+/g," ").trim();
  if(encoder.encode(txt).length<=MAX_TRANSLATION_BYTES)return {text:txt,truncated:false};
  let end=txt.length;
  while(end>20 && encoder.encode(txt.slice(0,end)).length>MAX_TRANSLATION_BYTES)end-=1;
  const sliced=txt.slice(0,end),wordEnd=sliced.lastIndexOf(" ");
  return {text:wordEnd>60?sliced.slice(0,wordEnd):sliced,truncated:true};
}
async function fetchJSON(url,timeout=10000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{const res=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"}});if(!res.ok)throw Error("HTTP "+res.status);return await res.json();}finally{clearTimeout(timer);}
}
async function translate(text,pair){
  const query=trimTranslationSource(text);
  const url=TRANSLATE_BASE+"?"+new URLSearchParams({q:query.text,langpair:pair});
  const result=await fetchJSON(url,10000);
  if(Number(result.responseStatus)!==200||typeof result.responseData?.translatedText!=="string"||!result.responseData.translatedText.trim()){
    throw Error(result.responseDetails||"翻译未返回有效结果");
  }
  return {value:result.responseData.translatedText.trim(),truncated:query.truncated};
}
function groupSenses(entries){
  const seen=new Set(),groups=[];
  for(const entry of entries.slice(0,5)){
    for(const meaning of entry.meanings||[]){
      if(groups.length>=MAX_GROUPS)break;
      const definitions=[];
      for(const d of meaning.definitions||[]){
        if(typeof d.definition!=="string" || !d.definition.trim())continue;
        const key=(meaning.partOfSpeech||"")+"|"+d.definition.trim().toLowerCase();
        if(seen.has(key))continue;seen.add(key);
        definitions.push(d);
        if(definitions.length>=MAX_DEFS_PER_GROUP)break;
      }
      if(definitions.length)groups.push({pos:meaning.partOfSpeech||"词义",definitions,senses:[]});
    }
  }
  return groups;
}
function renderSummary(waiting=false){
  const dest=$("zhText");clear(dest);dest.classList.remove("muted");
  let completed=0;
  for(const g of state.groups){
    const translated=g.senses.filter(s=>s.zh);
    if(!translated.length)continue;
    completed+=translated.length;
    const section=node("section","zh-index-group");
    section.append(node("h4","",posLabel(g.pos)));
    const list=node("ol","zh-index-list");
    for(const sense of translated.slice(0,4))list.append(node("li","",sense.zh));
    if(translated.length>4)list.append(node("li","index-overflow","其余中文辅助解释请查看左侧各义项。"));
    section.append(list);dest.append(section);
  }
  if(!completed){dest.append(node("p","zh-index-empty",waiting?"正在按词性和义项查询中文辅助解释…":"暂时没有获取到中文辅助解释，请查看英文释义或外部词典。"));}
  $("zhCount").textContent=waiting?`已获取 ${completed} 条中文辅助解释 · 正在补充…`:`已获取 ${completed} 条中文辅助解释`;
}
function renderEntry(entries,word){
  const head=$("wordHead"),dest=$("meanings");clear(head);clear(dest);
  const entry=entries[0],row=node("div","word-head-row"),names=node("div");
  names.append(node("h2","",entry.word||word));const phonetic=getFirstPhonetic(entry);
  if(phonetic)names.append(node("div","phonetic",phonetic));
  names.append(node("p","metadata","Free Dictionary API · 英文释义，中文自动辅助解释"));
  const action=node("div","audio-actions"),button=node("button","audio-btn","▶ 发音");button.type="button";
  button.addEventListener("click",()=>speak(entry.word||word));action.append(button);row.append(names,action);head.append(row);
  state.audio=entries.map(getAudio).find(Boolean)||"";
  state.groups=groupSenses(entries);state.senses=[];
  const id=state.requestId;
  for(const group of state.groups){
    const block=node("section","mean-block");block.append(node("h3","meaning-pos",posLabel(group.pos)));
    const ol=node("ol","definition-list");
    for(const [index,def] of group.definitions.entries()){
      const li=node("li","sense-item");li.hidden=index>=VISIBLE_DEFS_PER_GROUP;
      li.append(node("div","definition",def.definition));
      if(def.example)li.append(node("div","example",def.example));
      if(Array.isArray(def.synonyms)&&def.synonyms.length)li.append(node("div","synset","近义词："+def.synonyms.slice(0,5).join(" / ")));
      const zh=node("div","sense-zh pending","中文解释尚未获取");
      const btn=node("button","sense-translate","获取此义项的中文解释");btn.type="button";
      const sense={pos:group.pos,definition:def.definition,zh:"",li,zhEl:zh,button:btn};
      btn.addEventListener("click",()=>translateSense(sense,id));
      li.append(zh,btn);group.senses.push(sense);state.senses.push(sense);ol.append(li);
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
  if(!state.senses.length)dest.append(node("p","","当前免费词典未返回可展示的英文释义。"));
  renderSummary(true);
}
async function translateSense(sense,id){
  if(id!==state.requestId||sense.busy||sense.zh)return false;
  sense.busy=true;sense.zhEl.textContent="正在生成中文辅助解释…";
  sense.zhEl.className="sense-zh loading";sense.button.hidden=true;
  try{
    const key="en|zh-CN|"+sense.definition;
    let answer=state.translationCache.get(key);
    if(!answer){answer=await translate(sense.definition,"en|zh-CN");
      if(state.translationCache.size>=180)state.translationCache.delete(state.translationCache.keys().next().value);
      state.translationCache.set(key,answer);
    }
    if(id!==state.requestId)return false;
    sense.zh=answer.value;sense.zhEl.textContent="中文辅助解释："+answer.value+(answer.truncated?"（原解释较长，仅译前半部分）":"");
    sense.zhEl.className="sense-zh";renderSummary(state.autoTranslating);return true;
  }catch(err){
    if(id!==state.requestId)return false;
    sense.zhEl.textContent="中文自动解释暂不可用（网络或免费额度限制）。";
    sense.zhEl.className="sense-zh error";sense.button.hidden=false;sense.button.textContent="重试中文解释";return false;
  }finally{sense.busy=false;}
}
function autoPlan(groups){
  const result=[];
  for(let index=0;index<VISIBLE_DEFS_PER_GROUP && result.length<MAX_AUTO_TRANSLATIONS;index++){
    for(const group of groups){
      if(group.senses[index])result.push(group.senses[index]);
      if(result.length>=MAX_AUTO_TRANSLATIONS)break;
    }
  }
  return result;
}
async function autoTranslate(id,word){
  state.autoTranslating=true;const plan=autoPlan(state.groups);let next=0,success=0;
  async function worker(){
    while(next<plan.length && id===state.requestId){
      const sense=plan[next++];
      if(await translateSense(sense,id))success++;
    }
  }
  await Promise.all(Array.from({length:Math.min(MAX_AUTO_CONCURRENT,plan.length)},()=>worker()));
  if(id!==state.requestId)return;
  state.autoTranslating=false;renderSummary(false);
  status(`已找到 ${state.groups.length} 组词性/义项、${state.senses.length} 条英文释义；已取得 ${success} 条中文辅助解释。其余可以按需点击获取。`,success?"":"error");
}
async function translateChineseWord(word,id){
  const el=$("zhText");
  try{const answer=await translate(word,"zh-CN|en");if(id!==state.requestId)return;
    el.textContent=answer.value;el.classList.remove("muted");$("zhCount").textContent="中文输入 · 英文自动译文";
  }catch{if(id!==state.requestId)return;el.textContent="汉英辅助译文暂不可用，请使用外部词典查询。";el.classList.add("muted");$("zhCount").textContent="汉英辅助查询失败";}
}
async function lookup(value,{updateUrl=true}={}){
  const word=limitWord(value);$("wordInput").value=word;
  if(!validQuery(word)){status("请输入不超过 90 个字符的有效词语。","error");return;}
  state.word=word;state.audio="";state.senses=[];state.groups=[];state.autoTranslating=false;
  const id=++state.requestId;
  if(updateUrl){const url=new URL(location.href);url.searchParams.set("q",word);try{history.replaceState(null,"",url.pathname+url.search);}catch{/* local preview */}}
  links(word);$("emptyFeature").hidden=true;$("results").hidden=false;
  clear($("wordHead"));clear($("meanings"));$("zhText").textContent="准备查询…";$("zhText").classList.remove("muted");$("zhCount").textContent="";
  $("searchBtn").disabled=true;status("正在查询："+word+" …","loading");
  if(/\p{Script=Han}/u.test(word)){
    $("wordHead").append(node("h2","","汉英辅助查询"));
    $("meanings").append(node("p","","本版主要支持英语词义查询。中文输入仅提供自动翻译及外部链接。"));
    $("searchBtn").disabled=false;status("中文输入将使用机器翻译，不属于经过核对的汉英词典释义。");
    await translateChineseWord(word,id);return;
  }
  try{
    const data=await fetchJSON(API_BASE+encodeURIComponent(word),11000);
    if(id!==state.requestId)return;
    if(!Array.isArray(data)||!data.length)throw Error("no entry");
    renderEntry(data,word);
    status("英文释义已载入，正在按义项生成中文辅助解释…","loading");
    // Do not block the English dictionary while translations arrive.
    void autoTranslate(id,word);
  }catch(err){
    if(id!==state.requestId)return;
    $("wordHead").append(node("h2","",word));
    $("meanings").append(node("p","","当前免费接口未返回英文释义。可能是未收录、网络连接或接口暂时不可用。可使用右侧外部词典链接。"));
    $("zhText").textContent="英文词典查询失败，本次未生成中文机器释义。";$("zhCount").textContent="请查看外部词典";
    status("词典接口暂不可用。请稍后重试或使用外部词典。","error");
  }finally{if(id===state.requestId)$("searchBtn").disabled=false;}
}
$("searchForm").addEventListener("submit",event=>{event.preventDefault();lookup($("wordInput").value);});
for(const button of document.querySelectorAll("[data-example]"))button.addEventListener("click",()=>lookup(button.dataset.example));
const initial=new URLSearchParams(location.search).get("q");
if(initial)lookup(initial,{updateUrl:false});
