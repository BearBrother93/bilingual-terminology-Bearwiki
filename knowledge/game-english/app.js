const DATA_ROOT = "./data/";
const state = { nav:null, refs:null, chapters:[], activeChapter:"ALL", activeEntry:null, query:"", allEntries:[] };
const $ = (id) => document.getElementById(id);
const escapeHTML = (value="") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const chapterLabel = id => state.nav?.chapters.find(c=>c.id===id)?.title || id;
const refMap = () => new Map((state.refs?.references || []).map(r=>[r.id,r]));
function showFatal(message){$("entry-detail").innerHTML=`<div class="fatal">${escapeHTML(message)}</div>`;}
async function getJSON(path){const res=await fetch(DATA_ROOT+path,{cache:"no-cache"});if(!res.ok)throw new Error(`无法读取 ${path}（HTTP ${res.status}）`);return res.json();}
function renderIntro(){
  $("site-title").textContent=state.nav.site_title;
  $("site-subtitle").textContent=state.nav.subtitle;
  $("project-description").textContent=state.nav.project_description;
  $("disclaimer").textContent=state.nav.disclaimer;
  $("entry-total").textContent=state.allEntries.length;
  $("chapter-total").textContent=state.nav.chapters.length;
  $("sidebar-count").textContent=`${state.allEntries.length} 条`;
  $("contribution-guidance").textContent=state.nav.contribution_guidance || "欢迎提供词条编号、具体建议和可核查的资料链接。";
  $("scope-grid").innerHTML=(state.nav.scope||[]).map(s=>`<div class="scope-card"><strong>${escapeHTML(s.label)}</strong><p>${escapeHTML(s.description)}</p></div>`).join("");
  $("editorial-principles").innerHTML=(state.nav.editorial_principles||[]).map(p=>`<div class="method-point">${escapeHTML(p)}</div>`).join("");
}
function renderChapterList(){
  const allBtn=`<button class="chapter-button ${state.activeChapter==="ALL"?"active":""}" data-chapter="ALL"><span class="chapter-no">ALL</span><span class="chapter-name">全部专题</span><span class="chapter-number">${state.allEntries.length}</span></button>`;
  const rest=state.nav.chapters.map(c=>`<button class="chapter-button ${state.activeChapter===c.id?"active":""}" data-chapter="${escapeHTML(c.id)}"><span class="chapter-no">${escapeHTML(c.id)}</span><span class="chapter-name">${escapeHTML(c.title)}</span><span class="chapter-number">${c.entry_count}</span></button>`).join("");
  $("chapter-list").innerHTML=allBtn+rest;
  $("chapter-list").querySelectorAll("[data-chapter]").forEach(btn=>btn.addEventListener("click",()=>{state.activeChapter=btn.dataset.chapter;state.query="";$("search-input").value="";$("clear-search").hidden=true;renderChapterList();renderEntries();}));
}
function filteredEntries(){
  let list=state.allEntries;
  if(state.activeChapter!=="ALL")list=list.filter(e=>e.chapter_id===state.activeChapter);
  const q=state.query.trim().toLocaleLowerCase();
  if(q)list=list.filter(e=>[e.id,e.title,e.zh_name,e.en_name,e.etymology,e.english_extensions,e.cultural_note,e.evidence_note].join(" ").toLocaleLowerCase().includes(q));
  return list;
}
function renderEntries(){
  const list=filteredEntries();
  $("results-title").textContent=state.query?`搜索结果`:(state.activeChapter==="ALL"?"全部专题":chapterLabel(state.activeChapter));
  $("results-kicker").textContent=state.query?"SEARCH RESULTS":"BROWSE ENTRIES";
  $("result-count").textContent=`${list.length} 条`;
  $("search-hint").textContent=state.query?`在当前范围内找到 ${list.length} 条结果`:"支持中文名称、英文名称及词条正文检索";
  if(!list.length){$("entry-list").innerHTML='<div class="empty-results">没有找到匹配的词条。试试其他关键词。</div>';state.activeEntry=null;renderDetail(null);return;}
  $("entry-list").innerHTML=list.map(e=>`<button class="entry-button ${state.activeEntry===e.id?"active":""}" data-entry="${escapeHTML(e.id)}"><span class="entry-id">${escapeHTML(e.id)}</span><strong>${escapeHTML(e.zh_name||e.title)}</strong><small>${escapeHTML(e.en_name||"")}</small></button>`).join("");
  $("entry-list").querySelectorAll("[data-entry]").forEach(btn=>btn.addEventListener("click",()=>selectEntry(btn.dataset.entry,true)));
  if(!state.activeEntry || !list.some(e=>e.id===state.activeEntry))selectEntry(list[0].id,false);
  else renderDetail(state.allEntries.find(e=>e.id===state.activeEntry));
}
function renderSection(no,title,content){
  if(!content)return "";
  return `<section class="entry-section"><h3><span class="section-index">${no}</span>${title}</h3><p>${escapeHTML(content)}</p></section>`;
}
function renderDetail(entry){
  if(!entry){$("entry-detail").innerHTML='<div class="detail-placeholder"><span class="placeholder-mark">W</span><h3>没有匹配的词条</h3><p>更换关键词，或选择其他专题继续浏览。</p></div>';return;}
  const refs=refMap();
  const chapterRefs=(entry.chapter_reference_ids||[]).map(id=>refs.get(id)).filter(Boolean);
  const refHTML=chapterRefs.length?chapterRefs.map(r=>`<div class="source-item"><strong>${escapeHTML(r.citation_original||r.title)}</strong><span>${escapeHTML(r.publisher||"")}</span><a href="${escapeHTML(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(r.url)}</a></div>`).join(""):'<p class="source-caveat">原稿未列出可展示的参考链接。</p>';
  const scopeNote=state.refs?.chapter_scope_notes?.[entry.chapter_id];
  $("entry-detail").innerHTML=`
    <div class="entry-meta"><span class="tag green">${escapeHTML(entry.id)}</span><span class="tag">${escapeHTML(chapterLabel(entry.chapter_id))}</span><span class="tag">${escapeHTML(entry.category||"词条")}</span><span class="tag">证据等级待编辑</span></div>
    <h2 class="entry-title">${escapeHTML(entry.zh_name||entry.title)}</h2>
    <p class="entry-en">${escapeHTML(entry.en_name||"")}</p>
    ${renderSection("01","词源与构词",entry.etymology)}
    ${renderSection("02","英语知识",entry.english_extensions)}
    ${renderSection("03","文化与译名",entry.cultural_note)}
    ${entry.evidence_note?`<div class="evidence-box"><h3>证据备注</h3><p>${escapeHTML(entry.evidence_note)}</p></div>`:""}
    <div class="source-area"><h3>参考资料（本辑来源范围）</h3><p class="source-caveat">以下链接来自原稿对应专题的参考清单，尚未逐条核实其对本词条具体结论的支持关系；请勿将同辑来源视为对本词条全部分析的直接证明。</p>${refHTML}${scopeNote?`<div class="scope-note">${escapeHTML(scopeNote)}</div>`:""}</div>
    <div class="meta-line"><span>内容依据：原神英语词源与文化典故汇编 v1.0</span><span>·</span><span>尚待逐条独立核验</span></div>`;
}
function selectEntry(id,updateHash){
  state.activeEntry=id;
  const entry=state.allEntries.find(e=>e.id===id);
  if(!entry)return;
  if(state.activeChapter!=="ALL" && state.activeChapter!==entry.chapter_id){state.activeChapter=entry.chapter_id;renderChapterList();}
  document.querySelectorAll(".entry-button").forEach(b=>b.classList.toggle("active",b.dataset.entry===id));
  renderDetail(entry);
  if(updateHash)history.replaceState(null,"",`#${encodeURIComponent(id)}`);
}
async function init(){
  try{
    state.nav=await getJSON("navigation.json");
    state.refs=await getJSON("references.json");
    const loaded=await Promise.all(state.nav.chapters.map(async c=>getJSON(c.data_file)));
    state.chapters=loaded;
    state.allEntries=loaded.flatMap(c=>c.entries||[]);
    renderIntro();
    const hash=decodeURIComponent(location.hash.replace(/^#/,""));
    state.activeChapter="ALL";
    renderChapterList();
    if(hash && state.allEntries.some(e=>e.id===hash)){
      state.activeEntry=hash;
    }
    renderEntries();
    if(hash && state.allEntries.some(e=>e.id===hash))selectEntry(hash,false);
    $("search-input").addEventListener("input",e=>{state.query=e.target.value;$("clear-search").hidden=!state.query;renderEntries();});
    $("clear-search").addEventListener("click",()=>{state.query="";$("search-input").value="";$("clear-search").hidden=true;renderEntries();});
    $("entry-total").textContent=state.allEntries.length;
  }catch(err){showFatal(`页面数据载入失败：${err.message}。请确认 data 文件夹与网页文件一同上传，且目录名称没有改变。`);}
}
document.addEventListener("DOMContentLoaded",init);
