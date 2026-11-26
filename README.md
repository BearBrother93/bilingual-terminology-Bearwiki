# 维基熊多语词典 V2.0 · 首批可部署包

本包先上线已提供的 WikDict 汉英 00–63 全部 64 分片，共 136,854 条记录；支持汉英、本地英文译法反查，并保留原有在线英英查询。没有进行第二轮语言审校，没有改动词典释义，也没有修改线上仓库。

## 包内目录

| 路径 | 用途 | 是否上传网站 |
|---|---|---|
| dictionary/ | 完整公开词典目录，含数据、索引、页面、许可 | 必须，替换原 dictionary/ |
| optional-home/index.html | 只更新主站词典卡片文字和输入提示 | 可选，放到仓库根目录覆盖 index.html |
| reports/ | 完整性、统计、搜索、兼容、性能、授权报告及机器清单 | 无需上传 |
| tools/ | 本批可复用构建 / 验证程序 | 无需上传 |
| CHECKPOINT.md | 当前完成范围与后续接入断点 | 无需上传 |

只上传解压后的 dictionary/，不要上传 ZIP 本身来期待自动解压；不要把整个交付包覆盖主站。目录必须是 仓库根目录/dictionary/index.html，不能变成 dictionary/dictionary/index.html。

## 推荐：GitHub Desktop 一次性提交

1. 在 GitHub Desktop 克隆现有 bilingual-terminology-Bearwiki 仓库，先 Fetch / Pull 获取当前版本；备份本地原 dictionary/ 和根 index.html。
2. 在资源管理器中，以本包 dictionary/ 替换仓库中的同名目录。数据目录必须完整复制。
3. 如需同步首页说明，只把 optional-home/index.html 复制到仓库根目录；不要把 optional-home 文件夹当成网站首页目录。
4. 查看 Changes：仅应出现 dictionary/ 及可选根 index.html。若财经、电力、knowledge、entertainment 被改动，先撤销这些额外改动。
5. Commit 后 Push。保持原有 GitHub Pages 发布分支和目录配置，等待原发布流程完成。
6. 打开原站的 /dictionary/，必要时 Ctrl+Shift+R；按下面清单验收。

本目录包含 1,505 个小文件，推荐 GitHub Desktop 或正常 Git 提交。GitHub 网页上传适合少量文件，分批上传时容易漏掉索引或数据；如确实使用网页上传，必须逐级保持路径并核对完整文件清单，且避免先发布只含页面不含数据的半成品。

## 上线验收清单

- 首页空白加载正常；不必登录。
- 从主站旧查词入口输入 charge：英文释义、词性、音标及可用音频正常。
- 苹果与蘋果：均命中原词头“蘋果”。
- 中央银行：命中中央銀行 / central bank。
- 选择英汉反查，apple 与 APPLE：均显示 9 条记录。
- 巴勒斯坦：5 个详细义项完整。
- 选择前缀搜索，app：40 个候选，展开后 52 个。
- 手机端没有横向溢出；来源与授权链接能打开。
- 财经、电力、知识专题、娱乐各入口正常。

旧链接 /dictionary/?q=charge 保持兼容。新链接可使用 ?q=苹果&dir=zh-en 或 ?q=apple&dir=en-zh。自动识别下英文仍查在线英英，中文查本地汉英。

## 注意范围

英汉方向是汉英数据的反查，不是独立英汉词典。日英、英日、日汉、汉日尚未接入，因为本轮没有提供对应文件；以后按来源逐部增加。所有质量疑点保留并另记，来源评分不等于本站准确率。大陆网络速度、实体手机、Safari / 微信内置浏览器需上线后再实测。

遇到加载失败，先核对 dictionary/catalog.json 指向的完整版本目录是否上传。不能只替换 app.js 而遗漏 data/；不能混用不同版本目录。回滚时一起恢复旧 dictionary/，若更换过首页则同时恢复其备份。

浏览器双击本地 HTML 的 file:// 模式可能阻止 ES 模块和 JSON fetch；请通过 GitHub Pages 或本地 HTTP 服务器预览。
