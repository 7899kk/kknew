# Pro Financer specification review — 7 October 2026

This review checks version 1.1.1 (Android version code 3). Automated tests and source review cannot establish that every feature works on a physical phone. Supabase Google login is implemented but has no live project configuration.

## Confirmed bugs fixed

- Manual expense dates used UTC, showing the previous day in India before 05:30. They now use the device's local date.
- Money forms accepted scientific/hexadecimal notation using Number, then some saved it using parseFloat with a different value. Shared validation now accepts decimal money with at most two decimal places.
- Payment parsing missed spaces after the rupee symbol, accepted malformed comma groups, and could classify negated success messages as expenses. It now accepts valid Indian/Western grouping and rejects malformed amounts and failed/negated messages.
- Reference parsing could accept a word such as “number” as a transaction identifier. It now recognizes number/no/ID labels, requires a digit and rejects overlong identifiers.
- A refund using the original transaction reference and amount was discarded as a duplicate payment. Refunds now have separate deduplication IDs; ordinary payment IDs stay compatible with the previous APK.
- Bill settlements omitted a one-paisa debt and used fractional-paisa math. Splits now distribute integer paisa, including deterministic remainder distribution, and settle every nonzero balance.
- Google callbacks containing cancellation/errors in a URL fragment, or no login code, could leave the callback screen waiting forever. These now report an actionable error; callback tests cover query/fragment errors and PKCE flow IDs.
- Confirming an ambiguous UPI payment changed it to Bank and discarded its reference. Review resolution now shares the import logic and preserves source, reference, payment type and date.

## Feature status

| Specification | Evidence | Remaining verification |
| --- | --- | --- |
| Automatically record received/sent money | Native listener plus 33 parser cases; importer and review tests pass | Live supported bank/payment notifications on phone; other formats/languages may need parser additions |
| Avoid duplicate transactions | Import replay, restart-state replay and deleted-entry replay checks pass; native durable dedup reviewed | Cross-app alerts and background service behavior on phone |
| Name income Salary/Other/custom | Default naming, custom labels, persistence representation and review naming tested | Tap through editing on phone |
| Different sounds for received/sent money | Separate native channels and bundled WAV assets reviewed; Android bundle export passes | Listen using Activity's two sound-test buttons; DND/channel settings apply |
| Existing logo | Launcher, splash and native notification configuration reviewed | Visual appearance on phone |
| Replace Investment tab | Activity replaces it in both navigation layouts; no investment route remains | Navigate each tab on phone; legacy investment values remain in old net-worth data |
| Expense, income, debt, goal and profile validation | Shared money/date checks and source review; TypeScript passes | All create/edit/delete UI flows on phone |
| Split bills | Equal/subset splits, one-paisa debt, rounding, offsets, duplicate participants and invalid data tested | Create/delete groups and expenses through UI |
| Correct monthly totals | Same-month income/expense and planned-income fallback checks pass | Dashboard refresh across month changes on phone |
| Storage, capture reset and permissions | Serialized saves and post-save acknowledgement, reset epoch and permission controls reviewed | Reopen after edits, denied/revoked access, reset, capture off and storage failure on phone |
| Supabase Google login | Optional local mode, PKCE callbacks and secure token storage implemented | Blocked by real Supabase/Google configuration; no live sign-in tested |
| Android APK | Version 1.1.1 native compilation and revised JavaScript export pass | Version 1.1.1 native compilation passed in GitHub Actions; confirm install on Samsung J7 Nxt Android 9 |

## Automated checks

- Mobile TypeScript check: passed.
- Payment import and review regression checks: passed.
- Money/date/monthly-total regression checks, including Asia/Kolkata midnight: passed.
- Bill settlement regression checks: passed.
- Native Kotlin payment parser: 33 cases plus payment/refund fingerprint regressions passed on JVM.
- Google OAuth callback parsing checks: passed; no live sign-in or token exchange was tested.
- Android JavaScript production export: passed.
- GitHub workflow now runs the native parser as a JUnit unit test and all four TypeScript test files before building the APK. Full updated native build passed in GitHub Actions.

## Phone test sequence

1. Install the latest APK from Releases. Complete onboarding; visit Dashboard, Expenses, Activity, Debts, Goals, Split and Profile. The Investment tab should be absent.
2. Edit your profile, choose a profile photo, and verify the saved salary/savings values. Add/edit/delete an expense and income. Name an income “October salary”. Add a debt, mark it paid, create a goal and add savings. Split a bill among all members and then a subset. Verify displayed totals.
3. Close and reopen. Verify your entries and income name survive. Android capture stores a native queue while the JavaScript app is closed; totals refresh when the app opens.
4. Deny notification access first, then allow it and enable capture in Activity. Try both sound tests. Check capture-off and revoked-access states too.
5. For ordinary supported received/sent notifications, check amount and direction exactly once. For refunds, unclear amounts, own-account transfers and missing references, confirm review instead of automatic totals. Failed/pending/OTP alerts should add nothing.
6. Name a captured income. Review an ambiguous UPI payment, verifying its reference remains. Delete a captured entry and confirm the same alert does not re-add it.
7. Test foreground and background capture; compare your statement. Silent mode, DND, battery restrictions and force-stop can alter sound/capture behavior. Cash and notifications predating capture are not detected.
8. Use reset only on disposable test data. Verify onboarding returns and capture is disabled.
9. After configuring Supabase and Google, test sign-in, cancellation, restart/session restore and sign-out. Login does not sync or separate the single local finance ledger.

No physical-device, emulator UI or live Google login test was performed in this workspace. This report does not claim that every bug has been removed.

## Final APK verification

[GitHub Actions run 37658123296](https://github.com/7899kk/New-2/actions/runs/37658123296) completed successfully, including all four TypeScript test files, the native parser JUnit test, full standalone APK compilation and release publication.

- Compiled source commit: `f71af1b191980371bdcc89938c6ae27c73c6cbe1`.
- [Download the tested version 1.1.1 APK](https://github.com/7899kk/New-2/releases/download/android-6/Pro-Financer.apk).
- Downloaded artifact bytes match the release SHA-256: `3f231dc1cbe06e62ad7021413e007d8fe995b3fab92474cc77095c97a6d890aa`.
- The actual APK manifest has package `com.profinancer.app`, version `1.1.1`, version code `3`, minimum SDK `24` and target SDK `36`.
- The actual APK contains ARM 32-bit and ARM 64-bit libraries, bundled JavaScript, the compiled notification listener, the original logo and all three original sound files. READ_SMS, RECEIVE_SMS and READ_CONTACTS are absent.
- Physical-phone installation, UI flows, permissions, background delivery, audible playback and live Supabase Google login remain untested. Google login is disabled until configured.
