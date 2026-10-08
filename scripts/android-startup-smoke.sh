#!/usr/bin/env bash
set -euo pipefail
evidence="startup-evidence/android-${1}"
mkdir -p "$evidence"
adb install -r artifacts/wealthtrack/android/app/build/outputs/apk/release/app-release.apk
adb logcat -c
adb shell am start -W -n com.profinancer.app/.MainActivity
sleep 20
adb logcat -d > "$evidence/logcat.txt"
adb shell pidof com.profinancer.app > "$evidence/pid.txt"
test -s "$evidence/pid.txt"
adb shell uiautomator dump /sdcard/startup.xml
adb pull /sdcard/startup.xml "$evidence/startup.xml"
adb shell screencap -p /sdcard/startup.png
adb pull /sdcard/startup.png "$evidence/startup.png"
python - "$evidence" <<'PY'
from pathlib import Path
import sys
ui=(Path(sys.argv[1])/'startup.xml').read_text()
assert 'Welcome to Pro Financier' in ui, 'App did not reach onboarding; inspect screenshot and logcat'
PY
python scripts/android-finance-flow.py "$evidence"
