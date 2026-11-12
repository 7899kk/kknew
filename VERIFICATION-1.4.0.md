# Pro Financer 1.4.0 verification

**[Download the published APK](https://github.com/7899kk/kknew/releases/download/v1.4.0-j7/Pro-Financer-J7.apk)**. Version 1.4.0, Android code 11. Compiled app source: `95318c42aefd8094da3e585020af17cdc7439b00`.

The supplied design is adapted to the existing app and data: ivory background, white round cards, dark pills, gold Add button, actual balance/category charts, compact Activity, monthly Insights and goal progress. A generated PF wallet logo is used for the launcher, startup and branded headers. Profile is under Settings, with Loans in the main navigation. The saved-data loading paragraph is removed while the storage-ready/error gate remains.

## Finance and migration

Personal group identity is kept locally and excluded from shared files. Net group settlements and non-reversed repayment history derive live Pending/Paid debt and credit rows; they are never copied into manual debts or cash transactions. Borrowed/lent loans derive the same rows. Every edit, partial payment, undo and deletion recomputes those views.

Loan schedules use integer paise, clamp month-end dates without drifting, enforce positive values and a maximum 1200-installment schedule, reject overpayment and duplicate payment IDs, and prevent matching one Activity transaction to multiple repayments. Dashboard spending availability reserves unpaid borrowed installments due through month end, including overdue amounts. A dues-only repayment changes the loan reserve and remaining balance without changing cash. Matching an existing cash transaction also creates no second transaction. Savings forecasts budget target-month installments and exclude matched loan expenses from ordinary spending projection.

New ledger envelopes use version 2 and accept version 1. Old saved data supplies empty loan/membership defaults. Backups include loans, repayments and personal membership; stored monetary values remain integer paise. Existing SQLite rollback/recovery, password encryption and sharing approval/replay checks remain in the regression run.

## SMS duplicate handling

Existing durable reference fingerprints still ignore exact repeats. Additional metadata identifies bank aliases, masked accounts, balance-after and direction. A possible repeat within ten minutes stays in Review outside totals, with its suggested debit/credit direction. The user confirms a genuinely separate payment or dismisses the repeat. Different known accounts, banks or balances remain separate. Metadata and capture events commit atomically; no raw SMS body is retained. The inbox cursor does not skip an event that cannot be queued.

This is conservative detection, not a guarantee for every bank format. Failed/pending transactions, OTPs and unsupported or ambiguous messages retain the existing exclusion/review rules.

## Local verification

- TypeScript passed.
- Finance, SQLite/recovery, encrypted backup and stress regressions passed, including personal group selection, partial/reversed repayments, loan schedules/reserves, January/February/leap dates, no duplicate cash, matching uniqueness, migration and savings forecasts.
- Native checks passed: 31 bank SMS cases, 10 additional bank-receipt identity cases, 47 notification parser cases and refund/reference regressions. The capture/store/listener/alerts/receivers compiled against Android SDK 36.
- Chromium tests passed for the new Home design and real graphs, all dashboard details, Settings/Profile, private bill identity, live personal dues, monthly loan reserves, matching a repayment to an existing cash entry, data after reload, group sharing/approval, persistent photos and encrypted backup/restore.
- The browser loan scenario reserves 2000 from a 70000 monthly balance. Matching a 500 repayment leaves 11500 owed and a 1500 monthly reserve, with cash unchanged at 70000. Restored backups retain the loan and the personal group selection.

## Native release evidence

Build and device verification: https://github.com/7899kk/kknew/actions/runs/43188967277

- Standalone ARM32/ARM64 and x86/x86_64 emulator builds succeeded. Native parser unit tests and the APK manifest/signature guard passed.
- Android 7/API 24, Android 9/API 28 and Android 16/API 36 all passed finance and real emulator SMS flows. Screenshots and UI dumps are retained in each platform's release-evidence artifact.
- On each platform, salary 100000 + savings 1000 produced 101000; an expense of 2500 left 98500. Reserving 1000 for a dream left 97500 available without changing cash. A 12000 loan reserved a 2000 installment, leaving 95500 available. Recording the 2000 repayment reduced dues to 10000, returned available money to 97500 and left cash at 98500. The group, member names and loan survived restarts. Group Save also worked with the real keyboard open.
- Real SMS delivery on each platform added a 10000 credit once, held an alternate-reference alert outside totals, and accepted another genuine 10000 credit with a changed bank balance. Exact repeats were ignored. Failed/pending/FAILURE and OTP messages produced no entry. A 1500 debit and background 500 debit retained their edited reasons and left 88000 after restart.
- [GitHub finance/browser checks](https://github.com/7899kk/kknew/actions/runs/43190424148) passed, including Week/Month/Year controls and switching Insights between spending and income. App source remained identical to the compiled source.
- The public APK downloaded successfully without authentication. Size: **57,684,965 bytes**. Package `com.profinancer.app`, version `1.4.0` / code `11`, min SDK `24`, target SDK `36`, ARM32 and ARM64. Only the expected SMS, notification and basic connectivity permissions are requested. The SMS receiver retains its protected Android broadcast permission.
- APK signatures verify for API 24 through 36. Certificate SHA-256 matches earlier previews: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. Install over the earlier preview to retain its local app data.

APK SHA-256: `3798b909d8438c8c90cdd91c69456c41b74ebbf8f83860dc87bee2dba68e18b9`. It matches GitHub's uploaded asset digest and size.

This remains a personal preview signed with Android's public test key. Physical-phone installation, battery restrictions and real bank format variations still require phone checks.
