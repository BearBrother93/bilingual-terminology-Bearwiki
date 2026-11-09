"use strict";
// BearWiki general dictionary v1.0 — client-only. No API keys, no proprietary dictionary scraping.
const $=(id)=>document.getElementById(id);
const state={word:"",primaryDef:"",audio:"",requestId:0};
const MAX_MEANINGS=5,MAX_DEFS=4;
const apiBase="https://api.dictionaryapi.dev/api/v2/entries/en/";
const translateBase="https://api.mymemory.translated.net/get";
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
function clear(el){el.replaceChildren();}
function status(msg,kind=""){const el=$("status");el.textContent=msg;el.className="status "+kind;}
function limitWord(value){return value.trim().replace(/\s+/g," ").slice(0,90);}
function validQuery(q){return q.length>0 && q.length<=90 && !/[<>]/.test(q);}
function links(q){const map=[
  ["剑桥英汉词典","https://dictionary.cambridge.org/dictionary/english-chinese-simplified/"+encodeURIComponent(q)],
  ["必应词典","https://www.bing.com/dict/search?q="+encodeURIComponent(q)],
  ["维基词典","https://en.wiktionary.org/wiki/"+encodeURIComponent(q)],
  ["Google 查词","https://www.google.com/search?q="+encodeURIComponent("define:"+q)]
 ];
 const box=$("externalLinks");clear(box);
 for(const [label,url] of map){const a=node("a","",label);a.href=url;a.rel="noopener noreferrer";a.target="_blank";a.append(node("span","","↗"));box.append(a);}
}
function getFirstPhonetic(entry){return entry.phonetic||entry.phonetics?.find(x=>x.text)?.text||"";}
function getAudio(entry){const candidate=entry.phonetics?.find(x=>typeof x.audio==="string"&&x.audio.trim());
 if(!candidate)return "";let u=candidate.audio; if(u.startsWith("//"))u="https:"+u;
 try{const url=new URL(u);return url.protocol==="https:"?url.href:"";}catch{return "";}
}
function speak(word){if(state.audio){try{const a=new Audio(state.audio);const p=a.play();if(p&&p.catch){p.catch(()=>speakSystem(word));}return;}catch{}}
 speakSystem(word);
}
function speakSystem(word){if(!("speechSynthesis" in window)){status("本机不支持语音合成；请使用外部词典发音。","error");return;}
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(word);u.lang="en-US";u.rate=.9;speechSynthesis.speak(u);}catch{status("发音暂时不可用。","error");}}
function renderEntry(entry,word){const head=$("wordHead"),dest=$("meanings");clear(head);clear(dest);
 const row=node("div","word-head-row"),names=node("div");
 names.append(node("h2","",entry.word||word));const phonetic=getFirstPhonetic(entry);
 if(phonetic)names.append(node("div","phonetic",phonetic));
 names.append(node("p","metadata","Free Dictionary API · 英文词典数据"));
 const ac=node("div","audio-actions"),button=node("button","audio-btn","▶ 发音");button.type="button";
 button.addEventListener("click",()=>speak(entry.word||word));ac.append(button);row.append(names,ac);head.append(row);
 state.audio=getAudio(entry);let count=0;state.primaryDef="";
 for(const meaning of (entry.meanings||[]).slice(0,MAX_MEANINGS)){
  const all=meaning.definitions||[];if(!all.length)continue;
  const block=node("section","mean-block");block.append(node("h3","meaning-pos",meaning.partOfSpeech||"词义"));
  const ol=node("ol","definition-list");
  for(const [i,d] of all.entries()){
   if(typeof d.definition!=="string")continue;
   if(!state.primaryDef)state.primaryDef=d.definition;
   const li=node("li");li.append(node("span","definition",d.definition));
   if(d.example)li.append(node("span","example",d.example));
   if(Array.isArray(d.synonyms)&&d.synonyms.length)li.append(node("div","synset","近义词："+d.synonyms.slice(0,5).join(" / ")));
   if(i>=MAX_DEFS)li.hidden=true;
   ol.append(li);
  }
  block.append(ol);if(all.length>MAX_DEFS){const more=node("button","more-btn","展开更多释义");more.type="button";
   more.addEventListener("click",()=>{const hidden=Array.from(ol.children).some(x=>x.hidden);for(const li of ol.children)li.hidden=!hidden&&Array.from(ol.children).indexOf(li)>=MAX_DEFS;more.textContent=hidden?"收起额外释义":"展开更多释义";});block.append(more);}
  dest.append(block);count++;
 }
 if(!count)dest.append(node("p","","词典接口未提供可展示的释义。"));
 const translateBtn=$("senseTranslate");translateBtn.hidden=!state.primaryDef;
 translateBtn.onclick=()=>translateSense(state.primaryDef,word);
}
async function fetchJSON(url,timeout=10000){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
 try{const res=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"}});if(!res.ok)throw new Error("HTTP "+res.status);return await res.json();}finally{clearTimeout(timer);}}
async function translate(q,langpair){const url=translateBase+"?"+new URLSearchParams({q,langpair}).toString();
 const result=await fetchJSON(url,9000);
 if(Number(result.responseStatus)!==200||!result.responseData?.translatedText)throw new Error(result.responseDetails||"翻译接口没有返回有效结果");
 return result.responseData.translatedText;
}
async function translateWord(word,id){const dest=$("zhText");
 try{const data=await translate(word,/\p{Script=Han}/u.test(word)?"zh-CN|en":"en|zh-CN");
 if(id!==state.requestId)return;
 dest.classList.remove("muted");dest.textContent=data;
 }catch(err){if(id!==state.requestId)return;dest.classList.add("muted");dest.textContent="中文辅助译文暂不可用。可使用下方外部词典查阅。";}}
async function translateSense(def,word){const el=$("senseText"),btn=$("senseTranslate"),id=state.requestId;
 const q=def.slice(0,300);btn.disabled=true;btn.textContent="正在获取中文解释…";el.hidden=false;el.textContent="正在翻译首条英文解释（自动译文，仅供参考）。";
 try{const translation=await translate(q,"en|zh-CN");if(id!==state.requestId)return;el.textContent=translation;}
 catch{if(id!==state.requestId)return;el.textContent="暂时无法翻译英文解释。";}
 finally{if(id===state.requestId){btn.disabled=false;btn.textContent="重新翻译首条英文解释";}}
}
async function lookup(word,{updateUrl=true}={}){
 word=limitWord(word);$("wordInput").value=word;
 if(!validQuery(word)){status("请输入不超过 90 个字符的有效词语。","error");return;}
 state.word=word;state.audio="";state.primaryDef="";
 const id=++state.requestId;
 if(updateUrl){const url=new URL(location.href);url.searchParams.set("q",word);try{history.replaceState(null,"",url.pathname+url.search);}catch{/* local file previews may disallow history updates */}}
 links(word);$("emptyFeature").hidden=true;$("results").hidden=false;
 clear($("wordHead"));clear($("meanings"));$("zhText").textContent="正在查找中文辅助译文…";
 $("zhText").classList.remove("muted");$("senseText").hidden=true;$("senseTranslate").hidden=true;
 $("searchBtn").disabled=true;status("正在查询："+word+" …","loading");
 const isChinese=/\p{Script=Han}/u.test(word);
 // Never pretend third-party machine translation is an editorially reviewed bilingual dictionary.
 const chineseWork=translateWord(word,id);
 if(isChinese){$("wordHead").append(node("h2","","汉英辅助查询"));$("meanings").append(node("p","","V1.0 主要提供英语词典释义。中文输入可参考右侧自动译文与外部词典。"));status("已提交中文辅助查询。首版重点支持英语单词释义。");$("searchBtn").disabled=false;await chineseWork;return;}
 try{const data=await fetchJSON(apiBase+encodeURIComponent(word),11000);if(id!==state.requestId)return;
  if(!Array.isArray(data)||!data.length)throw new Error("no entry");
  renderEntry(data[0],word);status("已找到英文释义 · 中文译文为自动参考结果。请核对多义项与语境。");
 }catch(err){if(id!==state.requestId)return;
  $("wordHead").append(node("h2","",word));
  $("meanings").append(node("p","","未能从当前免费英文词典获取释义。可能是未收录的词语、网络问题或接口暂时不可用。你可以通过右侧链接继续查阅。"));
  status("英文释义暂不可用；中文翻译和外部词典链接仍可尝试。","error");
 }finally{if(id===state.requestId)$("searchBtn").disabled=false;}
 await chineseWork;
}
$("searchForm").addEventListener("submit",e=>{e.preventDefault();lookup($("wordInput").value);});
for(const b of document.querySelectorAll("[data-example]")){b.addEventListener("click",()=>lookup(b.dataset.example));}
const starting=new URLSearchParams(location.search).get("q");if(starting)lookup(starting,{updateUrl:false});
