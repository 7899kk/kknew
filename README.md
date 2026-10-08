# Pro Financer — Android personal finance app

Expo / React Native app with local finance records, Activity and Android payment notification capture.

## Download the Android APK

Version 1.1.4 fixes the dashboard balance, expense deductions, goal reservations and Android text-input behavior, and prevents tabs overlapping Android navigation buttons. **[Download Pro-Financer-J7.apk](https://github.com/7899kk/kknew/releases/download/v1.1.4-j7/Pro-Financer-J7.apk)** or open the [J7 release](https://github.com/7899kk/kknew/releases/tag/v1.1.4-j7).

The APK is 32,246,769 bytes and includes bundled JavaScript and 32-bit ARM native libraries. Android 7/API 24 or later is required. It uses the public Android test signing key for personal testing. The v2 signature is verified for Android 7–9 and a legacy v1 signature is included. [Android 7 and 9 screen tests passed](https://github.com/7899kk/kknew/actions/runs/37829823948) on 1536 MB x86 emulators using an equivalent release build; physical Samsung and Play Protect acceptance still need device testing. [Read the verification report](VERIFICATION-1.1.4.md).

Google Play Protect can restrict sideloaded apps requesting notification access. Automatic payment capture needs that access; this rebuild removes unrelated sensitive permissions but cannot guarantee acceptance or replace a Google review. Do not bypass a security block.

## Dashboard and dreams

Starting savings + monthly income − this month's recorded expenses gives the dashboard balance. Salary ₹1,00,000 plus ₹1,000 starting savings shows ₹1,01,000; a ₹2,500 expense reduces it to ₹98,500. Recorded income replaces the planned income estimate for that month, avoiding duplicated salary. This is a monthly local budget, not a bank-account balance.

Goal contributions reserve money from the available budget. They do not create extra wealth or expense. Available spending money subtracts goal reserves and planned recurring bills. Dreams show the remaining amount and a saving suggestion based on surplus after expenses. You can reserve a custom amount; contributions cannot exceed the remaining target or available budget.

## Automatic money capture

1. Install and open the APK; complete local onboarding.
2. Open Activity and allow Android notification access.
3. Enable Capture new payments, then allow app notifications if needed.
4. New supported payment alerts with clear debit/credit, amount and transaction reference are captured once.
5. Received money appears as **Money received / Uncategorized**, and already counts in totals. Tap **Name income / Edit** to choose Salary, Business, Gift, Refund or Other and enter your own name.
6. Captured debits already count in expenses. A small Money debited sheet asks for a reason and category while the app is open. Choose Later to keep an Activity reminder, or Save reason to update the same entry without counting it twice. With the app closed, tap the Android debit notification to open the app and enter a reason.
7. Tap a payment notification to open Activity. Unclear amounts, possible transfers and refunds require review before entering totals. Failed payments, OTPs and promotional alerts are ignored.

Capture reads future notifications from supported sources, not bank accounts. It cannot detect cash, recover old alerts, or guarantee every bank format. Force-stop, battery limits and low-RAM restrictions can stop Android notification listeners. Compare with your statement. Raw notification text is not stored or uploaded. Stored payment metadata and finance entries stay on the phone; uninstalling can erase them.

Investment navigation has been replaced by Activity; old investment values remain in existing net-worth data. The app works locally without Supabase keys. No passwords or private service keys are included.

## Development

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/wealthtrack typecheck
pnpm --filter @workspace/wealthtrack start
```

For native capture, build a custom APK; Expo Go and web cannot run it. With Java 17 and Android SDK installed:

```sh
pnpm --filter @workspace/wealthtrack android:apk
```

Output: `artifacts/wealthtrack/android/app/build/outputs/apk/release/app-release.apk`.

See [edit notes](artifacts/wealthtrack/EDIT-NOTES.md) for completed checks and remaining verification.

## Configure Google sign-in with Supabase

The Google sign-in screen and PKCE callback are implemented. They require your real Supabase project configuration; until then the app displays local mode and disables Google login.

1. Enable Google in Supabase Auth using a Google Cloud OAuth Web client. Add the Supabase project callback URL shown by the dashboard to the client's authorized redirect URIs.
2. Allow `profinancer://auth-callback` in Supabase Auth redirect URLs. For web development, also allow your exact web callback URL.
3. Set repository Actions variables `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` with your project URL and public client key, then rebuild. Never use the service-role key.
4. Test sign-in, cancel, restored session and sign-out on the phone. Native auth tokens use SecureStore.

Google sign-in does not sync finance data: this personal app retains one local device ledger. Changing login identities does not erase or separate that ledger. The APK is a personal test build.

Received and sent payments have distinct bundled sounds. New high-importance channels can display heads-up alerts when Android allows them. No overlay over other apps is used. Silent mode, Do Not Disturb and Android channel settings may suppress or change sounds. The original Pro Financier logo is used in the launcher, splash and payment alerts.

## Build verification

The Galaxy J7 rebuild is version 1.1.3. Its download is published only after the build and Android screen tests pass: [J7 release](https://github.com/7899kk/kknew/releases/tag/v1.1.4-j7). [Follow the build](https://github.com/7899kk/kknew/actions/workflows/android-apk.yml). Version 1.1.2 remains available as an older build.

The J7 APK contains bundled JavaScript and 32-bit ARM libraries, requires Android 7/API 24 or later, and uses the public Android test signing key for personal testing. The workflow verifies signing for Android 7–9 and exercises an equivalent 32-bit x86 release on low-memory Android 7 and 9 emulators. Physical Samsung and Play Protect acceptance still require device testing.

Google Play Protect can restrict sideloaded apps requesting notification access. Automatic payment capture needs that access; the rebuild removes unrelated permissions but cannot guarantee acceptance or replace a Google review. Do not bypass a security block. See [1.1.3 changes and verification](VERIFICATION-1.1.3.md).

## Dashboard and dreams

Starting savings + monthly income − this month's recorded expenses gives the dashboard balance. Salary ₹1,00,000 plus ₹1,000 starting savings shows ₹1,01,000; a ₹2,500 expense reduces it to ₹98,500. Recorded income replaces the planned income estimate for that month, avoiding duplicated salary. This is a monthly local budget, not a bank-account balance.

Goal contributions reserve money from the available budget. They do not create extra wealth or expense. Available spending money subtracts goal reserves and planned recurring bills. Dreams show the remaining amount and a saving suggestion based on surplus after expenses. You can reserve a custom amount; contributions cannot exceed the remaining target or available budget.

## Automatic money capture

1. Install and open the APK; complete local onboarding.
2. Open Activity and allow Android notification access.
3. Enable Capture new payments, then allow app notifications if needed.
4. New supported payment alerts with clear debit/credit, amount and transaction reference are captured once.
5. Received money appears as **Money received / Uncategorized**, and already counts in totals. Tap **Name income / Edit** to choose Salary, Business, Gift, Refund or Other and enter your own name.
6. Captured debits already count in expenses. A small Money debited sheet asks for a reason and category while the app is open. Choose Later to keep an Activity reminder, or Save reason to update the same entry without counting it twice. With the app closed, tap the Android debit notification to open the app and enter a reason.
7. Tap a payment notification to open Activity. Unclear amounts, possible transfers and refunds require review before entering totals. Failed payments, OTPs and promotional alerts are ignored.

Capture reads future notifications from supported sources, not bank accounts. It cannot detect cash, recover old alerts, or guarantee every bank format. Force-stop, battery limits and low-RAM restrictions can stop Android notification listeners. Compare with your statement. Raw notification text is not stored or uploaded. Stored payment metadata and finance entries stay on the phone; uninstalling can erase them.

Investment navigation has been replaced by Activity; old investment values remain in existing net-worth data. The app works locally without Supabase keys. No passwords or private service keys are included.

## Development

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/wealthtrack typecheck
pnpm --filter @workspace/wealthtrack start
```

For native capture, build a custom APK; Expo Go and web cannot run it. With Java 17 and Android SDK installed:

```sh
pnpm --filter @workspace/wealthtrack android:apk
```

Output: `artifacts/wealthtrack/android/app/build/outputs/apk/release/app-release.apk`.

See [edit notes](artifacts/wealthtrack/EDIT-NOTES.md) for completed checks and remaining verification.

## Configure Google sign-in with Supabase

The Google sign-in screen and PKCE callback are implemented. They require your real Supabase project configuration; until then the app displays local mode and disables Google login.

1. Enable Google in Supabase Auth using a Google Cloud OAuth Web client. Add the Supabase project callback URL shown by the dashboard to the client's authorized redirect URIs.
2. Allow `profinancer://auth-callback` in Supabase Auth redirect URLs. For web development, also allow your exact web callback URL.
3. Set repository Actions variables `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` with your project URL and public client key, then rebuild. Never use the service-role key.
4. Test sign-in, cancel, restored session and sign-out on the phone. Native auth tokens use SecureStore.

Google sign-in does not sync finance data: this personal app retains one local device ledger. Changing login identities does not erase or separate that ledger. The APK is a personal test build.

Received and sent payments have distinct bundled sounds. New high-importance channels can display heads-up alerts when Android allows them. No overlay over other apps is used. Silent mode, Do Not Disturb and Android channel settings may suppress or change sounds. The original Pro Financier logo is used in the launcher, splash and payment alerts.

## Build verification

Version 1.1.4 compiled successfully and passed all jobs in [run 37829823948](https://github.com/7899kk/kknew/actions/runs/37829823948) on 8 October 2026. TypeScript, six regression suites, native parser, APK manifest/signature checks and Android 7/9 release-screen tests passed. The published APK SHA-256 is `a3a1f53b1302e3567ccb1633cd034abd8f32129f712456baa6f2303d7708cf96`. Final screenshots show tab controls above the Android navigation bar. Physical phone installation, Samsung keyboard behavior, real payment delivery/sounds and live Google login remain unverified. Google login is disabled until Supabase is configured.

## Specification review and regression tests

See [VERIFICATION-1.1.4.md](VERIFICATION-1.1.4.md) for current implementation and checks, and [VERIFICATION-1.1.2.md](VERIFICATION-1.1.2.md) for the earlier phone test sequence. [TEST-REPORT.md](TEST-REPORT.md) records earlier version 1.1.1 results. Download the newest successful APK from Releases to receive these fixes.
