param($file)

# Read the rebase todo file
$content = Get-Content $file -Raw -Encoding UTF8

# Replace 'pick' with 'reword' for the commit we want to fix
$content = $content -replace 'pick 8961593', 'reword 8961593'
$content = $content -replace 'pick 8daaa45', 'reword 8daaa45'

# Write back with UTF-8 encoding
[System.IO.File]::WriteAllText($file, $content, [System.Text.UTF8Encoding]::new($false))

