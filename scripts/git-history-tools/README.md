# Git 歷史修復工具（高風險）

這個資料夾包含一些用來**修正 commit message 編碼亂碼**、或在必要時**改寫 Git 歷史**的輔助腳本。

請注意：`rebase` / `filter-branch` 這類操作會改寫 commit hash，對已 push/多人協作的分支有破壞性影響。

## 你什麼時候會需要它？

- 過去某些 commit message 因為編碼（例如 UTF-8/BOM、終端機編碼、PowerShell/文字編輯器）導致出現亂碼。
- 你想把互動式 rebase 的某些 commit 自動標記成 `reword`，以便逐筆修正訊息。
- 你需要用 `git filter-branch --msg-filter` 批次把特定訊息替換成固定的「正確版本」。

## 檔案說明

- **`auto_rebase_editor.ps1`**
  - 用途：當 Git 呼叫編輯器時（rebase todo 或 commit message），自動修改內容：
    - 若是 `git-rebase-todo`：把指定 commit 的 `pick` 改成 `reword`
    - 若是 `COMMIT_EDITMSG`：在符合特定條件時覆寫為正確訊息
- **`rebase_fix.ps1`**
  - 用途：針對 rebase todo 進行 `pick` → `reword` 替換（較單純版本）。
- **`commit_editor.ps1`**
  - 用途：當編輯 commit message 檔案時，若偵測到特定亂碼/關鍵字，就覆寫成正確訊息。
- **`fix_msg_filter.sh` / `fix_msg_filter.ps1`**
  - 用途：搭配 `git filter-branch --msg-filter` 的訊息過濾器；符合條件就輸出正確訊息，否則原樣輸出。
- **`fix_commit_direct.ps1`**
  - 用途：提供「用 rebase + amend」修正特定 commit message 的指引與產生訊息檔。
- **`commit_msg_correct.txt` / `fix_commit_message.txt`**
  - 用途：存放「正確 commit message」內容，給腳本讀取寫入。
- **`commits.txt`**
  - 用途：commit hash 與訊息的對照/備忘錄（通常是手動維護用）。

## 建議使用方式（最安全）

### 1) 單一 commit：用 rebase 重新編寫訊息（建議）

1. 找到要修的 commit（例：`<hash>`）。
2. 執行：
   - `git rebase -i <hash>^`
3. 把那筆 commit 從 `pick` 改成 `reword`（也可用此資料夾的腳本自動替換）。
4. 在 rebase 過程中輸入正確的英文訊息，完成後 `git push --force-with-lease`（如果該分支已推上遠端）。

### 2) 多筆 commit：用 msg-filter 批次替換（高風險）

只有在你確定要改寫一段歷史、且知道如何處理 `--force-with-lease` 時才做。

## 風險與注意事項（必讀）

- **改寫歷史會改變 commit hash**：任何人只要基於舊 hash 開發，就會需要 rebase/cherry-pick 才能對齊。
- **已推到遠端的 `main`/共享分支**：請先確認你是單人使用或已與協作者協調好。
- 推送改寫後的歷史請用 **`git push --force-with-lease`**，避免誤覆蓋他人提交。

## .gitignore

本 repo 另外忽略了一些可能出現在根目錄的暫存檔（例如 `commit_msg_fixed.txt`），避免它們干擾日常 `git status`。


