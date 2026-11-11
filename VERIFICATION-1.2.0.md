# Pro Financer 1.2.0 — implementation and verification

The source version is 1.2.0 (Android version code 8). No APK or GitHub release was published from this workspace.

## Behavior

- Android ledger writes use exclusive SQLite transactions. A versioned JSON ledger stores monetary fields in integer paise; captured event IDs commit with the ledger. Existing AsyncStorage data is retained after migration. Browser previews use local browser storage and do not claim SQLite durability.
- Changes enter the save queue immediately. Native capture is acknowledged only after successful storage; restore pauses import, waits for queued writes, and saves a recovery copy in the replacement transaction. An unreadable ledger displays recovery controls instead of creating an empty account.
- Central validation checks stored data and mutations. Historical stock/crypto/metal records retain their original quantities and price precision; market screens, market calls and active investment cards are removed.
- Capture validates each event, imports valid events even if other queued records are malformed, preserves rejected records, detects same-reference conflicting directions/amounts, and excludes conflicting candidates from totals pending review. Confirming one conflict dismisses its other candidates. Refunds remain review-only. Native queue write failures, previous-queue recovery, queue overflow, connection state and import timestamps are surfaced without storing notification text.
- Group creators share readable summaries or versioned snapshot files. Friends import view-only copies and submit expense/repayment proposal files. Claimed identities are unverified: the organizer selects the payer and explicitly approves changes. Imported snapshots never replace organizer-owned groups. Repeated/stale snapshots and duplicate/handled proposals are rejected.
- Full/partial repayments adjust group settlements, retain original expenses, and support auditable reversal. These reported repayments do not transfer money or alter the personal ledger. New snapshots remove handled proposals from a friend's pending list.
- Encrypted full backups use Noble AES-256-GCM and PBKDF2-HMAC-SHA256 (210,000 iterations), independent 16-byte salt and 12-byte nonce, and a user password of at least ten characters. Public algorithm/version parameters are fixed and checked; the ciphertext is authenticated. Keys and plaintext byte buffers are cleared after use. Authentication tokens and notification permissions are excluded. Group ownership from a full encrypted backup is restored; shared copies stay shared.
- Group files are limited to 5 MB; encrypted backups to 10 MB (approximately 5 MB plaintext). File imports require preview/confirmation. Shared files contain group data only; temporary share/picker files are removed afterward.
- Monthly category budgets show spending, remaining funds and overspending without changing balances. Reports compare selected and prior month expenses. Historical income estimates use current profile settings, which the report explicitly explains.

## Payment messages and polished sharing

Captured credits and debits retain their notification timestamp and local time. Android alerts include the amount, weekday, date and time; a successful new foreground import also shows a dismissible payment message in the app. Historical restores do not generate payment messages. Dashboard and Activity show the latest automatic payment. The debit reason panel includes its date/time. Enabling capture requests app-notification permission when Android requires it.

The dashboard compares spending with the previous month; current-month comparisons use the same elapsed calendar days, clamp February/short months correctly, and display no-baseline messages instead of an infinite percentage. Category increases appear below the comparison. A foreground/day timer refreshes month boundaries without requiring another transaction.

Bill splitting uses the app's own theme, a three-step guide, plain-language sharing/approval buttons and an in-app group summary with copy/share actions. Files remain the free transport between phones; no group is automatically made public.

## Checks completed in this workspace

- `pnpm --filter @workspace/wealthtrack typecheck` passed.
- `node scripts/run-finance-regressions.mjs` passed: existing finance/OAuth/debit-reason suites, 1,000 deterministic budget scenarios, 200 payment replay scenarios, and the new reliability suite.
- The reliability suite uses actual in-memory SQLite transactions to verify rollback after an injected failure between ledger and capture-ID writes, and recovery-copy consistency. It also covers schemas/paise encoding, sharing/proposal replay, partial/full/reversed repayments, year boundaries, capture conflicts, encryption round trips, wrong passwords and tampering.
- Expo web export passed. `node scripts/profinancer-web.test.cjs <export-directory>` exercised legacy migration, budget creation, group expenses, full repayment/restart, organizer-to-friend file sharing, expense proposal/approval, encrypted download, wrong password handling and confirmed restore in Chromium.
- Kotlin 2.1.20 compiled and ran 47 parser cases plus reference/refund fingerprint checks. The parser, queue store, listener, notification alerts and reply receiver also compiled against Android SDK 36 using stubbed resource IDs. This is a source/API compile check, not an APK or on-device test.

## Android validation remaining

Full Gradle compilation was attempted after installing Android SDK/NDK and Java 17. It ran out of disk space while expanding Gradle dependency transforms on the approximately 8 GB workspace. Generated transforms were removed afterward. No release APK was produced and no emulator or physical-device test was completed here.

CI now uses Node 24, checks the shared-group browser flow, builds ARM32 + ARM64 release libraries, and includes Android 7/API 24, Android 9/API 28 and current Android/API 36 emulator flows. The new release has its own tag, preserving the published 1.1.5 APK. These changed CI workflows have not been run from this workspace.

Before distributing 1.2.0, require the full native build and emulator flows to pass. Also test on an older Samsung and a current Android phone: permission revocation/re-enable, battery restrictions, background/inline reason replies, storage failure/restart, file sharing/import, and encrypted backup recovery. Notification access can be blocked by Android or device policy; force-stop prevents capture. Synthetic parser fixtures do not establish support for every real bank notification format.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/wealthtrack typecheck
node scripts/run-finance-regressions.mjs
pnpm --filter @workspace/wealthtrack exec expo export --platform web --output-dir dist
pnpm exec playwright install chromium
node scripts/profinancer-web.test.cjs artifacts/wealthtrack/dist
```

For native testing, use Java 17, Android SDK 36/build tools and NDK 27.1.12297006 with sufficient disk space, run Expo prebuild, then `:money-notifications:testReleaseUnitTest` and a full release build. See `.github/workflows/android-apk.yml` for the complete emulator/release sequence.
