param($file)

# Check if this is the rebase todo file
if ($file -like "*git-rebase-todo*") {
    $content = Get-Content $file -Raw -Encoding UTF8
    # Replace 'pick' with 'reword' for commit e010b50
    $content = $content -replace 'pick e010b50', 'reword e010b50'
    $content = $content -replace 'pick 8961593', 'reword 8961593'
    $content = $content -replace 'pick 8daaa45', 'reword 8daaa45'
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($file, $content, $utf8NoBom)
} elseif ($file -like "*COMMIT_EDITMSG*") {
    # This is the commit message file - always replace if it contains problematic characters
    $content = Get-Content $file -Raw -Encoding UTF8
    # Check for problematic characters or settlement hint rename pattern
    if ($content -match "settlement hint" -or $content -match "rename.*to" -or $content.Length -lt 200) {
        # Read the correct message from file
        $correctMsgFile = "commit_msg_correct.txt"
        if (Test-Path $correctMsgFile) {
            $newMsg = Get-Content $correctMsgFile -Raw -Encoding UTF8
        } else {
            # Fallback: create the correct message
            $line1 = "Fix settlement hint display and rename 歸零 to 結算"
            $line2 = ""
            $line3 = "- Fixed: Get lastReset from original transactions instead of filtered"
            $line4 = "- Changed all '歸零' to '結算' in zh-TW translations"
            $line5 = "- Changed all 'Reset' to 'Settlement' in en translations for consistency"
            $newMsg = $line1 + "`n" + $line2 + "`n" + $line3 + "`n" + $line4 + "`n" + $line5 + "`n"
        }
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($file, $newMsg, $utf8NoBom)
    }
}

