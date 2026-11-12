# Pro Financer 1.3.0 verification

Source version 1.3.0, Android code 9, min SDK 24. Native publication is pending at this source commit.

Implemented compact Activity and bill groups, tap-to-open dashboard breakdowns, monthly dream allowance shared across goals, consistent brand/name headers, Dues naming and persistent profile photos. The bank SMS receiver is protected by Android's BROADCAST_SMS sender permission. READ_SMS and RECEIVE_SMS are requested through Expo's runtime permission manager after a branded consent panel. SEND_SMS, default SMS role, contacts and broad gallery permissions are not requested.

SMS parsing reuses strict currency/failure/OTP checks, recognizes trusted bank senders and binds transaction amounts to debit/credit verbs so available balances cannot become payments. Unknown bank-like sender messages, unclear directions, refunds and transfers stay in review outside totals. Multipart messages are joined before parsing. Raw SMS bodies are ephemeral. Inbox recovery starts at opt-in, retains its cursor on storage failure/full queues and reuses durable capture IDs and reference conflicts. SMS capture disables legacy notification capture.

Local checks:

- TypeScript typecheck passed.
- Finance regressions and SQLite/encryption/share/replay stress tests passed, including previous-month saving plans, first-month estimates, shared goal allocation and SMS source/time imports.
- 47 native notification-parser cases and 31 bank SMS cases passed. Native SMS receiver, recovery, queue and alerts compile against Android SDK 36. Full module/APK compilation and device checks are recorded below once completed.
- Expo web export and Chromium financial workflows passed. Extended UI checks cover dashboard breakdowns, tab headers, profile image selection and restart, styled tracking settings, group member chips, sharing/approval/repayment and encrypted backup/restore.

The emulator SMS test uses actual telephony delivery, permission consent, duplicate/failure/OTP checks, debit naming, background delivery and restart. Where an emulator rejects alphanumeric sender IDs, a numeric sender requires review; trusted sender auto-booking is covered by pure Kotlin cases. These fixtures do not establish support for every real bank SMS format. Physical Samsung installation, denied permissions, OEM battery limits and real bank variants still need phone checks.

The APK is a preview signed with the Android public test key; production signing and any app-store SMS permission review remain separate release work.
