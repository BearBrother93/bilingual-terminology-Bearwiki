# 维基熊 BearWiki · 通用英汉词典 V1.0

## 发布

将此更新包**解压后的相对路径文件**上传到 GitHub 仓库 `BearBrother93/bilingual-terminology-Bearwiki` 的**根目录**：

- `index.html` — 根首页（保留财经、电力、娱乐入口，新增通用词典宣传与快捷搜索）
- `dictionary/index.html` — 通用词典主页
- `dictionary/style.css` — 通用词典样式
- `dictionary/app.js` — 通用词典查询逻辑
- `dictionary/README.md` — 本说明

**不要**把它们上传到 `financial-glossary/` 或 `power-glossary/`，不要上传 ZIP 本身，也不要重新上传原来的 JSON、游戏 HTML。 

预计线上地址：`https://bearbrother93.github.io/bilingual-terminology-Bearwiki/dictionary/`

## 数据来源、网络和许可说明

1. 英文义项、例句、音标及语音通过 [Free Dictionary API](https://dictionaryapi.dev/) **查询时直接请求**：`https://api.dictionaryapi.dev/api/v2/entries/en/<word>`；服务不保证永久可用，词条覆盖范围不等于完整纸质词典。
2. 中文参考解释通过 [MyMemory](https://mymemory.translated.net/doc/spec.php) 的免费公共翻译接口**查询时直接请求**。这是自动翻译，**不等于经过审校的词典释义**。匿名请求有限额，用户联网情况可能影响可用性。按需翻译第一条解释会额外消耗额度。
3. 网站不下载、复制或镜像任何商业词典数据库，剑桥/必应/谷歌/维基词典为外部跳转链接。
4. 不设置或暴露私有 API Key；无后端服务器。查询内容会被第三方接口接收，需遵守各服务商政策。
5. 当前**没有导入 ECDICT 全量数据库**，因此还不是离线全文英汉词典。该项目的汇编数据涉及多来源，尚需确认再分发边界后再考虑整库导入。
6. 通用词典查询和自动译文不得自动写入 BearWiki 财经、电力等专业术语的来源记录。

## 本版功能

- 英语单词 / 少量短语查找，URL 参数 `?q=...`、首页直达搜索
- 英文词性、释义、例句、近义词、音标（如有）
- 有声源时播放音频；无音频尝试浏览器英语语音合成
- 中文辅助译文、可手动翻译首条英文释义；失败时清楚提示
- 外部词典链接；安全性处理；支持手机浏览
- 查询数据直接写入页面，不保存为站内长期词条

## 未实现 / 待未来版本

- 大型离线英汉数据库、审校后的分义项英汉对照、词根词缀、词源、中文词形检索、稳定的服务器侧缓存。
- 中国大陆网络连通性须实地测试。若公共接口被阻断，仍可使用外部跳转链接（但不保证跳转目标可访问）。
