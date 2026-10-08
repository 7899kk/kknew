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
adb shell am force-stop com.profinancer.app
adb shell am start -W -n com.profinancer.app/.MainActivity
sleep 10
adb shell pidof com.profinancer.app > "$evidence/restart-pid.txt"
test -s "$evidence/restart-pid.txt"
adb shell uiautomator dump /sdcard/restart.xml
adb pull /sdcard/restart.xml "$evidence/restart.xml"
python - "$evidence" <<'PY'
from pathlib import Path
import sys
assert 'Welcome to Pro Financier' in (Path(sys.argv[1])/'restart.xml').read_text(), 'Onboarding did not appear after restart'
PY
