# deepseek黄金搭档（deepseek-golden-partner）

一个 Host-only 的 DSH 插件（bundle），提供两个工具，用来把「在免费网页版里理清逻辑」和「在本机 agent 里执行」这两步接起来，同时避免把长文本反复塞进对话。

## 提供什么

| 工具 | 作用 | 返回 |
| --- | --- | --- |
| `handoff_pack` | 把当前工作区里这次任务需要的上下文打成一份 markdown：浅层目录结构、技术栈与脚本、既有约定（AGENTS.md / README.md 开头）、你指定的重点文件开头 60 行、以及「请你输出」的六段格式要求。写入 `plans/_pack-<时间>.md`。 | 文件路径、字数、小节标题。正文不进对话。 |
| `plan_intake` | 读取剪贴板里的方案正文，存成 `plans/<时间>-<短名>.md`，自动加状态头（状态 / 来源 / 上下文占位），并回报识别出的小节标题。 | 文件路径、行数、字数、小节标题。 |

两个工具都只回「路径 + 统计」，长文本留在磁盘上，需要时按小节读取。

## 怎么用

1. 说「用 handoff_pack 给这次任务出个上下文包」，我生成材料文件。
2. 打开文件整段复制，贴给 DeepSeek 网页版讨论方案，让它按六段格式（目标 / 动哪里 / 约束 / 验收 / 不要做 / 怎么验证）输出执行简报。
3. 复制执行简报，说「用 plan_intake 接一下」，计划落到 `plans/`。
4. 我按小节读计划并执行，收尾把偏差写回计划文件。

剪贴板读取仅支持 Windows（`Get-Clipboard`）；其他平台请直接粘贴正文。

## 安装

在会话里让 agent 执行：

```
plugin_manager({ action: "install_bundle", target: "<本目录绝对路径>" })
```

安装后新开会话生效，工具列表里应出现 `handoff_pack` 与 `plan_intake`。卸载用 `plugin_manager({ action: "remove_bundle", target: "@local/deepseek-golden-partner" })`。

## 文件

- `index.js` — 插件实现，零第三方依赖，只用 `node:fs` / `node:path` / `node:os` / `node:child_process`。
- `cordis.patch.yml` — 一行 insert，把插件挂进 loader。
- `locale/zh.json`、`locale/en.json` — 插件列表里的标题与说明。
- `icon.svg` — 36×36，两个错位气泡（一个实心、一个描边）。

## 不做

- 不驱动浏览器、不读 DeepSeek 会话、不代登录：只做「文件进、文件出」的交接。
- 不改 profile 配置，不跑构建，不引入前端依赖。
