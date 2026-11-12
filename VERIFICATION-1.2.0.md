# Pro Financer 1.2.0 — implementation and verification

The source version is 1.2.0 (Android version code 8). The [1.2.0 preview APK](https://github.com/7899kk/kknew/releases/tag/v1.2.0-j7) is published from compiled application commit `f88c48c3b8598958f5f435d79418ea22726736dc`. Later commits refine the emulator test automation and documentation without changing the application source.

## Behavior

- Android ledger writes use exclusive SQLite transactions. A versioned JSON ledger stores monetary fields in integer paise; captured event IDs commit with the ledger. Existing AsyncStorage data is retained after migration. Browser previews use local browser storage and do not claim SQLite durability.
- Changes enter the save queue immediately. Native capture is acknowledged only after successful storage; restore pauses import, waits for queued writes, and saves a recovery copy in the replacement transaction. An unreadable ledger displays recovery controls instead of creating an empty account. Explicit Reset all app data pauses capture, drains pending saves, disables/clears native capture, removes the old migration copy and atomically clears the ledger, processed IDs and recovery copy.
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

## Published Android validation

- [Native build run](https://github.com/7899kk/kknew/actions/runs/43066669370): ARM32 + ARM64 release compilation, native parser tests, manifest checks and signature verification passed. The emulator build includes x86 and x86_64. Local native compilation had exceeded the workspace disk capacity; GitHub Actions produced the verified build.
- [Android 7 and Android 9 device checks](https://github.com/7899kk/kknew/actions/runs/43072602876): finance, household budgets, restart persistence, real mock-bank notification capture, duplicate prevention, debit-reason prompts and background inline replies passed.
- [Android 16 check and publication](https://github.com/7899kk/kknew/actions/runs/43074513514): current-Android consent flow and the same finance/notification tests passed. The workflow validated that the older-platform passes and both APK artifacts use identical application source before publishing.
- The emulator driver scrolls covered controls into view, permits modal submit buttons, waits for onboarding readiness and handles the additional current-Android notification-access switch. Rechecks reuse compiled artifacts only after verifying unchanged app source and dependencies; they do not bypass failed checks.
- The direct published APK was downloaded successfully and independently checked against GitHub's uploaded-asset digest. Manifest: `com.profinancer.app`, version `1.2.0` / code `8`, min SDK `24`, target SDK `36`, architectures `armeabi-v7a` and `arm64-v8a`. APK signatures verify for API 24 through 36.

APK SHA-256: `60b4d03d2b3c75fa515ff427b6ec14aaed7083283ff78a6d60ac99eff43c091d`.

The release remains a preview using the public Android test signing key. Physical Samsung/current-phone installation, battery restrictions and real bank notification variants still need device testing. Notification access can be blocked by Android or device policy; force-stop prevents capture. Synthetic fixtures do not establish support for every real bank notification format.

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
