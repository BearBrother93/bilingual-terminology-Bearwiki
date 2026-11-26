# 维护工具

普通上传不需要执行任何工具。只将 dictionary/ 上传即可。

重建本批 WikDict 索引：Python 3.10+，安装 opencc-python-reimplemented==0.1.7。参数 --input 指向同时包含 G版-zh-en-00.json 至 G版-zh-en-63.json 的目录；--dictionary 指向待交付 dictionary；--reports 指向报告目录。例如：

```sh
python build.py --input /path/to/source --dictionary /path/to/site/dictionary --reports /path/to/reports
```

build.py 校验固定批次 64 分片，保留所有原始对象；构建前需确认该批次仍适用。后续词库不能直接沿用该适配器。本版网站 UI 的方向列表、来源页数量与版本是静态内容，重建新版本后须同步核对更新 index.html、sources.html、README 和 checkpoint，不允许只更新数据就宣称完成。

检索引擎自测（Node 18+；先在交付包根目录执行）：

```sh
node tools/test_index.mjs dictionary
python tools/verify_package.py .
```

test_index.mjs 使用文件后端测试 fetch 及缓存，不依赖本机预览服务。真实浏览器仍须另测；不能用此脚本替代 UI 验收。

reports/technical_issues.json 较大，因为保留所有机械结构标记。它不是重新进行的语言审校，也无需部署到网站。
