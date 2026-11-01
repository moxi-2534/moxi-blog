// 新建文章：pnpm new-posts <名字>
// 生成 shirones/content/posts/<名字>/index.md（文件夹形式，便于同目录放封面图）
// 访问地址：/posts/<名字>/
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const POSTS_DIR = join("shirones", "content", "posts");
const TIME_ZONE = "Asia/Shanghai"; // 与 shirones/config/siteConfig.ts 的 timeZone 保持一致

const args = process.argv.slice(2).filter((a) => a !== "--");
if (args.length === 0) {
	console.error(`用法: pnpm new-posts <名字>
例:   pnpm new-posts hello-world        -> posts/hello-world/index.md
      pnpm new-posts notes/first-post   -> posts/notes/first-post/index.md`);
	process.exit(1);
}

let name = args[0].trim().replace(/^[\\/]+/, "").replace(/[\\/]+$/, "");
const extMatch = name.match(/\.(md|mdx)$/i);
const ext = extMatch ? extMatch[1].toLowerCase() : "md";
if (extMatch) name = name.slice(0, -extMatch[0].length);
if (!name) {
	console.error("名字不能为空");
	process.exit(1);
}

const dir = join(POSTS_DIR, name);
const fullPath = join(dir, `index.${ext}`);
const legacyPath = join(POSTS_DIR, `${name}.${ext}`);
if (existsSync(fullPath) || existsSync(legacyPath)) {
	console.error(`已存在: ${existsSync(fullPath) ? fullPath : legacyPath}`);
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

const content = `---
title: ${basename(name)}
published: ${date}
publishedAt: ${date}T${parts.hour}:${parts.minute}:${parts.second}${offset}
description: ''
image: ''
tags: []
category: ''
draft: true
---

`;

mkdirSync(dir, { recursive: true });
writeFileSync(fullPath, content, "utf8");
console.log(`已创建: ${fullPath}`);
console.log(`访问地址: /posts/${name}/`);
console.log("draft: true —— 写完改成 false 才会出现在站点上。");
