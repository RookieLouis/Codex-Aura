# Codex-Aura 更新记录 / Release notes

[简体中文](RELEASE_NOTES.zh-CN.md) · [English](RELEASE_NOTES.en.md) · **同页双语 / Bilingual**

[首页 / Bilingual home](../README.md) · [English home](../README.en.md) · [完整中文说明](README.zh-CN.md) · [Full English guide](README.en.md)

变更按日期倒序记录，当前软件包版本为 **0.1.5**；日期条目不代表新增版本。
Changes are listed by date, newest first. The current package version is **0.1.5**; dated entries do not imply a new version.

## 2026-10-11 · 文档整理 / Documentation organization

### 简体中文

- README 页面只保留当前功能、配置和操作说明，变更内容按日期集中记录在更新记录中。
- 同步根目录首页、中英文完整指南、更新记录、导航链接及架构图。
- 本条仅记录文档和架构图整理，软件包版本仍为 **0.1.5**。

### English

- Keep the README pages focused on current features, setup, and operating instructions. Record changes by date in these release notes.
- Synchronize the root home pages, Chinese and English full guides, release notes, navigation links, and architecture diagrams.
- This entry records documentation and diagram changes only. The package version remains **0.1.5**.

## 2026-10-10 · 模型、思考强度和 Fast 选择 / Model, reasoning effort, and Fast selection

### 简体中文

已通过提交 [bef35b4](https://github.com/RookieLouis/Codex-Aura/commit/bef35b4ba8933cce9868c0b3cb07fe8e58f6ba6a) 发布到 `main`。这是现有 **0.1.5** 软件包的更新，没有新增版本号。

- Aura 的 Codex 输入框可选择 **GPT-6.1 Sol** 或 **GPT-6 Astra**；思考强度滑条提供 **Low、Medium、High、Extra High、Ultra** 五档。默认 **Sol / Ultra**，**Fast 关闭**。
- 底部用一个按钮显示模型和思考强度，打开后居中的紧凑弹窗包含模型选择、思考强度滑条及独立 Fast 开关。拖动时标题、滑块和填充区域立即同步，Ultra 使用紫色渐变；Fast 开启时显示实心闪电和底部指示，提示为 `Fast mode` / `More usage`。
- 选择保存在本机，并在下一轮生效，覆盖新对话和既有对话续聊。桥接每轮显式发送模型、思考强度和 Fast 服务档位；关闭 Fast 会清除之前的 Fast 选择。
- **Reset** 仅恢复 **Ultra**，保留模型和 Fast 设置。旧版界面保存的 **Max** 映射到最高可见 **Ultra** 档；桥接仍接受显式 `max` 请求。未携带选择字段的请求默认 Sol / Ultra、Fast 关闭。
- 安装器写入前备份受影响的界面资源文件；回归覆盖旧界面补丁升级、重复安装及备份恢复，并保护安装后的后续修改。
- **2026-10-10** 离线回归：**216 项通过、0 项失败**。

### English

Published on `main` in commit [bef35b4](https://github.com/RookieLouis/Codex-Aura/commit/bef35b4ba8933cce9868c0b3cb07fe8e58f6ba6a). This is an update to the existing **0.1.5** package, without a new version number.

- Select **GPT-6.1 Sol** or **GPT-6 Astra** in Aura's Codex composer. The reasoning slider offers five stops: **Low, Medium, High, Extra High, and Ultra**. The default is **Sol / Ultra**, with **Fast off**.
- The composer displays the model and effort in one button. Its compact, centered popover contains the model selector, reasoning slider, and independent Fast toggle. Dragging updates the label, thumb, and filled track immediately; Ultra uses a purple gradient. Fast shows a filled lightning icon and a footer indicator, with the tooltip `Fast mode` / `More usage`.
- Selections are saved locally and apply to each next turn, both in new conversations and when continuing an existing conversation. The bridge explicitly sends the model, reasoning effort, and Fast service tier for each turn; turning Fast off clears an earlier Fast selection.
- **Reset** restores **Ultra** while retaining the selected model and Fast setting. A **Max** value saved by the earlier UI maps to the highest visible **Ultra** stop; the bridge still accepts explicit `max` requests. Requests without selection fields use Sol / Ultra with Fast off.
- The installer backs up affected renderer chunks before writing. Regression coverage includes upgrading existing renderer patches, idempotent installation, and restoring backed-up files while protecting subsequent changes.
- Offline regression on **2026-10-10**: **216 tests passed, 0 failed**.

## 2026-10-02 · 0.1.5 · 对话保存修复 / Conversation save fixes

### 简体中文

Aura 的模型菜单可选择 **Codex**，使用已有 Codex 登录调用 **GPT-6.1-Sol / Ultra**。此版本面向 Windows 上已配置 Aura 1.0.6 与既有定制的兼容 `AuraChatTap.mjs` 路由的环境，实测 Node.js 24.14.1。早期原生协议验证使用 Codex CLI 0.159.2，0.1.5 插件加载和保存验证使用 0.159.0-alpha.12.1。

#### 修复与公开配置

- 修复新线程在首轮生成前没有落盘记录，导致请求失败并触发 “This chat could not be saved” 的问题。
- 在启动模型前保存真实线程标识；生成完成后才尝试 Project、工作区和标题同步。仅对相同线程的暂时未落盘读取做有限重试，其他错误立即返回。
- 可选同步共用 5 秒期限，失败保留回答；校验云端保存回执，避免把异常当成成功。失败回执的 `headSeq` 保持合法整数。
- 移除个人路由、测试工程和盘符默认路径。备份及对话分类默认位于当前用户目录，可显式覆盖；工程权限边界保持精确路径校验。
- 附完整中英文说明、双语发布说明、MIT 许可及 Windows / Node.js 24 回归 CI。

#### 功能

- **真实对话：** 使用公开 app-server 协议，保存并继续原生 Codex 对话；旧 exec 历史通过公开 fork 保留，原记录不变。
- **按工程显示：** 将真实对话归入 `UE5_Aura → Project → 对话`，核实实际侧栏归属，不修改内部数据库。
- **自检与诊断：** 6 个只读 MCP 工具覆盖 MCP 自检、权限说明、对话读取及安全蓝图结构 / 图读取；附 3 个技能。
- **UE 操作规范：** 定位实际工程、先读后改、按影响范围备份、使用专用工具、回读及核实实际编译结果。
- **同步期限：** 回答完成后的工作区同步独立限时 5 秒；失败保留回答并报告未核实状态。
- **安装与恢复：** 覆盖前建立检查点，校验文件哈希，异常回滚，恢复时保护后续修改。

#### 验证

本机 0.1.5 修复版本回归测试 **181 项通过、0 项失败**，公开版本补充配置默认值和边界测试后 **185 项全部通过**。另行实测插件加载 3 个技能 / 6 个 MCP 工具，新对话与第二轮续聊使用相同原生及 Aura 会话，云端读回全部四条消息。历史 Project 分类验证也已通过。公开仓库仅分发源码、测试及说明，私有工程和对话记录不上传。MCP 自检本身不调用模型推理或 UE 资产工具；资产连接需实际安全读取验证。

#### 安装提示

先配置实际 Aura / 路由路径和备份目录，运行 `--dry-run`，再执行安装。重新加载已有路由；在 Codex 新开对话或重启以更新工具目录，在 Aura 按 **Ctrl+Shift+R** 刷新菜单。完整步骤见 [中文说明](README.zh-CN.md)。

安装插件不授予 UE 写权限，不改变全局审批策略。Ask / Plan 保持只读；Agent 编辑仍受现有路由和当前工程授权限制。当前仅支持文本及已提供的资产文本上下文，附件明确拒绝。完整 Aura、DSH 和 Unreal Engine 产品不随仓库分发。

### English

Select **Codex** from Aura's model menu and use your existing Codex sign-in to run **GPT-6.1-Sol / Ultra**. This version targets Windows environments with Aura 1.0.6 and an existing customized, compatible `AuraChatTap.mjs` router. It was tested with Node.js 24.14.1. Earlier native protocol verification used Codex CLI 0.159.2; plugin loading and save verification for 0.1.5 used 0.159.0-alpha.12.1.

#### Fixes and public configuration

- Fixes a new thread having no persisted rollout before its first generation, which caused the request to fail and triggered “This chat could not be saved.”
- Records the real thread identity before starting the model, and attempts Project, workspace, and title synchronization only after generation completes. Retries are limited to temporary reads of the same thread whose rollout is not yet persisted; other errors return immediately.
- Optional synchronization shares a 5-second deadline and preserves the answer on failure. Cloud save receipts are validated so that errors cannot be reported as success. Failure receipts retain a valid integer `headSeq`.
- Removes personal router, test project, and drive-letter defaults. Backups and conversation organization default to the current user's directories, with explicit overrides available. Project permission boundaries continue to use exact path validation.
- Includes complete Chinese and English guides, bilingual release notes, an MIT license, and Windows / Node.js 24 regression CI.

#### Features

- **Real conversations:** Uses the public app-server protocol to save and continue native Codex conversations. Old exec history is preserved through public fork operations, leaving the original record unchanged.
- **Project organization:** Places real conversations under `UE5_Aura → Project → conversation` and verifies actual sidebar placement without modifying the internal database.
- **Self-checks and diagnostics:** Provides 6 read-only MCP tools for MCP self-checks, permission explanations, conversation reads, and safe Blueprint structure / graph reads, plus 3 skills.
- **UE workflow:** Locates the actual project, reads before editing, backs up affected files, uses dedicated tools, reads back results, and checks actual compilation results.
- **Synchronization deadline:** Workspace synchronization after an answer completes has a separate 5-second deadline. Failure preserves the answer and reports an unverified status.
- **Installation and restore:** Creates checkpoints before overwriting, verifies file hashes, rolls back on failure, and protects subsequent changes during restore.

#### Verification

The locally installed 0.1.5 fix passed **181 regression tests, with 0 failures**. After adding configuration defaults and boundary tests, the public version passed **all 185 tests**. Separate live testing verified loading of 3 skills / 6 MCP tools, a new conversation and its second turn using the same native and Aura sessions, and cloud readback of all four messages. Earlier Project organization verification also passed. The public repository distributes only source, tests, and documentation; private projects and conversation records are not uploaded. The MCP self-check itself does not run model inference or call UE asset tools. Asset connectivity must be verified through an actual safe read.

#### Installation notes

Configure your actual Aura / router paths and backup directory, run `--dry-run`, then install. Reload your existing router. Open a new conversation in Codex or restart it to update the tool catalog, and press **Ctrl+Shift+R** in Aura to refresh the menu. See the [full English guide](README.en.md) or [中文说明](README.zh-CN.md) for complete steps.

Installing the plugin does not grant UE write permission or change the global approval policy. Ask / Plan remain read-only; Agent edits are still limited by the existing router and current project authorization. Only text and asset text context already supplied by Aura are currently supported; attachments are explicitly rejected. Complete Aura, DSH, and Unreal Engine products are not distributed with this repository.
