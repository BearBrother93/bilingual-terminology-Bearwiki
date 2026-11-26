# 项目断点 · BearWiki 多语词典升级 V2.0

日期：2026-11-25（北京时间）。发布批次：batch01。阶段：首批集成、技术 QA、部署准备完成；未修改线上仓库。

## 已处理范围

- 网站底稿：bilingual-terminology-Bearwiki-main.zip，本次附件。
- 数据底稿：所选“词典文件-Gemini版”中的 G版-zh-en-00.json 至 G版-zh-en-63.json，64 / 64 全部处理，无遗漏。
- 数据量：136,854 条；10,679 个详细义项。全部源对象与部署后回读逐条相等。
- 来源：Wiktionary → DBnary → WikDict；前期 Gemini 初步复核。CC BY-SA 4.0；OpenCC 辅助索引 Apache-2.0。
- 本地词库版本：20261125-54c42e57589d。应用版本：2.0-batch01；静态代码缓存标记 2.0.1。
- 可用方向：汉英；英汉（现有汉英译法反查）；英英（原有 Free Dictionary API）。
- 技术验收：全索引 244,232 键、365,014 关联；实际桌面与窄屏网页、旧首页、GitHub 项目子路径、错误提示等已测。

## 交付文件

- BearWiki_Dictionary_V2.0_Batch01_20261125.zip：完整 dictionary/、可选首页、报告、工具与本记录。
- reports/01_数据完整性检查.md 至 06_来源授权核验.md。
- reports/language_counts.csv、data_summary.json、source_manifest.json、asset_manifest.json、technical_issues.json、index_tests.json、browser_tests.json、compatibility_checks.json。
- tools/build.py：只适配本批实际 WikDict w/t/s/i/g/d 结构，不适配其他词典。
- tools/test_index.mjs：全索引及搜索算法验证；tools/verify_package.py：部署清单和哈希验证。

## 未做 / 下一步

1. 用户将本包 dictionary/ 先上传现有网站，观察布局、速度与查词体验。可选首页独立提供。
2. 在中国大陆实际网络和实体手机完成上线后可达性测试。预览环境性能不代替这一步。
3. 下一部词典的文件名与范围尚未确定，不能凭旧聊天推定已经提供。收到后先核对来源、许可、版本、实际字段和分片规则，再单独编写适配器和索引；按字典 ID 独立放置数据。
4. 后续英汉或日语词典不得假定与 WikDict 相同，也不得把正向词典简单反转后冒充独立来源。跨源数据分别标注。
5. 语言第二轮审校继续暂停。technical_issues.json 中重复编号、缺少义项 / 词性、标记残留等仅登记，未修改。
6. 下一次数据替换须保留原版本用于回滚；构建新版本路径、更新目录、来源说明及数量，实际运行检查后再交付。不能只替换 JSON 而沿用旧索引。

## 术语及显示规则

原词头、释义、词性、来源评分和元数据保持输入原貌；简繁只作索引别名；原 d[].id 不作唯一键；系统朗读明确区别词典音频；英汉反查标签保持明确。本轮没有统一或润色语言术语。
