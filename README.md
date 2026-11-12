# Pro Financer

Android personal finance app built with Expo / React Native. Finance data stays in a local SQLite ledger. Investments and paid market APIs are removed.

## Download

**[Download the 1.3.0 APK](https://github.com/7899kk/kknew/releases/download/v1.3.0-j7/Pro-Financer-J7.apk)** · [Release details](https://github.com/7899kk/kknew/releases/tag/v1.3.0-j7)

Version **1.3.0**, Android code **9**. Finance and real emulator SMS flows passed Android 7, 9 and 16 checks. The public APK download, hash, manifest and signatures were independently verified.

Android 7/API 24 or newer, ARM32 and ARM64. Personal preview signed with the Android test key. Physical-phone and real bank format checks remain necessary.

## What changed in 1.3.0

- Compact Home, Activity and Split screens. Every main screen shows the brand and your name; Dues contains debts and credits.
- Tap dashboard cards for balance, income, expense/category, available-money, goal and debt breakdowns.
- Previous-month income and expenses guide a shared saving allowance for this month's dreams. During the first month, the next month's suggestion uses projected spending and is marked as an estimate. Suggestions reserve no money automatically.
- System document picker for profile photos, with a persistent private copy on Android and a resized persistent image on web.
- Styled SMS permission setup appears after onboarding. Android still presents its required system consent. You can enable SMS later using the sliders icon in Activity or Profile.
- Clear bank SMS debits and credits are captured with day, date and time. Separate balance amounts are excluded. Failed/pending/future payments, OTPs and promotions are skipped; uncertain messages, unknown senders, refunds and own-account transfers need review before affecting totals.
- Edit payment reasons and income labels in Activity. Debit notifications support an Add reason reply. Income labelled Salary replaces the matching salary estimate instead of adding that salary twice.

SMS processing runs on the phone. Raw messages are neither saved by this app nor uploaded. Only payment metadata enters the durable capture queue and ledger. Tracking begins at opt-in; inbox recovery reads messages arriving after that point. Enabling SMS disables the older notification listener to avoid counting both sources. Android permissions, force-stop, battery restrictions and unsupported bank formats can leave gaps; compare entries with your statement. No bank account is connected, and cash payments require manual entries.

## Budget and shared bills

Starting savings + monthly income − recorded monthly expenses = balance. Goal reserves and recurring bills are subtracted to show available spending money. This is a monthly budget, not a verified bank balance.

Split → Create group → add each person's name → add expenses and repayments. Share selected group files with friends; they open them in the same UI and return expense/payment proposals for organizer approval. Updated snapshots carry the latest balances. Files do not verify identities or bank payments; sharing is explicit and does not make groups public. No paid API or hosted group server is needed.

Profile contains password-encrypted backup, restore and recovery. Keep the backup password separately; it cannot be recovered. Login tokens and device permissions are excluded. Native profile photo paths are local to the original device; select the photo again on a different phone.

## Development and verification

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/wealthtrack typecheck
node scripts/run-finance-regressions.mjs
pnpm --filter @workspace/wealthtrack exec expo export --platform web --output-dir dist
pnpm exec playwright install chromium
node scripts/profinancer-web.test.cjs artifacts/wealthtrack/dist
```

Java 17, Android SDK 36 and NDK 27.1.12297006 are needed for native builds. Run Expo prebuild, then `:money-notifications:testReleaseUnitTest` and `:app:assembleRelease`. The GitHub Actions workflow builds ARM32/64 and tests Android 7, 9 and 16 before publication. Expo Go and web cannot read SMS.

See [1.3.0 verification](VERIFICATION-1.3.0.md) and [previous release evidence](VERIFICATION-1.2.0.md).

## Optional Google sign-in

The app works locally without service keys. To enable Google sign-in, configure Google in Supabase Auth, allow `profinancer://auth-callback`, and set repository Actions variables `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` before rebuilding. Never use a service-role key. Sign-in does not sync or separate the local finance ledger.
