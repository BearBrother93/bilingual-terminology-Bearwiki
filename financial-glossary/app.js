const $ = id => document.getElementById(id);

let all = [];
let filtered = [];
let selected = null;
let letter = "";
let shown = 0;
let references = {};
let referenceLoadError = false;

const PAGE = 50;

function add(parent, tag, className = "", text = "") {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== "") element.textContent = String(text);
  parent.append(element);
  return element;
}

function updateSourceSummary() {
  const target = $("source-summary");
  if (!target) return;

  const linkedTerms = Object.values(references)
    .filter(items => Array.isArray(items) && items.length > 0).length;
  const sourceRecords = Object.values(references)
    .reduce((total, items) => total + (Array.isArray(items) ? items.length : 0), 0);

  target.textContent = referenceLoadError
    ? "参考资料暂时无法载入，请稍后重试。"
    : `已有 ${linkedTerms.toLocaleString()} 条词目关联 ${sourceRecords.toLocaleString()} 条参考资料 · 持续补充与校订`;
}

function renderLetters() {
  const available = new Set(
    all.map(term => term.en?.[0]?.toUpperCase()).filter(Boolean)
  );

  $("alpha").replaceChildren();

  for (const currentLetter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    const button = add(
      $("alpha"),
      "button",
      letter === currentLetter ? "active" : "",
      currentLetter
    );

    button.type = "button";
    button.disabled = !available.has(currentLetter);
    button.setAttribute("aria-label", `${currentLetter} 开头的术语`);
    button.setAttribute("aria-pressed", letter === currentLetter ? "true" : "false");

    button.onclick = () => {
      letter = letter === currentLetter ? "" : currentLetter;
      renderLetters();
      search();
    };
  }
}

function renderMore() {
  const chunk = filtered.slice(shown, shown + PAGE);

  for (const term of chunk) {
    const button = add(
      $("list"),
      "button",
      "result" + (selected?.id === term.id ? " active" : "")
    );

    button.type = "button";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", selected?.id === term.id ? "true" : "false");

    add(button, "strong", "", term.en);
    add(button, "small", "", term.zh);
    button.onclick = () => selectTerm(term, true);
  }

  shown += chunk.length;
  $("more").hidden = shown >= filtered.length;
  $("more").textContent = `显示更多（已显示 ${shown.toLocaleString()} 条）`;
}

function search() {
  const query = $("search").value.trim().toLocaleLowerCase();

  filtered = all.filter(term => {
    const english = String(term.en ?? "").toLocaleLowerCase();
    const chinese = String(term.zh ?? "").toLocaleLowerCase();

    return (!letter || english[0]?.toUpperCase() === letter) &&
      (!query || english.includes(query) || chinese.includes(query));
  });

  shown = 0;
  $("list").replaceChildren();
  $("count").textContent = `${filtered.length.toLocaleString()} / ${all.length.toLocaleString()} 条`;
  $("hint").textContent = filtered.length
    ? "点击词条查看译文与参考资料。"
    : "没有匹配的词条。";

  renderMore();

  if (!filtered.length) {
    selected = null;
    $("detail").replaceChildren();
    add($("detail"), "div", "not-found", "没有匹配的词条。");
    $("detail").firstElementChild.style.display = "block";
    return;
  }

  if (!filtered.some(term => term.id === selected?.id)) {
    selectTerm(filtered[0], false);
  } else {
    updateActiveResult();
  }
}

function updateActiveResult() {
  document.querySelectorAll(".result").forEach(element => {
    const isActive = element.querySelector("strong")?.textContent === selected?.en &&
      element.querySelector("small")?.textContent === selected?.zh;

    element.classList.toggle("active", isActive);
    element.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function renderReferences(body, term) {
  const section = add(body, "section", "detailblock");
  const heading = add(section, "div", "sectitle");
  add(heading, "h2", "", "参考资料与出处");

  const items = references[String(term.id)];

  if (Array.isArray(items) && items.length) {
    add(heading, "span", "source-heading-note", `${items.length} 条来源`);

    items.forEach((reference, index) => {
      const card = add(section, "div", "sourcebox");
      const header = add(card, "div", "source-head");
      const titleWrap = add(header, "div", "source-title-wrap");
      const title = reference.title || "未提供标题";

      if (reference.url) {
        const link = add(titleWrap, "a", "source-link", title);
        link.href = reference.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      } else {
        add(titleWrap, "strong", "source-title", title);
      }

      add(header, "span", "source-index", String(index + 1));

      if (reference.publisher) {
        add(card, "p", "source-publisher", reference.publisher);
      }

      if (reference.context) {
        add(card, "p", "source-context", reference.context);
      }
    });

    return;
  }

  if (referenceLoadError) {
    add(
      section,
      "div",
      "source-warning",
      "参考文献数据暂时无法载入。术语译文仍可查看，请稍后刷新页面。"
    );
  } else {
    add(
      section,
      "div",
      "source-empty",
      "当前词条尚未关联参考资料。来源信息将随文献核查工作持续补充；暂无来源不代表该术语没有可靠依据。"
    );
  }
}

function selectTerm(term, updateHash) {
  if (!term) return;

  selected = term;
  const detail = $("detail");
  detail.replaceChildren();

  const top = add(detail, "div", "detail-top");
  add(top, "div", "crumb", "维基熊 BearWiki  ›  财经术语库  ›  英中对照");

  const tags = add(top, "div", "pills");
  add(tags, "span", "pill", "财经术语");

  add(top, "div", "labels", "ENGLISH TERM / CHINESE EQUIVALENT");
  add(top, "h2", "termtext", term.en);
  add(top, "p", "translation", term.zh);

  const actions = add(top, "div", "controls");
  const copy = add(actions, "button", "", "复制双语术语");

  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(`${term.en} — ${term.zh}`);
      copy.textContent = "已复制";
    } catch {
      copy.textContent = "复制失败";
    }
    setTimeout(() => copy.textContent = "复制双语术语", 1700);
  };

  const copyLink = add(actions, "button", "", "复制词条链接");
  copyLink.onclick = async () => {
    try {
      await navigator.clipboard.writeText(location.href.split("#")[0] + `#term-${term.id}`);
      copyLink.textContent = "已复制";
    } catch {
      copyLink.textContent = "复制失败";
    }
    setTimeout(() => copyLink.textContent = "复制词条链接", 1700);
  };

  const body = add(detail, "div", "detail-body");

  if (term.note) {
    const noteSection = add(body, "section", "detailblock");
    add(noteSection, "h2", "", "编录说明");
    add(noteSection, "p", "info", term.note);
  }

  renderReferences(body, term);
  updateActiveResult();

  if (updateHash) {
    history.replaceState(null, "", `#term-${term.id}`);
  }
}

$("search").addEventListener("input", search);
$("more").onclick = renderMore;

const termsRequest = fetch("./terms.json").then(response => {
  if (!response.ok) throw new Error(`terms.json: ${response.status}`);
  return response.json();
});

const referencesRequest = fetch("./references.json")
  .then(response => {
    if (!response.ok) throw new Error(`references.json: ${response.status}`);
    return response.json();
  })
  .catch(error => {
    console.warn("BearWiki references could not be loaded:", error);
    referenceLoadError = true;
    return {};
  });

Promise.all([termsRequest, referencesRequest])
  .then(([termData, referenceData]) => {
    if (!Array.isArray(termData)) {
      throw new Error("术语数据格式不正确。");
    }

    all = termData;
    references = referenceData && typeof referenceData === "object"
      ? referenceData
      : {};

    updateSourceSummary();
    renderLetters();
    search();

    const requestedId = Number(location.hash.match(/^#term-(\d+)$/)?.[1]);
    const requestedTerm = all.find(term => term.id === requestedId);
    if (requestedTerm) selectTerm(requestedTerm, false);
    else if (all.length) selectTerm(all[0], false);
  })
  .catch(error => {
    console.error("BearWiki failed to load:", error);
    $("detail").replaceChildren();
    add($("detail"), "div", "not-found", "术语数据载入失败，请刷新页面。");
    $("detail").firstElementChild.style.display = "block";
    $("count").textContent = "载入失败";
  });
