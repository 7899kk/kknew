# Pro Financer 1.1.5: household budget and debit reasons

## Changes

Previously, the first incoming payment replaced the complete monthly income estimate. Version 1.1.5 adds extra or unclassified credits to that estimate. Entries explicitly labeled **Salary** offset the estimated salary up to its amount, so salary instalments or a full salary payment do not count twice. Salary above the estimate adds the excess. Other income estimates remain part of the monthly budget; this is an estimate, not a retrieved bank account balance. The dashboard explains this rule.

The debit reason prompt is a compact panel aligned to the right, using the app's colors and logo, with an X, one reason field and OK. Blank or overlong reasons are rejected. OK updates the original debit; X leaves the debit counted and its reason outstanding in Activity. It appears automatically when a captured debit reaches the open app.

When the app is closed, a debit notification offers **Add reason**, using Android's inline reply. The app does not force itself open or draw a custom sidebar over other applications. Android controls the notification appearance and dismissal. A private, non-exported receiver durably queues the reply; the ledger applies it to the existing debit after resume. A reply never creates another debit or resurrects a deleted transaction. No overlay permission was added. Existing Android notification-access requirements still apply.

A new teal, white and mint PF growth logo is used for the Android launcher, splash, app headers, sign-in/onboarding and debit prompt, and payment notification large icon. Notification image decoding is sampled to keep memory use lower on older phones.

## Fictional household used for verification

| Item | Amount |
| --- | ---: |
| Monthly salary estimate | ₹50,000 |
| Starting savings | ₹20,000 |
| Rent | ₹12,000 |
| Groceries | ₹8,000 |
| Travel | ₹3,000 |
| School | ₹4,000 |
| Utilities | ₹2,500 |
| Expenses total | ₹29,500 |
| Balance before extra credits | ₹40,500 |
| Villa target / reserved | ₹1,00,00,000 / ₹5,000 |
| Family car target / reserved | ₹18,00,000 / ₹3,000 |
| Dream bike target / reserved | ₹2,50,000 / ₹2,000 |
| Available after reserving ₹10,000 | ₹30,500 |
| Balance after extra credits ₹10,000 + ₹20,000 | ₹70,500 |
| Balance after debit ₹1,500 | ₹69,000 |
| Final balance after further debits ₹100 + ₹500 | ₹68,400 |
| Final available amount | ₹58,400 |

The pure household regression tests the expense breakdown, savings limits, a one-year villa deadline that is unaffordable, an undated saving suggestion, extra credits, a debit, inline reason import, replay, deleted debits and salary deduplication. The Android screen scenario enters the household expense total and the three goals, then uses an isolated fixture to post actual Android notifications with bank-like formats. The fixture uses a supported package ID only in the disposable emulator and is not bundled in the product or published as an APK. No real bank, account, transfer or financial data is used.

## Verification status

Local checks passed: seven finance/OAuth suites plus 1,000 deterministic budget stress cases and a 200-event replay batch. Command: `node scripts/run-finance-regressions.mjs` (Node 24). The runner is also used by Android CI.

The ARM build, native parser, type checking, seven regression suites, stress suite, signing and manifest checks passed in [run 37943211798](https://github.com/7899kk/kknew/actions/runs/37943211798). The downloaded APK was inspected again locally: version 1.1.5/code 7, Android 7/API 24 minimum, 32-bit ARM only, 34,556,913 bytes, private/non-exported inline-reply receiver, required protected listener and the same limited permission list. The v2 signature verifies for Android 7–9 with the existing personal Android test key; a legacy v1 signature is included. SHA-256: `7877cbad5573d6b44ab883ecd7a31355a06a4d5440d336398d163bf981c6be73`. The generated logo pixels match a packaged native resource; resource filenames are shortened by the release build.

Both Android 7/API 24 and Android 9/API 28 household screen tests passed in [run 37958403033](https://github.com/7899kk/kknew/actions/runs/37958403033), using equivalent x86 release builds on 1536 MB emulators. The application source was checked against the original compiled build before testing and publication. Each run verified:

- Fictional household onboarding, ₹29,500 expenses, villa/car/bike goals and ₹10,000 reserves: ₹40,500 balance / ₹30,500 available.
- Actual mock Android notifications captured through the protected listener after Android's consent screen: ₹10,000 then ₹20,000 credits, with ₹70,500 balance / ₹60,500 available. Repeating the ₹20,000 reference did not add another credit.
- ₹1,500 debit opened the compact X/Reason/OK panel; blank reason was rejected and Groceries saved on the original debit. Balance stayed ₹69,000 / available ₹59,000.
- Closing the next ₹100 debit kept it counted and left an Activity reminder.
- A further ₹500 debit was received with the app in the background. Fuel was entered and sent from Android's inline notification reply, without reopening the app to type it. Both Fuel and Groceries were present in Activity afterward.
- Cold restart retained the data, the outstanding ₹100 reason prompt, ₹68,400 final balance and ₹58,400 available. The already-replied ₹500 debit did not prompt again.

Both evidence artifacts contain `BANK-FLOW-PASSED.txt`, screenshots and logs. The compact panel, background inline-reply field and final dashboard screenshots were also visually inspected. Earlier 1.1.5 baseline screen checks verified that a name is entered once, ₹1,00,000 salary plus ₹1,000 savings gives ₹1,01,000, and expense/goal changes persist.

The publication job passed and uploaded [Pro-Financer-J7.apk](https://github.com/7899kk/kknew/releases/download/v1.1.5-j7/Pro-Financer-J7.apk) to the [1.1.5 personal-test release](https://github.com/7899kk/kknew/releases/tag/v1.1.5-j7). GitHub reports the same 34,556,913-byte APK and SHA-256 as the inspected ARM artifact. Signature, checksum and APK verification reports are included with the release.

Physical Galaxy J7 Nxt installation, Samsung keyboard behavior, Google Play Protect acceptance, real bank notification formats and audible sounds are outside the emulator verification. Google sign-in needs the user's Supabase and Google OAuth configuration. Capture handles supported payment-app notifications; generic bank SMS is not read. Emulator sound channels can be checked structurally, but an emulator running without audio does not verify what a phone speaker sounds like.
