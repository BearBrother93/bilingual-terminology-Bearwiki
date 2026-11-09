# 维基熊通用词典 V1.2.2（零翻译接口版）

## 更新目的
取消 V1.2.1 的自动中文释义、逐义项翻译按钮和 MyMemory 请求。右侧改为“词条概览”，统计同一次 Free Dictionary API 返回的英文词性、义项、例句数，并摘录各词性的第一条英文释义。**不是 AI 总结，也不调用任何 AI 摘要/翻译服务。**

## 部署
把 ZIP 中 `dictionary/` 文件夹内的 `index.html`、`app.js`、`style.css` 上传到 GitHub 仓库现有的 `dictionary/` 文件夹覆盖同名文件。**不要**上传整个目录到 `dictionary/dictionary/`。

不会覆盖仓库根目录主页、英中术语、财经、电力、娱乐游戏文件或任何 JSON 术语数据。

浏览 https://bearbrother93.github.io/bilingual-terminology-Bearwiki/dictionary/?q=charge 检查新版；必要时 Ctrl+Shift+R 强制刷新。

## 数据与限制
* 英文释义仍通过 `api.dictionaryapi.dev` 按需在线查询；不保证接口总可用。
* 未引入任何本地英汉释义数据，所以本版**暂不提供站内中文词义**；需要中文词义可使用右侧外部词典链接。
* 输入汉字时不执行在线翻译；提示仅支持英文查询。
* 右侧结构化概览来自同一份英文 API 数据，不发送额外请求，不产生翻译/AI 费用。
* 若未来导入开放授权的英汉词典，可重新提供真实的中文义项。
