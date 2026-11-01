// 新建文章：pnpm new-posts <文件名>
// 生成 shirones/content/posts/<文件名>.md，frontmatter 字段与主题 postSchema 对齐。
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const POSTS_DIR = join("shirones", "content", "posts");
const TIME_ZONE = "Asia/Shanghai"; // 与 shirones/config/siteConfig.ts 的 timeZone 保持一致

const args = process.argv.slice(2).filter((a) => a !== "--");
if (args.length === 0) {
	console.error(`用法: pnpm new-posts <文件名>
例:   pnpm new-posts hello-world
      pnpm new-posts notes/2026-11-02-first`);
	process.exit(1);
}

let fileName = args[0].trim();
if (!/\.mdx?$/i.test(fileName)) fileName += ".md";

const fullPath = join(POSTS_DIR, fileName);
if (existsSync(fullPath)) {
	console.error(`已存在: ${fullPath}`);
	process.exit(1);
}

const now = new Date();
const parts = Object.fromEntries(
	new Intl.DateTimeFormat("en-CA", {
		timeZone: TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	})
		.formatToParts(now)
		.map((p) => [p.type, p.value]),
);
const offset =
	new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "longOffset" })
		.formatToParts(now)
		.find((p) => p.type === "timeZoneName")?.value.replace("GMT", "") || "+00:00";
const date = `${parts.year}-${parts.month}-${parts.day}`;

const title = fileName.replace(/^.*\//, "").replace(/\.mdx?$/i, "");
const content = `---
title: ${title}
published: ${date}
publishedAt: ${date}T${parts.hour}:${parts.minute}:${parts.second}${offset}
description: ''
image: ''
tags: []
category: ''
draft: true
---

`;

mkdirSync(dirname(fullPath), { recursive: true });
writeFileSync(fullPath, content, "utf8");
console.log(`已创建: ${fullPath}`);
console.log("draft: true —— 写完改成 false 才会出现在站点上。");
