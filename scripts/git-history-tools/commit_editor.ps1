param($file)

# Always replace the content if it contains the problematic characters
$content = Get-Content $file -Raw -Encoding UTF8

# Check if this is the commit we want to fix by checking for the problematic characters
if ($content -match "甇賊" -or $content -match "蝯" -or $content -match "rename.*to" -or $content -match "settlement hint") {
    # Replace with correct UTF-8 message
    $newMsg = @"
Fix settlement hint display and rename 歸零 to 結算

- Fixed: Get lastReset from original transactions instead of filtered
- Changed all '歸零' to '結算' in zh-TW translations
- Changed all 'Reset' to 'Settlement' in en translations for consistency
"@
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($file, $newMsg, $utf8NoBom)
    Write-Host "Fixed commit message in $file"
}

