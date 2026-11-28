# BearWiki Dictionary V1.0 · 渐进编录空壳

在 GitHub 的 dictionary/ 内上传本包 dictionary/ 的内容，不要嵌套。旧细切片目录已删除，不需恢复。其他站点栏目不动。

## 后续发布
- 初始发布清单 shards 为 []，zh-en-00.json 是空数组占位。
- 只发布经编辑确认可以公开的词条（w/t/s/i/g/d 原结构）；不要把未审校的整个底稿上传。
- 首次发布某分片：在 data/zh-en/shards/ 上传对应 zh-en-XX.json，并在 data/zh-en/manifest.json 的 shards 数组追加该文件名（例如 ["zh-en-00.json"]）。之后更新同一分片只需替换累计版 JSON。
- 未登记的分片不会加载；已登记但缺失或格式错误会明确报错，避免静默遗漏。
- 新词头直接纳入相应累计发布分片，不重复。别名登记于 corrections.json 的 aliases 数组，例如 {"query":"丁种维生素","w":"丁種維生素"}。
- corrections 数组支持既有词头的 t/d 修订，字段 w/expected/set/status（human_confirmed）/reason/reference_ids。expected 和 set 均包含改动字段；旧值冲突不强制覆盖。references.json 的 references 对象按 ID 登记 description/urls/reported_verification。未发布词头的修订不会自动上线。新增词条写入分片，而不是旧版 additions 结构。
- 英汉反查和前缀索引在浏览器内由已发布数据生成，不需要上传细切片索引。随发布规模增长，需评估首查加载速度。
- 未登记简繁别名不会自动转换；在线英英沿用原接口，依赖网络。
- 不要上传审校底稿、未确认记录、私有来源或离线维护包。
