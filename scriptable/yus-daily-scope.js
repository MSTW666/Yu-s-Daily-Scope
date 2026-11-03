// ============================================================
//  Yu's Daily Scope · 小宇晨报  Scriptable 小组件
//  v5 · 数据源 = GitHub Pages，与网页读同一份 data/briefing.json
//  v5 变更：条目按 date_iso（截止日）升序；右上角加回 ↻；
//           问候区没放 PNG 时，用代码画一个镜头眼小机器人
//
//  用法：整段粘进 Scriptable，命名后即可用。
//  小组件参数（长按 → 编辑小组件 → Parameter）：
//    theme=b   切到紫色 Nebula Violet
//    reset=1   清掉本机缓存，强制重新拉一次
//  点组件 = 打开网页；网页右上角 ↻ 是手动刷新。
// ============================================================

// ---------------- ① 要确认的只有这两个地址 ----------------
const API_URL = "https://mstw666.github.io/Yu-s-Daily-Scope/data/briefing.json";
const WEB_URL = "https://mstw666.github.io/Yu-s-Daily-Scope/";

// App 里点 ▶ 预览时用哪个尺寸（不影响桌面上的组件）
const PREVIEW_FAMILY = "large";            // "large" 或 "medium"
const IMG_DIR = null;                       // PNG 放在 Scriptable 子目录时填目录名，否则留 null

// ---------------- ② 小组件参数 ----------------
const P = (function(){
  const out = {};
  String(args.widgetParameter || "").split("&").forEach(function(p){
    const kv = p.split("=");
    if (kv[0]) out[kv[0].trim()] = (kv[1] || "").trim();
  });
  return out;
})();
const THEME_KEY = String(P.theme || "a").toUpperCase() === "B" ? "B" : "A";

// ---------------- ③ 主题（与 tokens.json 同源） ----------------
const THEMES = {
  A: { bgDeep:"#071016", bgLight:"#0B222A",
       ink:"#EDF3EF", ink2:"#9DB6B2", dim:"#5F7A78",
       accent:"#63D3BF", amber:"#F1C489",
       card:new Color("#FFFFFF",0.045), hair:new Color("#FFFFFF",0.075),
       tile:"tile-a.png", bot:"bot-a.png" },
  B: { bgDeep:"#08070F", bgLight:"#181234",
       ink:"#F2EFFA", ink2:"#B4AAD2", dim:"#7A6F99",
       accent:"#A99BFF", amber:"#FFC98E",
       card:new Color("#FFFFFF",0.05), hair:new Color("#FFFFFF",0.09),
       tile:"tile-b.png", bot:"bot-b.png" }
};
const T = THEMES[THEME_KEY];

// ---------------- ④ 文案：优先用 GPT 写进 JSON 的 ----------------
const FALLBACK_MOTTO = "把好奇变成动作，把日常看成风景。";
function greeting(data){
  if (data && data.greeting) return data.greeting;
  const h = new Date().getHours();
  if (h < 11) return "小宇，早上好。";
  if (h < 14) return "小宇，中午好。";
  if (h < 18) return "小宇，下午好。";
  return "小宇，晚上好。";
}
function whisper(data, n){
  if (data && data.voice) return data.voice;
  return "我把今天捡回来了，一共 " + n + " 件。";
}
// ★ 真机微调点 1：各密度字号表（n 条 → 标题/摘要/内边距/间距）
function metrics(n){
  if (n <= 3) return { ti:14.5, sm:11.5, py:9,   gap:8 };
  if (n === 4) return { ti:13.5, sm:11,   py:6,   gap:5 };
  if (n === 5) return { ti:12.6, sm:10.4, py:4.5, gap:4 };
  return         { ti:11.8, sm:9.2,  py:2.5, gap:2 };   // 6 条：最紧
}

// ---------------- ⑤ 日期与状态 ----------------
function pad2(n){ return ("0" + n).slice(-2); }
function todayISO(){
  // 与网页一致，按北京时间判断「是不是今天」
  try {
    const s = new Intl.DateTimeFormat("sv-SE", {
      timeZone:"Asia/Shanghai", year:"numeric", month:"2-digit", day:"2-digit"
    }).format(new Date());
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  } catch(e){}
  const d = new Date();
  return d.getFullYear() + "-" + pad2(d.getMonth()+1) + "-" + pad2(d.getDate());
}
function formatToday(){
  const p = todayISO().split("-");
  const d = new Date(Number(p[0]), Number(p[1])-1, Number(p[2]));
  return Number(p[1]) + "月" + Number(p[2]) + "日 周" + "日一二三四五六"[d.getDay()];
}
function md(iso){
  if (!iso) return "";
  const p = String(iso).split("-");
  return p.length >= 3 ? Number(p[1]) + "/" + Number(p[2]) : String(iso);
}
// GPT 没给 date_label 时的兜底；字段名以线上 JSON 为准（date_end 不是 date_iso_end）
function dateLabel(it){
  if (it.date_label) return it.date_label;
  if (!it.date_iso || String(it.date_iso).indexOf("0000") === 0) return "日期待确认";
  switch (it.date_kind) {
    case "deadline":   return "截止 " + md(it.date_iso);
    case "exhibition": return "展至 " + md(it.date_iso);
    case "range":      return it.date_end ? md(it.date_iso) + "–" + md(it.date_end) : md(it.date_iso);
    default:           return md(it.date_iso);
  }
}
const CACHE_FILE = "yus-scope-cache.json";
function cacheTime(){
  try {
    const fm = FileManager.local();
    const c = JSON.parse(fm.readString(fm.joinPath(fm.documentsDirectory(), CACHE_FILE)));
    const d = new Date(c._fetchedAt);
    return isNaN(d.getTime()) ? "" : pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  } catch(e){ return ""; }
}

// ---------------- ⑥ 数据加载 + 四态 ----------------
// state: live（今日已同步）| cache（断网用今日缓存）| stale（非今日）| error（无内容）
async function loadData(){
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), CACHE_FILE);
  let cached = null;
  if (P.reset === "1") {
    try { if (fm.fileExists(cachePath)) fm.remove(cachePath); } catch(e){}
  } else if (fm.fileExists(cachePath)) {
    try { cached = JSON.parse(fm.readString(cachePath)); } catch(e){}
  }
  try {
    const req = new Request(API_URL + "?t=" + Date.now());
    req.timeoutInterval = 12;
    req.headers = { "Cache-Control": "no-cache" };
    const json = await req.loadJSON();
    if (!json || !Array.isArray(json.items)) throw new Error("bad payload");
    json._fetchedAt = Date.now();
    fm.writeString(cachePath, JSON.stringify(json));
    // 关键：按数据里的 date 判断，而不是按抓取时间，和网页保持同一套语义
    return { data: json, state: json.date === todayISO() ? "live" : "stale" };
  } catch(e) {
    if (cached && cached.items && cached.items.length) {
      return { data: cached, state: cached.date === todayISO() ? "cache" : "stale" };
    }
    return { data: null, state: "error" };
  }
}

// ---------------- ⑦ 图片（可选，找不到自动降级为纯色块） ----------------
function loadImage(name){
  const fms = [FileManager.local()];
  try { fms.push(FileManager.iCloud()); } catch(e){}
  for (const fm of fms) {
    const p = IMG_DIR ? fm.joinPath(fm.documentsDirectory(), IMG_DIR + "/" + name)
                      : fm.joinPath(fm.documentsDirectory(), name);
    try { if (fm.fileExists(p)) return Image.fromFile(p); } catch(e){}
  }
  return null;
}
function brandMark(stack, size){
  const img = loadImage(T.tile);
  if (img) { const i = stack.addImage(img); i.imageSize = new Size(size, size); return; }
  // 没放 PNG 也能跑：整块品牌色 + 反白 YU，和网页「整块图标」同一语言
  const b = stack.addStack();
  b.size = new Size(size, size);
  b.cornerRadius = Math.round(size * 0.28);
  b.backgroundColor = new Color(T.accent);
  b.centerAlignContent();
  const t = b.addText("YU");
  t.font = Font.boldSystemFont(Math.round(size * 0.40));
  t.textColor = new Color(T.bgDeep);
  t.centerAlignText();
}
// 代码版小机器人：暖黄天线点 + 两个镜头眼（左亮右暗）+ 身体线，不依赖 PNG
function miniBot(parent, w){
  const eye = Math.max(4, Math.round(w * 0.30));
  const ant = Math.max(2, Math.round(w * 0.10));
  const c = parent.addStack();
  c.layoutVertically();
  c.centerAlignContent();                    // 垂直布局下 = 水平居中
  c.spacing = Math.max(1.5, w * 0.08);
  const ad = c.addStack(); ad.size = new Size(ant, ant);
  ad.cornerRadius = ant / 2; ad.backgroundColor = new Color(T.amber);
  const eyes = c.addStack(); eyes.layoutHorizontally();
  eyes.spacing = Math.max(2, w * 0.12);
  const e1 = eyes.addStack(); e1.size = new Size(eye, eye);
  e1.cornerRadius = eye / 2; e1.backgroundColor = new Color(T.accent);
  const e2 = eyes.addStack(); e2.size = new Size(eye, eye);
  e2.cornerRadius = eye / 2; e2.backgroundColor = new Color(T.dim);
  const line = c.addStack(); line.size = new Size(Math.round(w * 0.7), 1);
  line.backgroundColor = new Color(T.hair);
}

// ---------------- ⑧ 基础部件 ----------------
function bg(widget){
  const g = new LinearGradient();
  g.locations = [0, 0.55, 1];
  g.colors = [new Color(T.bgDeep), new Color(T.bgDeep), new Color(T.bgLight)];
  g.startPoint = new Point(0, 0);
  g.endPoint   = new Point(0.85, 1);
  widget.backgroundGradient = g;
}
function txt(stack, str, size, color, weight, extra){
  const t = stack.addText(String(str == null ? "" : str));
  t.font = weight === "bold" ? Font.boldSystemFont(size)
         : weight === "semi" ? Font.semiboldSystemFont(size)
         : weight === "round" ? Font.roundedSystemFont(size)
         : Font.systemFont(size);
  t.textColor = new Color(color);
  t.lineLimit = extra && extra.lines ? extra.lines : 1;
  return t;
}
function stateLabel(state){
  if (state === "live")  return "已同步";
  if (state === "cache") return "缓存 " + cacheTime();
  if (state === "stale") return "非今日";
  return "未连接";
}
function headRow(w, data, state){
  const h = w.addStack(); h.layoutHorizontally(); h.centerAlignContent();
  brandMark(h, 18); h.addSpacer(7);
  const label = (state === "stale" ? "非今日 · " : "") + formatToday() +
                (data && data.issue ? " · 第 " + data.issue + " 期" : "");
  txt(h, label, 10.2, T.ink, "semi");
  h.addSpacer();
  const dotColor = state === "live" ? T.accent : state === "cache" ? T.amber : T.dim;
  const ds = h.addStack(); ds.cornerRadius = 2; ds.size = new Size(4, 4);
  ds.backgroundColor = new Color(dotColor); h.addSpacer(4);
  txt(h, stateLabel(state), 8.6, T.ink2, "regular");
  h.addSpacer(5);
  const rf = h.addText("↻");
  rf.font = Font.systemFont(9.5);
  rf.textColor = new Color(T.ink2);
}
function greetBlock(w, data, n){
  const g = w.addStack(); g.layoutHorizontally(); g.centerAlignContent(); g.spacing = 8;
  const bot = loadImage(T.bot);
  if (bot) { const i = g.addImage(bot); i.imageSize = new Size(24, 22); }
  else miniBot(g, 20);
  const col = g.addStack(); col.layoutVertically(); col.spacing = 2;
  txt(col, greeting(data), 17.5, "#FFFFFF", "semi");
  txt(col, whisper(data, n), 9.6, T.ink2, "regular");
}
function itemRow(w, it, idx, m, lite){
  const r = w.addStack(); r.layoutHorizontally(); r.centerAlignContent();
  r.backgroundColor = T.card; r.cornerRadius = 9;
  r.setPadding(m.py, 9, m.py, 8);
  txt(r, String(idx+1).padStart(2,"0"), 10.2, T.dim, "semi");
  r.addSpacer(6);
  const mid = r.addStack(); mid.layoutVertically(); mid.spacing = 1.5;
  txt(mid, it.title, m.ti, T.ink, "semi");
  if (!lite) txt(mid, it.summary || "", m.sm, T.ink2, "regular");
  r.addSpacer();
  const dt = txt(r, dateLabel(it), 9.3, T.amber, "semi");
  dt.rightAlignText();
}

// ---------------- ⑨ 大组件：1–6 条 ----------------
async function renderLarge(w, data, state){
  bg(w); w.setPadding(13,13,13,13);
  const items = data ? data.items : [];
  headRow(w, data, state);
  w.addSpacer(9);

  if (state === "error" || !items.length){
    txt(w, "今天还没连上。", 13, T.ink, "semi");
    w.addSpacer(4);
    txt(w, "我先把你上次看的留着。", 9.6, T.ink2, "regular");
    w.addSpacer();
    txt(w, FALLBACK_MOTTO, 8.4, T.dim, "regular");
    return;
  }

  greetBlock(w, data, items.length);
  w.addSpacer(9);

  const big = items.slice(0, 6);            // 1–6 条全放大组件，7 条起进中组件
  const m = metrics(big.length);
  for (let i = 0; i < big.length; i++) {
    itemRow(w, big[i], i, m, false);
    if (i < big.length - 1) w.addSpacer(m.gap);
  }
  w.addSpacer();                            // ★ 真机微调点 2：底部空洞时改这里
  const f = w.addStack(); f.layoutHorizontally(); f.centerAlignContent();
  txt(f, data.quote || FALLBACK_MOTTO, 8.4, T.dim, "regular");
  f.addSpacer();
  txt(f, "全部 " + items.length + " 条 ›", 8.8, T.amber, "semi");
}

// ---------------- ⑩ 中号组件：7–9 条续页 ----------------
async function renderMedium(w, data, state){
  bg(w); w.setPadding(12,13,12,13);
  const rest = data && data.items ? data.items.slice(6, 9) : [];
  const h = w.addStack(); h.layoutHorizontally(); h.centerAlignContent();
  brandMark(h, 15); h.addSpacer(6);
  txt(h, "续", 8, T.amber, "semi"); h.addSpacer(5);
  txt(h, formatToday(), 10, T.ink, "semi");
  h.addSpacer();
  txt(h, stateLabel(state), 8.4, T.ink2, "regular");
  h.addSpacer(5);
  const rf = h.addText("↻");
  rf.font = Font.systemFont(9);
  rf.textColor = new Color(T.ink2);
  w.addSpacer(8);
  if (!rest.length){ txt(w, "上面就是全部了。", 11, T.ink2, "regular"); return; }
  for (let i = 0; i < rest.length; i++) {
    itemRow(w, rest[i], i + 6, { ti:12.4, sm:0, py:5, gap:0 }, true);
    if (i < rest.length - 1) w.addSpacer(5);
  }
  w.addSpacer();
  txt(w, "我盯着截止日，放心。", 8.4, T.ink2, "regular");
}

// 按截止日从近到远；没填 date_iso 的垫底（不改线上数据，只影响显示顺序）
function byDate(a, b){
  const da = String(a.date_iso || "9999");
  const db = String(b.date_iso || "9999");
  return da < db ? -1 : da > db ? 1 : 0;
}

// ---------------- ⑪ 入口 ----------------
const { data, state } = await loadData();
if (data && data.items) data.items.sort(byDate);
const family = config.runsInWidget ? (config.widgetFamily || "large") : PREVIEW_FAMILY;
const widget = new ListWidget();
if (family === "medium") await renderMedium(widget, data, state);
else                     await renderLarge(widget, data, state);

try { widget.url = WEB_URL; } catch(e) {}
try { widget.widgetURL = WEB_URL; } catch(e) {}   // 兼容旧版 Scriptable
widget.refreshAfterDate = new Date(Date.now() + 25 * 60 * 1000);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  // 在 App 里点 ▶ 时直接预览，方便调字号
  if (family === "medium") await widget.presentMedium();
  else                     await widget.presentLarge();
}
Script.complete();
