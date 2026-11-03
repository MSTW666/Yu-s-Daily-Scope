#!/usr/bin/env node
/**
 * 校验 data/briefing.json 的字段是否合规。
 *   node scripts/validate.mjs [文件路径]
 * 退出码：0 = 通过（可能有警告），1 = 有错误
 */
import fs from "node:fs";
import path from "node:path";

const KINDS = new Set(["deadline", "exhibition", "range", "event", "tbd"]);
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validateBriefing(b) {
  const errors = [];
  const warnings = [];
  const E = (m) => errors.push(m);
  const W = (m) => warnings.push(m);

  if (!b || typeof b !== "object") return { errors: ["根节点不是对象"], warnings };

  if (!ISO.test(b.date || "")) E(`date 必须是 YYYY-MM-DD，现在是 ${JSON.stringify(b.date)}`);
  if (b.issue != null && !Number.isInteger(b.issue)) E("issue 必须是整数");
  if (!b.greeting) W("缺少 greeting，页面会退回默认问候");
  if (!b.quote) W("缺少 quote，页面会退回默认格言");

  const items = b.items;
  if (!Array.isArray(items) || items.length === 0) {
    E("items 必须是非空数组");
    return { errors, warnings };
  }
  if (items.length > 12) W(`共 ${items.length} 条，超过 12 条时网页会很长`);
  if (items.some((x) => x.date_kind === "deadline")) {
    const upcoming = items.filter((x) => x.date_kind === "deadline" && x.date_iso >= b.date).length;
    if (!upcoming) W("没有任何未过期的 deadline，检查一下日期是否都写成了过去");
  }

  items.forEach((it, i) => {
    const at = `items[${i}]`;
    if (!it.title) E(`${at}.title 必填`);
    else if (it.title.length > 60) W(`${at}.title 有 ${it.title.length} 字，超过 60 字容易换行成三行`);
    if (!it.date_kind) E(`${at}.date_kind 必填（deadline | exhibition | range | event | tbd）`);
    else if (!KINDS.has(it.date_kind)) E(`${at}.date_kind 取值非法：${it.date_kind}`);
    if (!it.date_label) E(`${at}.date_label 必填（例如「截止 11/10」「展至 11/15」「11/12–11/15」）`);
    // 语义护栏：展期绝不能写「截止」
    if (it.date_kind === "exhibition" && /截止/.test(it.date_label || ""))
      E(`${at}.date_label 写了「截止」，但 date_kind 是 exhibition —— 展期必须写「展至」`);
    if (it.date_kind === "deadline" && /展至/.test(it.date_label || ""))
      E(`${at}.date_label 写了「展至」，但 date_kind 是 deadline`);
    if (["deadline", "range", "event"].includes(it.date_kind) && !ISO.test(it.date_iso || ""))
      E(`${at}.date_iso 必填且为 YYYY-MM-DD（用于算剩余天数与排序）`);
    if (it.date_kind === "range" && it.date_iso && it.date_end && it.date_end < it.date_iso)
      E(`${at}.date_end 早于 date_iso`);
    if (it.source_url) {
      try { new URL(it.source_url); } catch { E(`${at}.source_url 不是合法 URL`); }
    } else W(`${at} 没有 source_url，详情页将没有「打开原文」`);
    if (it.summary && it.summary.length > 120) W(`${at}.summary 有 ${it.summary.length} 字，建议 60–90 字`);
  });

  return { errors, warnings };
}

/* 直接运行时作为 CLI 使用 */
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("validate.mjs")) {
  const file = process.argv[2] || path.join("data", "briefing.json");
  if (!fs.existsSync(file)) {
    console.error(`✖ 找不到文件：${file}`);
    process.exit(1);
  }
  let json;
  try { json = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { console.error(`✖ JSON 语法错误：${e.message}`); process.exit(1); }

  const { errors, warnings } = validateBriefing(json);
  warnings.forEach((w) => console.log(`⚠ ${w}`));
  if (errors.length) {
    errors.forEach((e) => console.error(`✖ ${e}`));
    console.error(`\n校验失败：${errors.length} 个错误`);
    process.exit(1);
  }
  console.log(`✔ 校验通过：${json.date} · ${json.items.length} 条 · 第 ${json.issue ?? "-"} 期`);
  if (warnings.length) console.log(`（${warnings.length} 条警告，不影响发布）`);
}
