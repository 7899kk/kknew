#!/usr/bin/env bash
set -euo pipefail
fixture="scripts/bank-notification-fixture"
out="bank-fixture-build"
mkdir -p "$out/classes" "$out/dex"
buildtools="$ANDROID_HOME/build-tools/36.0.0"
androidjar="$ANDROID_HOME/platforms/android-36/android.jar"
javac -source 8 -target 8 -cp "$androidjar" -d "$out/classes" "$fixture/MockBank.java"
"$buildtools/d8" --lib "$androidjar" --min-api 24 --output "$out/dex" "$out/classes/com/sbi/SBIFreedomPlus/MockBank.class"
"$buildtools/aapt2" link -I "$androidjar" --manifest "$fixture/AndroidManifest.xml" -o "$out/unsigned.apk"
python - "$out" <<'PY'
import sys,zipfile
from pathlib import Path
out=Path(sys.argv[1])
with zipfile.ZipFile(out/'unsigned.apk','a') as apk:
    apk.write(out/'dex/classes.dex','classes.dex')
PY
"$buildtools/apksigner" sign --ks artifacts/wealthtrack/android/app/debug.keystore --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out "$out/mock-bank.apk" "$out/unsigned.apk"
