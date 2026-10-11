# Codex-Aura release notes

[简体中文](RELEASE_NOTES.zh-CN.md) · **English** · [同页双语 / Bilingual](RELEASE_NOTES.md)

[Home](../README.en.md) · [Bilingual home](../README.md) · [Full English guide](README.en.md) · [完整中文说明](README.zh-CN.md)

Changes are listed by date, newest first. The current package version is **0.1.5**; dated entries do not imply a new package version.

## 2026-10-11 · Documentation organization

- Keep the README pages focused on current features, setup, and operating instructions. Record changes by date in these release notes.
- Synchronize the root home pages, Chinese and English full guides, release notes, navigation links, and architecture diagrams.
- This entry records documentation and diagram changes only. The package version remains **0.1.5**.

## 2026-10-10 · Model, reasoning effort, and Fast selection

Published on `main` in commit [bef35b4](https://github.com/RookieLouis/Codex-Aura/commit/bef35b4ba8933cce9868c0b3cb07fe8e58f6ba6a). This is an update to the existing **0.1.5** package, without a new version number.

- Select **GPT-6.1 Sol** or **GPT-6 Astra** in Aura's Codex composer. The reasoning slider offers five stops: **Low, Medium, High, Extra High, and Ultra**. The default is **Sol / Ultra**, with **Fast off**.
- The composer displays the model and effort in one button. Its compact, centered popover contains the model selector, reasoning slider, and independent Fast toggle. Dragging updates the label, thumb, and filled track immediately; Ultra uses a purple gradient. Fast shows a filled lightning icon and a footer indicator, with the tooltip `Fast mode` / `More usage`.
- Selections are saved locally and apply to each next turn, both in new conversations and when continuing an existing conversation. The bridge explicitly sends the model, reasoning effort, and Fast service tier for each turn; turning Fast off clears an earlier Fast selection.
- **Reset** restores **Ultra** while retaining the selected model and Fast setting. A **Max** value saved by the earlier UI maps to the highest visible **Ultra** stop; the bridge still accepts explicit `max` requests. Requests without selection fields use Sol / Ultra with Fast off.
- The installer backs up affected renderer chunks before writing. Regression coverage includes upgrading existing renderer patches, idempotent installation, and restoring backed-up files while protecting subsequent changes.
- Offline regression on **2026-10-10**: **216 tests passed, 0 failed**.

## 2026-10-02 · 0.1.5 · Conversation save fixes

Select **Codex** from Aura's model menu and use your existing Codex sign-in to run **GPT-6.1-Sol / Ultra**. This version targets Windows environments with Aura 1.0.6 and an existing customized, compatible `AuraChatTap.mjs` router. It was tested with Node.js 24.14.1. Earlier native protocol verification used Codex CLI 0.159.2; plugin loading and save verification for 0.1.5 used 0.159.0-alpha.12.1.

### Fixes and public configuration

- Fixes a new thread having no persisted rollout before its first generation, which caused the request to fail and triggered “This chat could not be saved.”
- Records the real thread identity before starting the model, and attempts Project, workspace, and title synchronization only after generation completes. Retries are limited to temporary reads of the same thread whose rollout is not yet persisted; other errors return immediately.
- Optional synchronization shares a 5-second deadline and preserves the answer on failure. Cloud save receipts are validated so that errors cannot be reported as success. Failure receipts retain a valid integer `headSeq`.
- Removes personal router, test project, and drive-letter defaults. Backups and conversation organization default to the current user's directories, with explicit overrides available. Project permission boundaries continue to use exact path validation.
- Includes complete Chinese and English guides, bilingual release notes, an MIT license, and Windows / Node.js 24 regression CI.

### Features

- **Real conversations:** Uses the public app-server protocol to save and continue native Codex conversations. Old exec history is preserved through public fork operations, leaving the original record unchanged.
- **Project organization:** Places real conversations under `UE5_Aura → Project → conversation` and verifies actual sidebar placement without modifying the internal database.
- **Self-checks and diagnostics:** Provides 6 read-only MCP tools for MCP self-checks, permission explanations, conversation reads, and safe Blueprint structure / graph reads, plus 3 skills.
- **UE workflow:** Locates the actual project, reads before editing, backs up affected files, uses dedicated tools, reads back results, and checks actual compilation results.
- **Synchronization deadline:** Workspace synchronization after an answer completes has a separate 5-second deadline. Failure preserves the answer and reports an unverified status.
- **Installation and restore:** Creates checkpoints before overwriting, verifies file hashes, rolls back on failure, and protects subsequent changes during restore.

### Verification

The locally installed 0.1.5 fix passed **181 regression tests, with 0 failures**. After adding configuration defaults and boundary tests, the public version passed **all 185 tests**. Separate live testing verified loading of 3 skills / 6 MCP tools, a new conversation and its second turn using the same native and Aura sessions, and cloud readback of all four messages. Earlier Project organization verification also passed. The public repository distributes only source, tests, and documentation; private projects and conversation records are not uploaded. The MCP self-check itself does not run model inference or call UE asset tools. Asset connectivity must be verified through an actual safe read.

### Installation notes

Configure your actual Aura / router paths and backup directory, run `--dry-run`, then install. Reload your existing router. Open a new conversation in Codex or restart it to update the tool catalog, and press **Ctrl+Shift+R** in Aura to refresh the menu. See the [full English guide](README.en.md) or [中文说明](README.zh-CN.md) for complete steps.

Installing the plugin does not grant UE write permission or change the global approval policy. Ask / Plan remain read-only; Agent edits are still limited by the existing router and current project authorization. Only text and asset text context already supplied by Aura are currently supported; attachments are explicitly rejected. Complete Aura, DSH, and Unreal Engine products are not distributed with this repository.
