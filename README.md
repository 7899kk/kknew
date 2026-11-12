# Pro Financer

Android personal finance app built with Expo / React Native. Finance data stays in a local SQLite ledger. Investments and paid market APIs are removed.

## Download

**[Download the 1.6.0 APK](https://github.com/7899kk/kknew/releases/download/v1.6.0-j7/Pro-Financer-J7.apk)** · [Release details](https://github.com/7899kk/kknew/releases/tag/v1.6.0-j7)

Version **1.6.0**, Android code **13**. Finance and real emulator SMS flows are verified on Android 7, 9 and 16; the published APK is checked independently for version, manifest, checksum and signatures.

Android 7/API 24 or newer, ARM32 and ARM64. Personal preview signed with the Android test key. Physical-phone and real bank format checks remain necessary.

## What changed in 1.6.0

- Restores the original classic teal layouts for Dashboard, Activity, Expenses, Goals, Dues, header and navigation, including the balance card and finance pie chart. The central **Add** tab is removed. The original tabs remain Dashboard, Expenses, Activity, Dues, Goals, Split and Profile. Loans opens from its dashboard card or the Loans option in Profile; reminder controls are inside Loans. A matching teal-and-gold PF logo replaces the ivory logo.
- Record expenses inside **Expenses → +**. Activity shows an explicit **Expense** or **Income** label as well as the minus/plus sign. A transaction's type comes from its ledger collection, not its category or description. Existing entries can be corrected in the edit form; direction correction moves one entry atomically and keeps captured-message replay IDs. A matching automatic repeat cannot undo a user correction. Undo a linked loan repayment before changing that cash entry's direction.
- SMS understands debit, DR, withdrawal and purchase wording. Messages describing a merchant or beneficiary receiving money remain in Review instead of being assumed to be income to the phone owner. Ambiguous and uncertain messages still stay outside totals. A new bank format needs checking against an anonymized real message; this is not a universal SMS parser.
- Loan interest defaults to **0%**. Enter the amount and either a monthly payment or a term; the other can be calculated. The name/lender may be left blank and receive visible default labels. Save validation is shown clearly, and the form waits for a successful save. A new saved loan is highlighted and the list returns to the top. Existing agreed-balance mode remains supported.
- Home includes each loan's remaining balance, monthly installment and next due date, with unpaid monthly loan reserves in available money and all pending loan balances in Dues. Loan/bill payment records continue to update dues only; real cash entries are added or matched separately.
- Existing data, interest plans, loan repayments, photos, encrypted backups and local reminders are retained. No schema reset or bank/API subscription is required.

## What changed in 1.5.0

- Detailed loans ask for amount, annual reducing-balance interest, number of months, optional lender EMI and first due date. The preview shows calculated EMI, total interest, total repayment, number of installments and final payment. Saved loans include a dated payment schedule. Existing agreed balances keep their original amounts in **Existing balance** mode.
- Interest is a fixed-rate estimate with monthly paise rounding. An entered EMI may shorten the schedule or leave a larger final payment, which is shown explicitly. Fees, changing rates and early/late-payment interest adjustments are not recalculated automatically. Loan dues represent the agreed/estimated total repayment, including interest.
- **Others** collects Goals, Bill split, Debts & credits, Loans, Insights & budgets, Profile & backup, SMS settings and payment reminders. The main Loans tab remains available.
- Enable **Payment reminders** in Others and allow Android notifications. Local alerts start seven days before a loan EMI or dated debt is due, then repeat daily around 9 AM while unpaid, including overdue items. Partial payments reduce the reminded amount; paid installments move to the next due date. Reminders reschedule after restart, reboot and timezone changes. Android may defer delivery for battery saving; force-stopping the app stops delivery until reopened. No paid notification service or exact-alarm permission is used.
- Choose a goal photo and keep the goal's name beside it. Photos appear in Goals and the dashboard. Android keeps a private image file; on another phone, a restored native photo path may need selecting again. Web stores a resized thumbnail in the backup. Missing photos fall back to the goal icon.
- Dashboard balances and money confirmations count and rise when amounts change. Manual income/expenses display a confirmation after saving. Reduced-motion settings disable the animation. Income/positive cash flow uses yellow-gold, and spending/debits use red, with text labels as well.
- **Recorded cash flow** separates real received money, spending and net recorded cash from the salary-based monthly budget. Latest activity and payments due within a week appear on Home. SMS captures update the same saved ledger, dashboard totals and graphs.
- Possible duplicate SMS alerts with the same known bank, account, amount and bank balance remain in Review for up to 24 hours; weaker matches use ten minutes. Different known balances/accounts remain separate. Exact references retain durable deduplication. Review entries do not affect dashboard totals.
- Ledger version 3 stores interest terms, goal photos and reminder preferences, while reading previous versions 1 and 2. Bill and loan payments still update dues only, with cash entered or matched separately.

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

See [1.6.0 verification](VERIFICATION-1.6.0.md), [1.5.0 verification](VERIFICATION-1.5.0.md), [1.4.0 verification](VERIFICATION-1.4.0.md), [1.3.1 verification](VERIFICATION-1.3.1.md), [1.3.0 SMS release evidence](VERIFICATION-1.3.0.md) and [earlier release evidence](VERIFICATION-1.2.0.md).

## Optional Google sign-in

The app works locally without service keys. To enable Google sign-in, configure Google in Supabase Auth, allow `profinancer://auth-callback`, and set repository Actions variables `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` before rebuilding. Never use a service-role key. Sign-in does not sync or separate the local finance ledger.
