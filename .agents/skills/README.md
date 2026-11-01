# Shirone AI Skills

本目录是 Shirone AI skills 的唯一源目录,存放 [Agent Skills](https://agentskills.io) 格式的技能包(`SKILL.md` + YAML frontmatter)。支持该标准的 AI 编码助手(Claude Code、Codex 等)在克隆本仓库后会自动发现并按任务触发,无需额外配置。

## 自动发现与仓库适配

保持 `.agents/skills/<skill-name>/SKILL.md` 结构即可被支持 Agent Skills 标准的助手自动发现,无需额外配置。

**本仓库是 npm 包模式**(`shirones@0.1.5`),本目录从上游主题仓库 `LyraVoid/Shirone` 的 `.agents/skills/` 同步而来,并做了以下路径适配:

| 上游主题仓库 | 本仓库 |
| --- | --- |
| `src/config/` | `shirones/config/` |
| `src/content/` | `shirones/content/` |
| `src/data/` | `shirones/config/data/` |
| 主题内部源码 `src/utils/`、`src/pages/`、`src/i18n/` 等 | **只读**,位于 `node_modules/shirones/src/` |
| `src/components/`、`src/layouts/`(组件/布局覆盖) | 保持 `src/`,需要覆盖时自行创建 |

技能正文里提到的 `docs/…` 与 `rules/…` **不在本仓库**,属于上游主题文档:

- 文档:<https://github.com/LyraVoid/Shirone/tree/main/docs>
- 规则:<https://github.com/LyraVoid/Shirone/tree/main/rules>

少数主题内部文件(如 `integration/vite/overlay.ts`、`utils/emoji-*.ts`、`utils/waline-runtime.ts`)在打包发布时被裁剪,`node_modules/shirones/` 里没有,需要时去上游仓库读。

上游的 `pnpm check:manifest`、`pnpm skills:package` 等命令在本仓库**不存在**(由主题的打包流水线负责)。新增或修改技能时直接编辑 `.agents/skills/<name>/SKILL.md`,并在提交信息里注明同步自上游哪个提交。

同步注意:更新技能时保留本 README 的适配表,不要在技能正文里重新写回 `src/config/`、`src/content/`、`src/data/` 这类上游路径。

**开发者向技能**(`shirone-component-dev`、`shirone-dev-workflow`、`shirone-feature`、`shirone-i18n`、`shirone-markdown-dev`、`shirone-sidebar`、`shirone-context-menu`)描述的是**修改主题源码**的流程,其中的 `pnpm check:manifest`、`pnpm design:lint`、Playwright 分片等命令只在上游主题仓库可用。在本仓库要改主题行为时,只能通过覆盖目录(`src/components/`、`src/layouts/`)或 pnpm patch 实现,不要直接改 `node_modules/`。

## 定位

仓库的指导体系分三层,**skills 是任务化入口层,不重复任何下层内容**:

1. `AGENTS.md`(根 + 嵌套)——总纲与目录级附加规则;
2. `rules/` 与 `docs/`——硬性规则与权威规范,skills 只负责把"做某类任务该读哪些文档、守哪些红线、跑哪些命令"收敛成入口;
3. `.agents/skills/`——按任务触发的技能包,正文保持精简,细节一律委托给下层文档。

## 技能清单

### 开发者向(修改主题源码)

| 技能 | 适用任务 |
|---|---|
| [shirone-dev-workflow](shirone-dev-workflow/SKILL.md) | 日常开发与 npm 包发布工作流:环境、双模式验证、缓存清理、提交约定 |
| [shirone-component-dev](shirone-component-dev/SKILL.md) | 新增/修改/移动组件:分层、M3E 令牌、图标、动效、无障碍 |
| [shirone-context-menu](shirone-context-menu/SKILL.md) | 扩展桌面右键菜单:动作注册、定位、生命周期与 Markdown 内容能力契约 |
| [shirone-markdown-dev](shirone-markdown-dev/SKILL.md) | 开发自定义 Markdown 语法与 remark/rehype 插件 |
| [shirone-i18n](shirone-i18n/SKILL.md) | 新增/修改 UI 文案与语言包 |
| [shirone-feature](shirone-feature/SKILL.md) | 新增可选功能/第三方集成(零额外负担) |
| [shirone-sidebar](shirone-sidebar/SKILL.md) | 侧栏系统、widget、FAB 与 Swup 持久壳同步 |

### 用户向(写内容、配站点)

| 技能 | 适用任务 |
|---|---|
| [shirone-writing](shirone-writing/SKILL.md) | 撰写文章与动态:frontmatter、草稿、加密、图片 |
| [shirone-markdown-syntax](shirone-markdown-syntax/SKILL.md) | 使用自定义 Markdown 语法写作 |
| [shirone-config](shirone-config/SKILL.md) | 站点配置、npm 包初始化、启用可选功能、构建与部署 |
| [shirone-data](shirone-data/SKILL.md) | 管理相册及 friends、anime、projects、skills、devices、games、timeline 等数据页内容 |
| [shirone-content-config](shirone-content-config/SKILL.md) | 内容分离配置:内容源、清单、挂载、YAML 覆盖与配置校验 |
| [shirone-content-workflow](shirone-content-workflow/SKILL.md) | 内容分离工作流与双仓运维:sync/export/clean/eject、状态诊断与双仓 CI |

## 约定

- **命名**:目录名与 frontmatter `name` 一致,统一使用 `shirone-` 前缀——仓库已有面向访客的"技能展示页"(`node_modules/shirones/src/pages/skills.astro`)占用 `skills` 一词,前缀避免歧义,也保证多仓库场景下不与其他项目的技能冲突。
- **语言**:frontmatter 的 `name`/`description` 用英文(`description` 面向触发匹配),正文用中文。
- **单一真源**:技能正文不得复制 `rules/`/`docs/` 的具体规范,只写摘要与路径;正文与文档清单中引用的仓库路径由 `scripts/check-skills.mjs`(`pnpm check:manifest` 的一部分)校验真实存在,防止文档移动后技能漂移。
- **新增技能**:创建 `<name>/SKILL.md` 后运行 `pnpm.cmd check:manifest` 验证。
