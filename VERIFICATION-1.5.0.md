# Pro Financer 1.5.0 verification

**[Download the published APK](https://github.com/7899kk/kknew/releases/download/v1.5.0-j7/Pro-Financer-J7.apk)**. Version 1.5.0, Android code 12. Compiled app source: `e6eb3d6459acec81731b227095f77176c280dbdd`.

## Behaviour

Detailed loan terms use annual reducing-balance interest and an optional actual monthly payment. Interest and each installment round to integer paise. The UI shows the estimated EMI, interest, total repayment, final payment, end date and full dated schedule (expandable, first 120 rows for long plans). Old loan balances retain their original total without invented interest terms. Loan and bill repayments continue to update dues only, without creating cash transactions.

Others provides the feature hub and reminder controls. Local reminders cover borrowed loan installments and manual debts with a due date, beginning seven days before due and repeating daily while unpaid. One daily notification summarizes due items; paid installments advance to the next unpaid date. Android uses an inexact daily AlarmManager alarm at 9 AM and reschedules after boot, app replacement and clock/timezone changes. No exact-alarm or paid service permission is added; RECEIVE_BOOT_COMPLETED is added. Delivery needs enabled notifications and can be delayed by Android; force-stopped apps must be reopened.

Goal photos use the existing document-picker/private-file mechanism with an emoji fallback if an image is missing. Names remain visible. Web thumbnails persist in the ledger/backup; native image paths are device-local. Ledger envelope version 3 accepts previous versions 1 and 2 and stores the new terms, image and reminder fields.

The dashboard uses the same shared ledger as SMS capture, shows recorded income/spending/net cash, latest transactions, loan reserves and upcoming dues. Yellow-gold indicates income/positive recorded cash and red indicates debits/spending. Amounts count and rise on real changes, with a startup balance animation and manual-save confirmation. Reduced-motion preferences disable movement.

SMS deduplication additionally holds delayed alternate alerts with identical known bank/account/amount/balance for Review within 24 hours; less specific matches retain the ten-minute window. Distinct known balances or accounts remain separate payments. Exact-reference replay protection, invalid/failure exclusion and durable inbox recovery remain.

## Local evidence

- TypeScript passed.
- Finance/recovery/SQLite/encryption and stress regressions passed, including the existing SMS and shared group checks.
- New tests verify EMI against an independent integer interest oracle: 100000 at 12% for 12 months gives EMI 8884.88, interest 6618.53 and final installment 8884.85. Tests cover zero interest, earlier completion, actual EMI with a final balloon, invalid terms/amounts, month-end dates, schema total consistency, seven-day reminder boundaries, paid/lent exclusions, next installment after repayment and backup preservation.
- SMS capture tests verify dashboard income, spending, cash balance, graph points and a delayed possible repeat remaining outside totals.
- Native parser/store/receiver/reminder code compiled against Android SDK 36; the actual Expo/React bridge also compiled. Existing 31 SMS, 10 receipt-identity and 47 notification parser checks passed.
- Chromium tests passed for the new interest form/schedule and monthly dashboard reserve, Others/reminder preview, goal image selection/reload and encrypted restore, all existing finance details, group sharing/approval, personal dues, loan matching without extra cash, profile photos and graph controls. A new interest loan adds 8884.88 to a pre-existing 1500 reserve, producing 10384.88 reserved and 59615.12 available from a 70000 cash budget.

## Android release

Build and device run: https://github.com/7899kk/kknew/actions/runs/43204131641

- Both ARM32/ARM64 and x86/x86_64 builds passed, including native parser tests and APK permission/signature checks. The original device run found that the test driver's hardware-keyboard Back step closed the second loan form after restart. The driver now uses Enter for single-line input dismissal; no application code or money assertions changed.
- [Full device recheck and publication](https://github.com/7899kk/kknew/actions/runs/43207238482) passed Android 7/API 24, Android 9/API 28 and Android 16/API 36. The source-verification job proved that the reused artifacts match the unchanged compiled app/dependencies.
- Every platform checked a 100000 loan at 12% for 12 months, displayed EMI 8884.88 and total repayment 106618.53, then checked dashboard availability 88615.12 after the existing 1000 goal reservation. Existing loan partial/full payment and restart checks also passed without creating extra cash.
- Every platform enabled reminders, posted a real due-loan notification containing InterestLoan EMI, confirmed the scheduled daily PaymentReminderReceiver alarm, then disabled reminders and confirmed removal from the active alarm list. Full notification and alarm dumps, screenshots and UI evidence are retained in the platform artifacts. These checks verify notification delivery on request and daily alarm setup/cancellation; they do not simulate an entire week of clock time or every manufacturer battery policy.
- Every platform passed real SMS permission/receiver, credit and exact-repeat handling, alternate-alert Review exclusion, a genuine second equal-amount credit, failed/pending/OTP exclusion, debit reasons, background capture and 88000 cash after restart.
- [Latest GitHub finance/browser checks](https://github.com/7899kk/kknew/actions/runs/43207237135) passed. Screenshot capture waits for modal and amount animations to settle.
- The public release APK downloaded without authentication. Package `com.profinancer.app`, version `1.5.0` / code `12`, min SDK `24`, target SDK `36`, ARM32 and ARM64. Size **57,697,253 bytes**. Expected permissions include read/receive SMS, notifications and the new boot-completed permission; no exact-alarm permission is requested.
- Signatures verify for API 24 through 36. Certificate SHA-256 matches previous previews: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. Install over the existing preview to preserve local data.

APK SHA-256: `f01d1000e6af170b7113cea041955ae4645c092c5f0e86dad3a3dfc91a920ad0`. Public bytes and size match GitHub's uploaded asset digest.

This is a personal preview signed with Android's public test key. Physical-phone installation, real bank formats and manufacturer notification/battery settings still require phone checks.
