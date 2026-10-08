# Pro Financer — Android personal finance app

Expo / React Native app with local finance records, Activity and Android payment notification capture.

## Download the Android APK

Version 1.1.2 adds a debit reason sheet and Activity reminders. Download Pro-Financer.apk from the newest successful release below. See [current verification](VERIFICATION-1.1.2.md) for checks and phone tests.

The current version 1.1.2 APK compiled and passed all build checks. [Download the verified APK ZIP](https://github.com/7899kk/kknew/actions/runs/37814780223/artifacts/11567631903), extract it, and install **Pro-Financer.apk**. Release upload was blocked by GitHub permission error 403; the build artifact is available until 7 November 2026. Future builds also upload an APK artifact, and publish to [Releases](../../releases) when GitHub allows it. A source ZIP is not an APK. The first build must finish successfully before a download exists. Build progress and logs are in [Actions](../../actions/workflows/android-apk.yml).

The workflow builds a standalone release-mode APK with bundled JavaScript, supporting ARM 32-bit and ARM 64-bit phones. It uses the public Android test signing key, for personal testing only. Android 7/API 24 or later is required; Samsung J7 Nxt Android 9 still needs installation and real notification tests. Keep a private production signing key before Play Store release. Notifications require explicit device permissions.

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

The standalone Android APK compiled successfully in GitHub Actions on 7 October 2026. TypeScript, payment importer, finance-validation checks and Android native compilation passed. The pure Kotlin parser passed 24 cases locally. Actual phone notification delivery, sound playback and live Google login remain untested. Google login is disabled until Supabase is configured.

## Specification review and regression tests

See [VERIFICATION-1.1.2.md](VERIFICATION-1.1.2.md) for current implementation, checks and the phone test sequence. [TEST-REPORT.md](TEST-REPORT.md) records earlier version 1.1.1 results. Download the newest successful APK from Releases to receive these fixes.
