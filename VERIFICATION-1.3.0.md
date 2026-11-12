# Pro Financer 1.3.0 verification

Source version 1.3.0, Android code 9, min SDK 24. **[Download the published APK](https://github.com/7899kk/kknew/releases/download/v1.3.0-j7/Pro-Financer-J7.apk)**. The release tag points to compiled app source `c41cc755729db3812e70df37806191e79aff0720`; later commits change only the test driver, recheck workflow and documentation.

Implemented compact Activity and bill groups, tap-to-open dashboard breakdowns, monthly dream allowance shared across goals, consistent brand/name headers, Dues naming and persistent profile photos. The bank SMS receiver is protected by Android's BROADCAST_SMS sender permission. READ_SMS and RECEIVE_SMS are requested through Expo's runtime permission manager after a branded consent panel. SEND_SMS, default SMS role, contacts and broad gallery permissions are not requested.

SMS parsing reuses strict currency/failure/OTP checks, recognizes trusted bank senders and binds transaction amounts to debit/credit verbs so available balances cannot become payments. Unknown bank-like sender messages, unclear directions, refunds and transfers stay in review outside totals. Multipart messages are joined before parsing. Raw SMS bodies are ephemeral. Inbox recovery starts at opt-in, retains its cursor on storage failure/full queues and reuses durable capture IDs and reference conflicts. SMS capture disables legacy notification capture.

Local checks:

- TypeScript typecheck passed.
- Finance regressions and SQLite/encryption/share/replay stress tests passed, including previous-month saving plans, first-month estimates, shared goal allocation and SMS source/time imports.
- 47 native notification-parser cases and 31 bank SMS cases passed. Native SMS receiver, recovery, queue and alerts compile against Android SDK 36. The SMS permission bridge also compiled against the actual Expo Core and React Native classes. Full APK compilation and device checks passed as recorded below.
- Expo web export and Chromium financial workflows passed. Extended UI checks cover dashboard breakdowns, tab headers, profile image selection and restart, styled tracking settings, group member chips, sharing/approval/repayment and encrypted backup/restore.

The emulator SMS test uses actual telephony delivery, permission consent, duplicate/failure/OTP checks, debit naming, background delivery and restart. Where an emulator rejects alphanumeric sender IDs, a numeric sender requires review; trusted sender auto-booking is covered by pure Kotlin cases. These fixtures do not establish support for every real bank SMS format. Physical Samsung installation, denied permissions, OEM battery limits and real bank variants still need phone checks.

The APK is a preview signed with the Android public test key; production signing and any app-store SMS permission review remain separate release work.

## Published validation

- [Native build](https://github.com/7899kk/kknew/actions/runs/43151668826): ARM32/ARM64 standalone APK, Kotlin/JUnit parser checks, signatures and manifest checks passed. The x86/x86_64 emulator APK also built successfully. The original Android 7 driver closed the reason modal by sending Back after typing; Android 9 and 16 passed that run. This was corrected in the driver without changing app code.
- [Complete device recheck and publication](https://github.com/7899kk/kknew/actions/runs/43154798484): Android 7/API 24, Android 9/API 28 and Android 16/API 36 all passed finance, permission and SMS tests against the unchanged compiled app. The workflow checked application source and dependency equality before reusing build artifacts. The driver uses Enter to dismiss the single-line reason keyboard, then presses the actual OK save button.
- The real emulator telephony path delivered trusted bank sender SMS. Initial balance ₹70,000 plus a ₹10,000 credit became ₹80,000; the duplicate credit, failed payments, FAILURE status, pending payment and OTP did not change totals. A ₹1,500 debit with Groceries and a background ₹500 debit with Fuel produced ₹78,000, which survived force-stop/restart.
- GitHub Actions could not create the release tag with its integration token. The authorized maintainer account created the release at the verified source commit; rerunning only publication uploaded the existing tested artifact. Final workflow status is success. No device checks were bypassed.
- The public APK downloaded without authentication. Size: **57,877,477 bytes**. Manifest: `com.profinancer.app`, version `1.3.0` / code `9`, min SDK `24`, target SDK `36`; ABIs `armeabi-v7a` and `arm64-v8a`. READ_SMS and RECEIVE_SMS are present, SEND_SMS is absent, and the exported SMS receiver requires BROADCAST_SMS.
- APK signatures verify for API 24 through 36. Its signing certificate matches the published 1.2.0 APK: SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

APK SHA-256: `4e704d065d1842222d0abe2ddc0f56b0b5327fb972a991c86f9de5c028349dc7` (matches GitHub's uploaded asset digest).
