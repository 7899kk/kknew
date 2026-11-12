#!/usr/bin/env bash
set -euo pipefail
evidence="startup-evidence/android-${1}"
mkdir -p "$evidence"
report_failure() {
  result=$?
  if [ "$result" -ne 0 ]; then
    echo "Android test failure diagnostics"
    if [ -f "$evidence/startup.xml" ]; then cat "$evidence/startup.xml"; fi
    if [ -f "$evidence/flow-latest.xml" ]; then cat "$evidence/flow-latest.xml"; fi
    adb logcat -d > "$evidence/failure-logcat.txt" || true
    tail -n 180 "$evidence/failure-logcat.txt" || true
  fi
  return "$result"
}
trap report_failure EXIT
# Nougat emulators can hang during streamed APK installation. Push the complete
# APK first, and bound the installer so infrastructure stalls fail promptly.
timeout 180 adb install --no-streaming -r artifacts/wealthtrack/android/app/build/outputs/apk/release/app-release.apk
adb logcat -c
adb shell am start -W -n com.profinancer.app/.MainActivity
deadline=$((SECONDS + 60))
while [ "$SECONDS" -lt "$deadline" ]; do
  sleep 2
  if adb shell uiautomator dump /sdcard/startup.xml && adb pull /sdcard/startup.xml "$evidence/startup.xml"; then
    if python - "$evidence/startup.xml" <<'READY'
from pathlib import Path
import sys
sys.exit(0 if 'Welcome to Pro Financier' in Path(sys.argv[1]).read_text() else 1)
READY
    then break; fi
  fi
done
adb logcat -d > "$evidence/logcat.txt"
adb shell pidof com.profinancer.app > "$evidence/pid.txt"
test -s "$evidence/pid.txt"
adb shell screencap -p /sdcard/startup.png
adb pull /sdcard/startup.png "$evidence/startup.png"
python - "$evidence" <<'PY'
from pathlib import Path
import sys
ui=(Path(sys.argv[1])/'startup.xml').read_text()
assert 'Welcome to Pro Financier' in ui, 'App did not reach onboarding; inspect screenshot and logcat'
PY
if [ "${HOUSEHOLD_ONLY:-0}" != "1" ]; then
  python scripts/android-finance-flow.py "$evidence"
fi

python scripts/android-bank-flow.py "$evidence"
adb logcat -d > "$evidence/final-logcat.txt"
