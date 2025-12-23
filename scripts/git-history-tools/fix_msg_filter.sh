#!/bin/sh
# Script to fix commit message encoding using filter-branch
if echo "$GIT_COMMIT" | grep -q "settlement hint.*rename"; then
    echo "Fix settlement hint display and rename 歸零 to 結算"
    echo ""
    echo "- Fixed: Get lastReset from original transactions instead of filtered"
    echo "- Changed all '歸零' to '結算' in zh-TW translations"
    echo "- Changed all 'Reset' to 'Settlement' in en translations for consistency"
else
    cat
fi

