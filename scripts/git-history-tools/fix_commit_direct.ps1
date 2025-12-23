# Direct fix using git commit --amend for the specific commit
$commitHash = "e010b50c25faccb29415b9769fc6bcfe6f86072b"
$correctMessage = @"
Fix settlement hint display and rename 歸零 to 結算

- Fixed: Get lastReset from original transactions instead of filtered
- Changed all '歸零' to '結算' in zh-TW translations
- Changed all 'Reset' to 'Settlement' in en translations for consistency
"@

# Save the correct message to a file
$msgFile = "commit_msg_fixed.txt"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($msgFile, $correctMessage, $utf8NoBom)

Write-Host "Created commit message file: $msgFile"
Write-Host "Now use: git rebase -i $commitHash^"
Write-Host "Then use: git commit --amend -F $msgFile"

