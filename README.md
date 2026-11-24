# 黄金搭档 · Golden Partner

把「在别的模型里理清方案」和「在本机 agent 里动手」这两步接起来的 DeepSeek Harness（dsh）插件。它只做文件搬运：把当前工作区打成一份上下文包交出去，再把拿回来的执行简报落成一份计划文件读回来 —— 长文本始终在磁盘上，对话里只出现路径和字数。

A dsh bundle that hands a repo context pack to an external planning model and turns the returned brief into a plan file. Long text stays on disk; the conversation only carries paths and counts.

## 安装

```sh
# npm 包
dsh plugin --profile web add dsh-golden-partner

# 或直接从仓库
dsh plugin --profile web add https://github.com/xiaosejun/dsh-golden-partner
```

桌面版在 **设置 → 插件** 里安装，重启应用后生效。左侧栏会出现 **deepseek黄金搭档** 入口，位置在「上下文洞察」与「更多」之间；点开后是整页面板。

## 两个工具

| 工具 | 做什么 | 返回 |
| --- | --- | --- |
| `handoff_pack` | 把这次任务需要的上下文写进 `plans/_pack-<时间>.md`：浅层目录结构、技术栈与脚本清单、既有约定（`AGENTS.md` / `README.md` 开头）、你指定重点文件的开头、以及「请你输出」的六段格式要求。 | 路径、字数、小节标题。正文不进对话。 |
| `plan_intake` | 读取剪贴板里的方案正文，存成 `plans/<时间>-<短名>.md`，加状态头（状态 / 来源 / 上下文占位），并回报识别出的小节标题。 | 路径、行数、字数、小节标题。 |

典型流程：`handoff_pack` 出一份材料 → 整段贴给外部方案模型（例如网页版对话）讨论，让它按**目标 / 动哪里 / 约束 / 验收 / 不要做 / 怎么验证**六段输出 → 复制那份简报 → 说一句「用 `plan_intake` 接一下」→ 计划落地，agent 按小节读取后执行，收尾把偏差写回计划文件。

## 左侧栏面板

面板本身不产生模型请求，只做三件事：

- 三步流程说明（出上下文包 / 外部讨论 / 接回计划）。
- 三个复制按钮：上下文包指令、执行计划指令、可整段贴给外部模型的六段开场白模板。
- 一个文本框：粘进执行简报，点「复制：这份简报的待执行指令」得到一段带约束复述要求的指令，再粘进对话即可。

## 它碰什么

- **读**：工作区里的目录名与清单文件（`package.json`、`pyproject.toml`、`Cargo.toml`、`go.mod` 等的前 40 行）、你指定重点文件的前 60 行、`AGENTS.md` 前 30 行、`README.md` 前 15 行；以及 Windows 剪贴板（仅 `plan_intake`）。
- **写**：工作区 `plans/` 下的 markdown 文件。
- **不**联网、不读 DeepSeek 会话、不代登录、不需要 API key、不改 profile 配置、不跑构建。

关掉插件后两个工具与面板一起消失，已生成的 `plans/` 文件保留在磁盘上。

## 兼容

在 DeepSeek Harness `0.2.2-rc.3`（Windows 桌面版）上开发与验证。零第三方依赖，只用 Node 内置模块。剪贴板读取仅支持 Windows（`Get-Clipboard`）；其他平台请直接粘贴正文，或改用 `handoff_pack` + 手动保存。

## 卸载

```sh
dsh plugin --profile web remove dsh-golden-partner
```

或让 agent 执行 `plugin_manager({ action: "remove_bundle", target: "dsh-golden-partner" })`。

## 协议

MIT
