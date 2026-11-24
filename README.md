# 黄金搭档 · Golden Partner

把「在别的模型里理清方案」和「在本机 agent 里动手」这两步接起来的 DeepSeek Harness（dsh）插件。它只做文件搬运：把当前工作区打成一份上下文包交出去，再把拿回来的执行简报落成一份计划文件读回来 —— 长文本始终在磁盘上，对话里只出现路径和字数。

A dsh bundle that hands a repo context pack to an external planning model and turns the returned brief into a plan file. Long text stays on disk; the conversation only carries paths and counts.

## 安装

桌面版：**设置 → 插件 → 添加插件**，粘贴仓库地址或下面的 tarball 地址；也可以用 CLI：

```sh
# 从仓库安装
dsh plugin add https://github.com/xiaosejun/dsh-golden-partner

# 或装预构建的 tarball（免构建）
dsh plugin add https://github.com/xiaosejun/dsh-golden-partner/releases/download/v0.1.2/dsh-golden-partner-0.1.2.tgz

# npm 包（尚未发布，发布后可用）
dsh plugin add dsh-golden-partner
```

装完重启应用后生效。左侧栏会出现 **deepseek黄金搭档** 入口，位置在「上下文洞察」与「更多」之间；点开后是整页面板。

## 两个工具

| 工具 | 做什么 | 返回 |
| --- | --- | --- |
| `handoff_pack` | 把这次任务需要的上下文写进 `plans/_pack-<时间>.md`：浅层目录结构、技术栈与脚本清单、既有约定（`AGENTS.md` / `README.md` 开头）、你指定重点文件的开头、以及「请你输出」的六段格式要求。 | 路径、字数、小节标题。正文不进对话。 |
| `plan_intake` | 读取剪贴板里的方案正文，存成 `plans/<时间>-<短名>.md`，加状态头（状态 / 来源 / 上下文占位），并回报识别出的小节标题。 | 路径、行数、字数、小节标题。 |

典型流程：`handoff_pack` 出一份材料 → 整段贴给外部方案模型（例如网页版对话）讨论，让它按**目标 / 动哪里 / 约束 / 验收 / 不要做 / 怎么验证**六段输出 → 复制那份简报 → 说一句「用 `plan_intake` 接一下」→ 计划落地，agent 按小节读取后执行，收尾把偏差写回计划文件。

## 完整示例：一次真实的交接

场景：`my-app` 是个 Node 项目，你想给它加一个「导出 CSV」按钮，但**方案想在网页版里慢慢聊**，不想在本机对话里磨。

### 第 1 步 · 让 agent 出上下文包

在 dsh 对话里说：

> 用 handoff_pack 打包一下导出功能要做的事，重点文件 `src/export.ts`、`src/components/Table.tsx`。

对话里只会多出一行：

```
plans/_pack-20261124-1612.md · 3128 字 · 目标 / 目录结构 / 技术栈与脚本 / 既有约定 / 请你输出
```

磁盘上那份文件是这样的（节选）：

```markdown
# 上下文包 · 导出 CSV

## 一、目标
（待填：这次要解决什么）

## 二、目录结构（浅层）
src/
  components/  (18 个文件)
  ...
## 三、技术栈与脚本
- package.json: name=my-app, scripts: { dev, build, test }
- 依赖: react@19.0.0, vite@6.0.3 ...

## 四、既有约定
- AGENTS.md：禁止 `as any`；提交前跑 `npm test`
- README.md：Node ≥ 22

## 五、请你输出
按下面六段回答：目标 / 动哪里 / 约束 / 验收 / 不要做 / 怎么验证。
```

### 第 2 步 · 拿去网页版聊

打开左侧栏 **deepseek黄金搭档**，点「复制：免费版开场白」，粘进网页版对话框，再把 `_pack-*.md` 全文贴上去。免费模型会按六段给出执行简报。

这一步几千字的方案讨论**全在网页版里发生**，本机对话一个字都不占。

### 第 3 步 · 把简报接回来

复制网页版给的那份简报，粘进面板的文本框，点「复制：这份简报的待执行指令」，得到一段带约束复述要求的指令，粘进 dsh 对话即可。

或者跳过面板，直接把简报复制到剪贴板，在对话里说：

> 用 plan_intake 接一下剪贴板，短名 export-csv。

落盘 `plans/20261124-1618-export-csv.md`，对话里只回报：

```
plans/20261124-1618-export-csv.md · 42 行 · 1860 字
识别到：目标 / 动哪里 / 约束 / 验收 / 不要做 / 怎么验证
```

### 第 4 步 · 执行

agent 按小节读这份计划、动手改代码、跑验证，收尾把偏差写回计划文件末尾的「执行记录」。

### 省下来的到底是什么

| 阶段 | 在哪里发生 | 占本机 token |
| --- | --- | --- |
| 方案讨论、试错、推翻重来 | 网页版（免费） | 0 |
| 上下文包生成 | 本机（一次工具调用） | 一行路径 + 字数 |
| 计划落盘 | 本机（一次工具调用） | 一行路径 + 字数 |
| 执行、验证 | 本机（必须） | 正常消耗 |

省的是**讨论环节**的 token，不是执行环节的。执行阶段该读的文件还得读——这是有意的，不然 agent 就是在盲改。

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
dsh plugin remove dsh-golden-partner
```

或让 agent 执行 `plugin_manager({ action: "remove_bundle", target: "dsh-golden-partner" })`。

## 协议

MIT
