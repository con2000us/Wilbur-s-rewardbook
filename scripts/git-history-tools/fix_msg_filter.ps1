# PowerShell script for git filter-branch
$input = $input | Out-String
if ($input -match "settlement hint.*rename" -or $input -match "甇賊" -or $input -match "蝯") {
    @"
Fix settlement hint display and rename 歸零 to 結算

- Fixed: Get lastReset from original transactions instead of filtered
- Changed all '歸零' to '結算' in zh-TW translations
- Changed all 'Reset' to 'Settlement' in en translations for consistency
"@
} else {
    $input
}

