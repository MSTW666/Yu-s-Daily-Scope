# 现有每日活动搜集 → GitHub → 手机

来源为已有「设置每日活动搜集」，不另建内容搜集任务。Codex 本机定时检查该聊天，读取完整的当日正文并整理成现有网页和小组件的数据结构。

检查时间为北京时间每天 07:45、08:45、09:45、10:45、11:45，成功后当天跳过。电脑需开机、桌面应用运行、网络与 GitHub 登录可用。GitHub 自身无法读取私人聊天。

本地准备文件位于 `work/github-brief-sync/pending.json`，其中包含 source 证据和 briefing。只有 briefing 的公开摘要写入仓库，完整聊天正文留在本机。日期不明、读取不完整或当天无输出时不发布。

执行 `node work/daily-scope/scripts/publish-from-source.mjs work/github-brief-sync/pending.json`。脚本先校验当天日期和来源链接，再归档旧简报、提交更新、推送 GitHub，最后回读 GitHub Pages 核对日期、来源消息编号与条目。只有回读一致才写本机 `last-success.json`。

原 GitHub 07:30 排期任务保留，继续支持提前写好的排期。新的聊天转送在取得当日完整内容后直接发布，不必再等第二天。发生未提交编辑、分支冲突或权限问题时保留现场并报告。
