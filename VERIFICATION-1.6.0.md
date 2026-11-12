# Pro Financer 1.6.0 verification

Version 1.6.0, Android code 13. App source: `6ad63c78a696fb00c79c0111f9563df2fdd6a241`.

The original 1.3.1 layouts for Dashboard, Activity, Expenses, Goals, Dues, header, balance hero, pie chart and navigation are restored. The Add tab/composer shortcut is removed. The original seventh Profile tab remains in place. Loans opens from its dashboard card or the Loans option in Profile. Reminder controls remain inside the added Loans section. A generated teal/gold refinement of the classic PF logo is used for the launcher/header and native notification branding.

## Changes and checks

- Expense creation waits for an accepted, saved mutation. Activity derives direction from collection membership and explicitly displays Expense/Income and minus/plus signs. The manual-income action is labelled Record income. Existing entry direction can be corrected by moving it atomically between collections. Capture/reference metadata and replay IDs remain, matching repeats respect the correction, and changing a cash entry matched to a loan is blocked until that repayment is undone.
- Loan save/update returns success or failure to the form instead of silently dismissing a rejected mutation. Interest defaults to zero. A positive EMI can infer the term, while a supplied term can calculate EMI; invalid or insufficient payments show an error. Blank name/party values use visible defaults. New loans return to the top of the list and are highlighted. Existing loans and interest plans remain readable. Dashboard loan balances, monthly unpaid reserves, due dates and total debts derive from the same state.
- SMS handles debit/DR/withdrawal/purchase variants and holds merchant/beneficiary-received wording for Review. Exact reference deduplication and conservative uncertain-message handling remain. The exact bank message reported by the user was not supplied; expanded fixtures and real emulator messages validate the supported paths, not all possible bank wording.
- TypeScript and finance/SQLite/encryption/sharing/stress regressions passed. Direction tests verify 321.45 expense reduces a 1000 budget to 678.55, correcting it to income gives 1321.45, and correcting it back gives 678.55 without duplication. Matched-loan protection, replay after correction and a separate explicitly confirmed refund following a correction are covered. EMI inference tests cover zero interest, a known amortized plan, last-paisa payments and payments too small to reduce the principal.
- Chromium passed manual expense creation, its negative Expense row and absence from Income, explicit correction both ways, deletion restoring the exact balance, a 6000 loan entered with only amount and 1000 EMI, persistence after reload, dashboard reserve, all existing loan/interest/repayment checks, original dashboard/card/pie details, sharing, goal/profile photos and encrypted restore.
- The expanded native parser suite passed 36 bank SMS cases, 10 receipt-identity cases, 47 notification cases and refund/reference regressions; Android capture/reminder sources compiled against SDK 36.

## Release

Build: https://github.com/7899kk/kknew/actions/runs/43249192768

Final device verification: https://github.com/7899kk/kknew/actions/runs/43260622801

Android 7/API 24, Android 9/API 28 and Android 16/API 36 finance, persistence and actual emulator SMS flows all passed. The API 24 retry uses a bounded non-streaming installer after the initial streaming installation stalled before app startup. Rechecks verified unchanged compiled application source.

Public APK: https://github.com/7899kk/kknew/releases/download/v1.6.0-j7/Pro-Financer-J7.apk

The public APK was downloaded without authentication and matched the independently verified signed build: version 1.6.0/code 13, ARM32/ARM64, minimum API 24, 57,963,493 bytes.

SHA-256: `6eec9a691dcf28a9579f47fd4ad4e578942278b9a0dc1fca122d440b4c07f7f2`.

Signing certificate SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. This personal preview retains the prior Android test-key signing identity.
