# Yu's Daily Scope · 每日机会简报

一个纯静态的个人简报站：网页 + JSON 数据 + GitHub Actions 定时发布。没有服务器、没有数据库、不花钱。
iPhone 小组件（Scriptable）直接读同一份 `data/briefing.json`，两端配色与字号同源。

```
index.html                 简报网页（读同目录 data/briefing.json，含加载/空/失败/旧内容四态）
assets/mark.svg            品牌图标（取景框 × 星球）
data/briefing.json         当前线上内容 ← 网页与组件都读这里
data/queue/<日期>.json     排期内容，到点自动顶上去（文件名必须是 YYYY-MM-DD.json）
data/archive/<日期>.json   自动归档的历史
data/queue/_template.json  排期模板（下划线开头，不会被发布）
scripts/validate.mjs       字段校验（含「展期不能写截止」这类硬错误）
scripts/promote.mjs        把排期文件提升为线上内容
.github/workflows/publish.yml  每天 07:30（北京时间）跑一次
```

---

## 一、一次性上线（约 10 分钟）

### 1. 建仓库

打开 https://github.com/new

- **Repository name**：`yus-daily-scope`
- 选 **Public**（Pages 免费版对公开仓库最省事；Private 需要 Pro 才能开 Pages）
- **不要**勾选 Add a README / .gitignore / license（本地已经有文件了）
- 点 **Create repository**

### 2. 把文件推上去

三种方式选一种，**推荐 A**。

**A. 命令行（在 `yus-daily-scope-site` 目录里执行）**

```bash
git init
git add -A
git commit -m "init: Yu's Daily Scope"
git branch -M main
git remote add origin https://github.com/<你的用户名>/yus-daily-scope.git
git push -u origin main
```

推送时会要求账号密码 —— **密码位置要填 Personal Access Token**，不是 GitHub 登录密码。
生成方式：GitHub 右上头像 → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token → 勾 `repo` → 复制那串 `ghp_...`。

**B. GitHub Desktop**：File → Add local repository → 选这个目录 → Publish repository（记得取消勾选 Keep this code private）。

**C. 网页上传**：仓库页 → Add file → Upload files → 把 `index.html`、`assets/`、`data/`、`scripts/`、`.github/` 全部拖进去 → Commit。
注意：拖拽上传**不会带上 `.github` 隐藏文件夹**，定时任务会缺；所以 C 只适合先看网页效果。

### 3. 打开 Pages

仓库 → **Settings** → 左侧 **Pages** →

- **Source**：`Deploy from a branch`
- **Branch**：`main` / **`/(root)`** → **Save**

等 30–60 秒，页面上方会出现网址：

```
https://<你的用户名>.github.io/yus-daily-scope/
```

### 4. 验收（3 条）

1. 手机浏览器打开上面这个网址 —— 应看到深蓝绿页面、9 条简报、页首问好与机器人
2. 打开 `https://<你的用户名>.github.io/yus-daily-scope/data/briefing.json` —— 应直接看到一段 JSON
3. 仓库 **Actions** 标签里能看到 `每日发布 07:30` 这个工作流（没跑过是正常的）

> 第 2 条很关键：它是 Scriptable 的数据源，能打开就说明链路通了。

---

## 二、每天怎么更新（选一种）

### 方式 1 · 手动改线上文件（最快，1 分钟）

GitHub 打开 `data/briefing.json` → 右上铅笔图标 → 把整段换成 GPT 给你的 JSON → Commit changes。
网页立刻更新（Pages 构建约 30 秒，期间可能还是旧内容）。

### 方式 2 · 排期 + 自动发布（推荐，等于「定时发布」）

1. 复制 `data/queue/_template.json`
2. 命名为**要发布的那天**，例如 `2026-11-04.json`，内容换成当天简报
3. 提交进 `data/queue/`
4. 到 **07:30（北京时间）**，Actions 自动把它变成 `data/briefing.json`，并把旧内容归档

好处：可以提前几天把内容排好，早上不用管。想提前手动触发：Actions → 每日发布 07:30 → Run workflow。

### 方式 3 · 让 GPT 直接产出可用 JSON

给 GPT 的指令里加上这段输出约定，产出即可直接粘进 `data/queue/2026-11-05.json`：

```json
{
  "issue": 129,
  "date": "2026-11-05",
  "greeting": "小宇，早上好。",
  "voice": "我天没亮就醒了，替你翻了一遍。",
  "blessing": "两句话，说清今天最值得先看什么。",
  "quote": "一句格言。",
  "items": [
    {
      "title": "不超过 32 字，把「谁 + 什么机会」说清",
      "summary": "60–90 字：谁可以参加、要交什么、费用或门槛。",
      "date_kind": "deadline",
      "date_label": "截止 11/10",
      "date_iso": "2026-11-10",
      "source_name": "worldphoto.org",
      "source_url": "https://..."
    }
  ]
}
```

`date_kind` 只能是这四个值：

| date_kind | 含义 | date_label 写法 | 是否算「临近截止」 |
|---|---|---|---|
| `deadline` | 报名/投稿截止 | `截止 11/10` | 是（≤7 天会标黄） |
| `exhibition` | 展期 | `展至 11/15`、跨年写 `展至 2027/3/31` | 否 |
| `range` | 有起止的活动 | `11/12–11/15` | 否 |
| `event` | 单日活动 | `11/22` | 否 |
| `tbd` | 日期未确认 | `日期待确认` | 否 |

提交前本地可以自检（装了 Node 的话）：

```bash
node scripts/validate.mjs data/queue/2026-11-05.json
```

它会拦住最常见的错：**把展期写成「截止」**、`date_iso` 漏了、URL 不合法。

---

## 三、接上 iPhone 小组件

打开 Scriptable 里的 `yus-daily-scope.js`，只改两行：

```js
const API_URL = "https://<你的用户名>.github.io/yus-daily-scope/data/briefing.json";
const WEB_URL = "https://<你的用户名>.github.io/yus-daily-scope/";
```

其余不用动：脚本会缓存、判三态（已同步 / 显示缓存 / 非今日）、按小时切换问候语。

---

## 四、常见问题

**网页 404**
Pages 还没构建完，或 Source 选错了分支/目录。Settings → Pages 里会显示当前发布的网址和最近一次部署状态。

**Actions 没在 07:30 跑**
① 仓库 60 天没有任何提交时，GitHub 会自动停用定时任务（提交一次即可恢复）；
② cron 是 UTC，`30 23 * * *` 才是北京 07:30；
③ 免费额度下有排队延迟，晚十几分钟正常。

**改了 JSON 但网页还是旧的**
Pages 有 CDN 缓存。加个查询参数强刷，例如 `?v=2`；或等 1–2 分钟。

**想看另一种配色**
网址后面加 `?theme=b` 是紫色版；想长期用紫色的，把 `index.html` 里 `<html data-theme="a">` 改成 `b`。

**内容会不会被搜索引擎收录**
默认会。不想被收录就在仓库根目录加一个 `robots.txt`：

```
User-agent: *
Disallow: /
```

**以后想换域名**
Settings → Pages → Custom domain 填自己的域名，按提示在域名商加 CNAME 记录，勾选 Enforce HTTPS。
