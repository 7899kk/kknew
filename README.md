# Pro Financer

Android personal finance app built with Expo / React Native. Finance data stays in a local SQLite ledger. Investments and paid market APIs are removed.

## Download

**[Download the 1.4.0 APK](https://github.com/7899kk/kknew/releases/download/v1.4.0-j7/Pro-Financer-J7.apk)** · [Release details](https://github.com/7899kk/kknew/releases/tag/v1.4.0-j7)

Version **1.4.0**, Android code **11**. Finance and real emulator SMS flows are verified on Android 7, 9 and 16; the published APK is checked independently for version, manifest, checksum and signatures.

Android 7/API 24 or newer, ARM32 and ARM64. Personal preview signed with the Android test key. Physical-phone and real bank format checks remain necessary.

## What changed in 1.4.0

- Ivory screens, white rounded cards, black selectors, gold Add button and a new matching PF logo follow the supplied design. Home has actual balance and spending charts; Insights shows spending/income bars and category movement. No sample money or investment API is used.
- Home, Activity, Add, Insights and Loans are the main tabs. The gear opens Settings, containing Profile, Debts & credits, Goals and Bill split. Every section keeps the app name and personal greeting. Startup shows the logo without the loading paragraph.
- In each bill group, choose **You in this group**. Only your net share appears in debts/credits, Home and Activity → Dues. Repayment history appears as Paid; partial repayments and reversals update the live balance. Your local identity selection is not included in shared group files.
- Loans support borrowed and lent balances, monthly installments, due dates, partial repayment history and undo. The dashboard reserves unpaid borrowed installments due this month, including overdue amounts, and shows the next dates. Month-end due dates stay anchored (31 January → 28 February → 31 March).
- **Bill and loan records update dues only.** They never add a cash expense or income automatically. Record cash separately in Activity, or match a loan repayment to an existing transaction with the same amount/date. One cash transaction cannot be matched to two repayments.
- Exact repeated bank references are counted once. Different alerts from the same bank with matching amount/account/balance within ten minutes are held for Review outside totals. Confirm a genuine separate payment or dismiss the repeat. Different known accounts or balances remain separate payments. This conservative matching cannot identify every bank format.
- Savings suggestions consider target-month loan installments; a matched loan cash payment is not projected again as ordinary spending. Backup and local storage include loans and personal group membership, with migration from older saved ledgers.

## Features introduced in 1.3.0

- Compact Home, Activity and Split screens. Every main screen shows the brand and your name; Dues contains debts and credits.
- Tap dashboard cards for balance, income, expense/category, available-money, goal and debt breakdowns.
- Previous-month income and expenses guide a shared saving allowance for this month's dreams. During the first month, the next month's suggestion uses projected spending and is marked as an estimate. Suggestions reserve no money automatically.
- System document picker for profile photos, with a persistent private copy on Android and a resized persistent image on web.
- Styled SMS permission setup appears after onboarding. Android still presents its required system consent. You can enable SMS later using the sliders icon in Activity or Profile.
- Clear bank SMS debits and credits are captured with day, date and time. Separate balance amounts are excluded. Failed/pending/future payments, OTPs and promotions are skipped; uncertain messages, unknown senders, refunds and own-account transfers need review before affecting totals.
- Edit payment reasons and income labels in Activity. Debit notifications support an Add reason reply. Income labelled Salary replaces the matching salary estimate instead of adding that salary twice.

SMS processing runs on the phone. Raw messages are neither saved by this app nor uploaded. Only payment metadata enters the durable capture queue and ledger. Tracking begins at opt-in; inbox recovery reads messages arriving after that point. Enabling SMS disables the older notification listener to avoid counting both sources. Android permissions, force-stop, battery restrictions and unsupported bank formats can leave gaps; compare entries with your statement. No bank account is connected, and cash payments require manual entries.

## Budget and shared bills

Starting savings + monthly income − recorded monthly expenses = balance. Goal reserves, recurring bills and unpaid borrowed installments due through month end are subtracted to show available spending money. This is a monthly budget, not a verified bank balance.

Settings → Bill split → Create group → add each person's name → add expenses and repayments. Share selected group files with friends; they open them in the same UI and return expense/payment proposals for organizer approval. Updated snapshots carry the latest balances. Files do not verify identities or bank payments; sharing is explicit and does not make groups public. No paid API or hosted group server is needed.

Settings → Profile contains password-encrypted backup, restore and recovery. Keep the backup password separately; it cannot be recovered. Login tokens and device permissions are excluded. Native profile photo paths are local to the original device; select the photo again on a different phone.

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

See [1.4.0 verification](VERIFICATION-1.4.0.md), [1.3.1 verification](VERIFICATION-1.3.1.md), [1.3.0 SMS release evidence](VERIFICATION-1.3.0.md) and [earlier release evidence](VERIFICATION-1.2.0.md).

## Optional Google sign-in

The app works locally without service keys. To enable Google sign-in, configure Google in Supabase Auth, allow `profinancer://auth-callback`, and set repository Actions variables `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` before rebuilding. Never use a service-role key. Sign-in does not sync or separate the local finance ledger.
