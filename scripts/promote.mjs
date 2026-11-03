#!/usr/bin/env node
/**
 * 定时发布：把 data/queue/<今天>.json 提升为 data/briefing.json
 *   node scripts/promote.mjs            # 用北京时间的今天
 *   node scripts/promote.mjs --date=2026-11-04
 * 没有排期文件时安静退出（退出码 0），不会让工作流变红。
 */
import fs from "node:fs";
import path from "node:path";
import { validateBriefing } from "./validate.mjs";

const TZ = "Asia/Shanghai";
const shToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const arg = process.argv.find((a) => a.startsWith("--date="));
const date = arg ? arg.split("=")[1] : shToday();

const queueFile = path.join("data", "queue", `${date}.json`);
const liveFile = path.join("data", "briefing.json");
const archiveDir = path.join("data", "archive");

if (!fs.existsSync(queueFile)) {
  console.log(`○ 没有排期文件 ${queueFile}，今天不发布（如需发布，把它提交进仓库即可）`);
  process.exit(0);
}

let next;
try {
  next = JSON.parse(fs.readFileSync(queueFile, "utf8"));
} catch (e) {
  console.error(`✖ ${queueFile} JSON 语法错误：${e.message}`);
  process.exit(1);
}

const { errors, warnings } = validateBriefing(next);
warnings.forEach((w) => console.log(`⚠ ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`✖ ${e}`));
  console.error(`\n✖ 排期文件校验失败，本次不发布（线上内容保持不变）`);
  process.exit(1);
}

// 归档当前线上内容
if (fs.existsSync(liveFile)) {
  try {
    const cur = JSON.parse(fs.readFileSync(liveFile, "utf8"));
    if (cur.date) {
      fs.mkdirSync(archiveDir, { recursive: true });
      const ap = path.join(archiveDir, `${cur.date}.json`);
      if (!fs.existsSync(ap)) {
        fs.writeFileSync(ap, JSON.stringify(cur, null, 2) + "\n");
        console.log(`· 已归档 ${cur.date} → ${ap}`);
      }
    }
  } catch {}
}

next.date = date;                       // 以排期日期为准
if (!next.published_at) {
  next.published_at = `${date}T07:30:00+08:00`;
}
fs.writeFileSync(liveFile, JSON.stringify(next, null, 2) + "\n");
fs.unlinkSync(queueFile);
console.log(`✔ 已发布 ${date} · ${next.items.length} 条`);
