# Version 1.1.2 specification and verification

## Changes

- New captured debits have a durable `needsReason` marker.
- A small app-wide sheet asks for a reason and expense category. It uses the original logo and pauses while backgrounded or outside the main tabs.
- Later preserves the debit in totals and leaves an Activity reminder. Saving updates the existing entry without counting it twice. Review-confirmed debits also receive a prompt.
- Activity offers Add reason and category editing.
- Native debit notifications say Money debited and ask for a reason. Versioned high-importance channels support heads-up alerts while retaining separate received, sent and review sounds and private lock-screen content.
- Version 1.1.2 / Android version code 4. Investment navigation remains removed. Supabase Google login remains optional.

## Checks actually run in this workspace

Five TypeScript regression files passed using Node 24's TypeScript stripping with a temporary import-resolution hook, because dependency installation could not reach the workspace network proxy:

- Payment import/review: duplicate and deletion replay, saved-state replay, income naming, invalid inputs, corrected amounts and UPI/reference preservation.
- Finance validation: decimal money, impossible dates, Asia/Kolkata midnight, monthly totals and planned-income fallback.
- Bill settlements: integer-paisa rounding, one-paisa debts, subset splits, offsets and invalid/duplicate participants.
- OAuth callbacks: query/fragment errors, cancellation, flow ID and missing/malformed callback. This does not test live login.
- Debit reasons: replay, restart/defer, unchanged amount/reference, exactly one entry, reason validation, legacy records and review confirmation.

Source review confirmed seven current tabs, Supabase PKCE and native secure token storage. The launcher logo, notification logo and supplied `attached_assets/lojo_1775119213955.jpg` have identical SHA-256 hashes. Received/sent/review WAV files are present and readable. `git diff --check` passed.

No app UI, emulator, phone, local typecheck or native compilation was run here. GitHub Actions must complete mobile typechecking, all five TypeScript test files, Kotlin parser JUnit tests and full APK compilation before an APK is published.

## Requirements and remaining verification

| Requirement | Implementation | Remaining verification |
| --- | --- | --- |
| Automatic received/sent money | Supported Android listener, parser, queue and importer | Real supported payment notifications on phone. |
| Name income Salary or custom | Activity editor and default Uncategorized income | Phone editing/persistence flows. |
| Debit amount popup and reason | Global sheet, durable flag and Activity reminder | Layout, keyboard, background/foreground and deferred UI flows. |
| Distinct sounds and alerts | Rising received, falling debit, separate review tone and Android channels | Audible playback and heads-up behavior on phone. |
| Existing logo | Launcher, splash, login, alerts and debit sheet | Phone appearance. |
| Remove Investment tab | Activity replaces it; old data retained | Phone navigation. |
| Google login with Supabase | Optional PKCE flow and native SecureStore | Real Supabase/Google configuration, login, cancellation and session restoration. |
| Other finance features | Expenses, debts, goals, split bills, profile retained | Full create/edit/delete and restart UI testing. |

No Supabase project or Google credentials were provisioned in this workspace. Configure the public URL/key and OAuth redirect in README, then rebuild. Google login does not sync, back up or separate the device's finance ledger.

## Phone acceptance sequence

1. Install the newest successful APK, complete onboarding, open all seven tabs, and verify the logo and no Investment tab.
2. Create/edit/delete expenses and income; name income October salary. Add/pay a debt, save toward a goal and split a bill. Check totals and restart persistence.
3. Deny/grant/revoke notification access; toggle capture and app alerts. Test both sounds in normal and silent/DND settings.
4. Receive a supported real payment notification, confirm one income entry, name it Salary and restart.
5. Make a supported payment. Confirm the amount once, a falling sound and a reason sheet while open. Save Groceries/Food; check the same entry and unchanged amount/totals.
6. Choose Later for another debit. Check Activity, restart and save its reason. Replay alerts and delete a captured entry; confirm no duplicate/reappearance.
7. Test closed-app capture, notification taps, multiple queued debits and storage retry. The app does not display overlays over other apps.
8. Refunds, unclear amounts and own-account transfers should require review. Failed/pending/OTP/promotion alerts should add nothing. Compare with the statement.
9. After Supabase/Google setup and rebuild, test login, cancellation, restart/session restore and sign-out.
10. Reset disposable test data and confirm capture is disabled.

Capture reads future supported notifications, not bank accounts. Cash, historical alerts and unsupported formats cannot be captured. Device battery restrictions/force-stop can stop listeners, and Android controls sound and heads-up display. Physical-phone tests are required before claiming every feature works.

## Compiled APK verified on 8 October 2026

[Android build 37814780223](https://github.com/7899kk/kknew/actions/runs/37814780223) passed mobile typechecking, all five TypeScript test files, Kotlin parser tests and full release APK compilation. The final release-publication step failed with HTTP 403, Resource not accessible by integration. This is a GitHub publishing permission failure; compilation and tests succeeded.

[Download the compiled APK artifact ZIP](https://github.com/7899kk/kknew/actions/runs/37814780223/artifacts/11567631903), extract it and install Pro-Financer.apk. The artifact expires on 7 November 2026.

The downloaded artifact checksum matched GitHub's digest and the APK checksum matched SHA256SUMS.txt:

- APK SHA-256: `59130aead2faae738cd9777e3a683afc19660892b16ff802ae8fbd4ad58cec21`.
- Package: `com.profinancer.app`; version 1.1.2; version code 4; minimum SDK 24; target SDK 36.
- ARM 32-bit and ARM 64-bit libraries and bundled JavaScript are present.
- Three WAV sound files and their received/sent/review resource names are present.
- Native notification listener is declared; READ_SMS, RECEIVE_SMS and READ_CONTACTS are absent from the actual APK manifest.
- Phone UI, background delivery, audible sounds and live Supabase Google login remain untested. The APK has no Supabase URL/key configured, so it opens in local mode and Google login is disabled.
