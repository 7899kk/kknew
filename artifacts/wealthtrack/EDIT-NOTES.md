# Finance Hub / Pro Financer — edited source

This is the existing Expo app, updated for an Android notification listener and transaction review. It is source code, not a compiled APK.

## Changes

- Investment navigation is replaced by Activity. Old investment data is retained, and the old screen is archived outside the router.
- Activity lists expense and income entries, supports editing and deleting, adds manual income, and offers review for uncertain captured alerts.
- Android-only local Expo module implements notification access settings, a capture switch, a persistent background queue, source filtering and payment parsing.
- Capture supports the declared PhonePe, Google Pay, Paytm, BHIM, SBI, ICICI, HDFC and Axis package names. Real formats and regional app variants still need device validation.
- Only clear debit/credit notifications containing a transaction reference are automatically recorded. Failed/pending payments, OTPs and promotions are discarded. Refunds, multiple currency amounts, missing references and possible transfers go to review. No historical notification recovery.
- Notification text is processed in memory and discarded. The private queue retains amount, direction, transaction reference, source, timestamp and a duplicate identifier. No notification upload is implemented.
- Duplicate keys use transaction reference plus amount across sources. Imported IDs persist after deleting an entry, preventing it from reappearing during queue replay. Review may still be needed for own-account transfers whose notifications don't identify them as such, or differently formatted reference IDs.
- The listener queues transactions while JavaScript is closed. App totals update on next open and every five seconds while active. Android may stop capture after force-stop, under battery restrictions, or on devices that prohibit notification listeners in low-RAM mode (Android 10 and below). Capture starts only after both notification access and the app's switch are enabled.
- Planned monthly income is replaced by recorded income for the current month, avoiding counting salary twice. This app does not fetch actual bank balances. The savings value remains the value entered by the user.
- Missing Clerk configuration no longer prevents personal local mode from opening. Configured Clerk login remains available; finance records are local to the device and not partitioned between online accounts.
- Storage loading errors are visible, save writes are serialized, and native notifications are acknowledged only after successful app-data storage. Activity offers retry saving.
- Reset now clears finance data and disables/clears capture after confirmation. The storage key remains unchanged for migration of existing data.
- Removed unused declared SMS/contact permissions; blocked transitive SMS/contact permissions.
- Removed the invented net-worth trend. Fixed expense amount validation to reject NaN and infinity.

## Run and edit

At the project root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/wealthtrack typecheck
pnpm --filter @workspace/wealthtrack start --web
```

The browser and Expo Go cannot read Android payment notifications. Use a custom Android APK to test that feature. No account key is needed for personal local mode. Set your own `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` only if you use Clerk; do not put secret keys in client variables.

## Build an APK on a development computer

Install Android Studio's SDK, Java 17 and Android build tools. Set `ANDROID_HOME` to the SDK installation. Then:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/wealthtrack android:apk
```

This generates the Android project and builds a standalone release-mode test APK at:
`artifacts/wealthtrack/android/app/build/outputs/apk/release/app-release.apk`.
This APK uses the public Android test key. It is for personal testing, not Play Store release. Keep the same signing key for subsequent updates; changing it prevents an in-place update. For a release, configure and retain your own release signing key.

The application uses Expo SDK 54 / React Native 0.81, whose Android minimum is API 24. Android 9 is API 28. Actual Samsung J7 installation, ABI support, memory use and notification access have not been tested on the phone.

An optional EAS APK profile is included in `eas.json`. Run the EAS CLI from `artifacts/wealthtrack` with your own Expo account if you choose cloud builds. No cloud build or paid service was started here.

## Checks completed

- TypeScript check passed for the mobile project.
- Web production bundle exported successfully.
- Expo Android prebuild completed.
- Expo autolinking discovers the custom notification module.
- Compiled and ran the pure Kotlin parser: 24 cases passed (debit, credit, amounts, references, refunds, transfer review, ambiguous amounts, OTP, promo, failed/pending payments and malformed decimals).
- Transaction importer tests passed for duplicates, replay after deletion, income/expense separation, review/transfer exclusion, invalid data, preserved existing state and saved-state replay.

## Remaining verification

An earlier local APK build was blocked by the missing Android SDK/network. The standalone version 1.1.0 APK subsequently compiled successfully in GitHub Actions and was published to Releases. Version 1.1.1 regression fixes are detailed in the root TEST-REPORT.md; check GitHub Actions for the updated native build. Physical-device notification delivery and sound playback remain untested.

On the actual phone, test first-open/onboarding, every existing tab, all create/edit/delete actions, state after restart, permission denial and revocation, switching capture off, supported live notifications, duplicates, foreground/background capture and reset. Compare recorded amounts with your statement. Not every legacy feature or optional online login/market-data service has been exercised; this is not a claim that all bugs are removed.

## Run the source tests

```sh
node --import ./scripts/node_modules/tsx/dist/loader.mjs artifacts/wealthtrack/tests/capturedPayments.test.ts
```

With Kotlin's `kotlinc` installed, compile `MoneyParser.kt` together with `tests/MoneyParserTest.kt` and run the resulting test JAR. The parser has no Android dependencies, so this check runs on a normal JVM.

## October update

Incoming money now has an editable name and category, defaulting to Money received / Uncategorized. Users can name it Salary, Business, Gift, Refund, Other or use a custom name. Native alerts are sent once only after successful native queue storage, with separate alert controls, a test button and permission settings. Tapping an alert opens Activity. Lock-screen public content omits amounts. The GitHub workflow builds a standalone release-mode APK with bundled JavaScript and uploads it to Releases after successful compilation. The initial native APK subsequently compiled in GitHub Actions; device notification tests remain required.

## Sounds, logo and sign-in

- Received payments use a rising three-note chime; sent payments use a falling chime; review has a separate double tone. Original short WAV sounds are bundled in the native module. Android channels control sound and obey silent/DND settings. Activity includes separate sound test buttons.
- The existing Pro Financier logo is now the launcher/splash logo and notification large icon. Notification status-bar icon is a monochrome wallet.
- Clerk mobile auth has been replaced with optional Supabase Google OAuth using PKCE and native secure token storage. Without configuration the app works locally, and Google sign-in is visibly unavailable. Finance entries remain a single device ledger, not partitioned between account identities and not uploaded by sign-in.
- Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY as GitHub repository Actions variables. Enable Google in Supabase with your OAuth Web client and authorize Supabase's callback in Google Cloud. Add profinancer://auth-callback to the Supabase redirect allowlist. No service-role key belongs in this app. No Supabase project or Google credentials were created here; live login is not tested.
- Dashboard monthly expense totals now use the same current month as income. Savings are still user-entered, not live bank balances.

Additional review fixed invalid/negative amount and impossible-date handling in goals, debts, expenses, profile and onboarding, duplicate bill-group member names and UTC bill dates. Shared finance-validation tests cover invalid values, leap days, month alignment and planned-income fallback. Not all features have been exercised on a device.
