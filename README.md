# Pro Financer — Android personal finance app

Expo / React Native app with local finance records, Activity and Android payment notification capture.

## Download the Android APK

Version 1.1.5 adds extra credits correctly, offsets salary estimates when labeled Salary, and includes a matching teal logo, compact debit reason panel and Android inline reason replies. **[Download Pro-Financer-J7.apk](https://github.com/7899kk/kknew/releases/download/v1.1.5-j7/Pro-Financer-J7.apk)** or open the [J7 release](https://github.com/7899kk/kknew/releases/tag/v1.1.5-j7).

The standalone APK includes bundled JavaScript and 32-bit ARM native libraries. Android 7/API 24 or later is required. It uses the public Android test signing key for personal testing. The v2 signature is verified for Android 7–9 and a legacy v1 signature is included. [Android 7 and 9 household and notification tests passed](https://github.com/7899kk/kknew/actions/runs/37958403033) on 1536 MB x86 emulators using an equivalent release build; physical Samsung and Play Protect acceptance still need device testing. [Read the verification report](VERIFICATION-1.1.5.md).

Google Play Protect can restrict sideloaded apps requesting notification access. Automatic payment capture needs that access; this rebuild removes unrelated sensitive permissions but cannot guarantee acceptance or replace a Google review. Do not bypass a security block.

## Dashboard and dreams

Starting savings + monthly income − this month's recorded expenses gives the dashboard balance. Salary ₹1,00,000 plus ₹1,000 starting savings shows ₹1,01,000; a ₹2,500 expense reduces it to ₹98,500. Extra/unclassified credits add to the monthly income estimate. Entries labeled Salary replace only the matching estimated salary up to its amount, avoiding duplicated salary; salary above the estimate adds the excess. Other income estimates remain in the budget. This is a monthly local budget, not a bank-account balance.

Goal contributions reserve money from the available budget. They do not create extra wealth or expense. Available spending money subtracts goal reserves and planned recurring bills. Dreams show the remaining amount and a saving suggestion based on surplus after expenses. You can reserve a custom amount; contributions cannot exceed the remaining target or available budget.

## Automatic money capture

1. Install and open the APK; complete local onboarding.
2. Open Activity and allow Android notification access.
3. Enable Capture new payments, then allow app notifications if needed.
4. New supported payment alerts with clear debit/credit, amount and transaction reference are captured once.
5. Received money appears as **Money received / Uncategorized**, and already counts in totals. Tap **Name income / Edit** to choose Salary, Business, Gift, Refund or Other and enter your own name.
6. Captured debits already count in expenses. A compact Money debited panel asks for a reason while the app is open. Its X keeps an Activity reminder; its reason field and OK update the same entry without counting it twice. With the app closed, use Add reason on the Android notification to reply without reopening the app. Android controls that notification; a custom sidebar is not drawn over other apps.
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

Received and sent payments have distinct bundled sounds. New high-importance channels can display heads-up alerts when Android allows them. No overlay over other apps is used. Silent mode, Do Not Disturb and Android channel settings may suppress or change sounds. The teal PF logo is used in the launcher, splash, app UI and payment alerts.

## Verification

[VERIFICATION-1.1.5.md](VERIFICATION-1.1.5.md) records the fictional household scenario, implementation, checks and remaining device/service verification. Older release reports are retained for history. The mock bank fixture exists only for isolated emulator tests and is never distributed as part of the app.

Run the seven finance/OAuth suites and deterministic stress tests with Node 24:

```sh
node scripts/run-finance-regressions.mjs
```

The household has ₹50,000 salary, ₹20,000 starting savings, ₹29,500 expenses and ₹10,000 reserved for villa/car/bike dreams. Its balance is ₹40,500, then ₹70,500 after ₹10,000 and ₹20,000 extra credits, and ₹69,000 after a ₹1,500 debit. Naming that debit does not deduct it again.
