<div align="center">
  <img src="assets/mark.svg" width="80" alt="Yu’s Daily Scope 产品图标">
  <h1>Yu’s Daily Scope · 小宇晨报</h1>
  <p><strong>每天早上，先看值得你留意的几件事。</strong></p>
  <p>一份可以按个人兴趣定制的每日简报。主屏幕扫读，网页展开，原文一键直达。</p>
  <a href="https://mstw666.github.io/Yu-s-Daily-Scope/">打开小宇晨报</a> ·
  <a href="scriptable/yus-daily-scope.js">iPhone 小组件</a> ·
  <a href="#定制你的版本">定制你的版本</a>
</div>

**直接体验** · [打开当前网页版](https://mstw666.github.io/Yu-s-Daily-Scope/) · [查看当前 Scriptable 脚本](scriptable/yus-daily-scope.js)

## 小宇怎么用

小宇关注摄影征集、附近展览和机器人活动。早上从 iPhone 主屏幕扫一眼标题和日期，遇到想参加的项目，再打开网页看资格、费用、准备事项和原文。

| 使用场景 | 你会看到什么 |
| --- | --- |
| 主屏幕扫读 | Scriptable 大号组件显示前 6 条，中号接续第 7–9 条。组件按日期排序，临近截止的事项有醒目标记。 |
| 网页读详情 | 当期完整简报、YU-1 问候、每条机会的说明和来源链接。网页保留编排顺序。 |
| 网络不稳 | 两端可回退到已有缓存，并提示缓存或非今日状态。 |
| 更换配色 | 网页地址加 `?theme=b`，组件 Parameter 填 `theme=b`，切换紫色主题。 |

## 定制你的版本

1. **选你关心的事**。例如招聘、独立开发、城市活动，或者像小宇一样关注摄影和机器人。
2. **写一份自己的简报**。从[排期模板](data/queue/_template.json)开始，设置期号、发布日期、问候语和条目。每条写明适合谁、要做什么、日期和原文出处。
3. **安排上线**。把文件按 `YYYY-MM-DD.json` 命名并放入 `data/queue/`。当前工作流按北京时间 07:30 调度，校验并发布当天排期，归档上一期。
4. **放到手机上**。把[脚本](scriptable/yus-daily-scope.js)导入 Scriptable，添加主屏幕组件。使用自己的站点时，将脚本里的数据地址指向你的 GitHub Pages。

网页和组件共用一份 [简报 JSON](data/briefing.json)。准备选题和内容后，GitHub Actions 负责发布，GitHub Pages 提供网页和数据。部署、校验与维护细节见[配置手册](docs/setup.md)。

## 品牌图标

<img src="assets/mark.svg" width="56" alt="取景框与星球组合标志">

取景框和星球组成 Scope 的标志。取景框代表关注范围，星球代表每天进入视野的新机会。
