# Pro Financer 1.1.3: dashboard and Galaxy J7 rebuild

## Changes

- Dashboard shows this month's budget balance: starting savings + monthly income − recorded expenses. Salary ₹1,00,000 and starting savings ₹1,000 show ₹1,01,000; adding an expense of ₹2,500 shows ₹98,500. Recorded income replaces planned monthly income when present to avoid counting the same salary twice. This is a local monthly budget estimate, not a queried bank balance.
- Goal savings reserve existing money instead of increasing net worth. Available spending money subtracts goal reserves and active recurring bills. Goal quick contributions are atomic, limited by the remaining target and available money; a custom savings amount is supported.
- Dreams show how much remains and a monthly saving suggestion based on 20% of monthly income left after recorded expenses and recurring bills. Dated goals show the required saving and a warning when the deadline needs more than monthly surplus.
- Text fields disable prediction and autofill. Username normalization occurs when saving instead of changing the text during typing. This addresses common Android controlled-input composition problems; a Samsung keyboard requires a device check.
- Expense notes can resolve an outstanding captured-debit reason. Investment tab and onboarding investment description are removed. Existing investment data is preserved.
- Removed unused camera, microphone, location, overlay, SMS, contacts, broad media-library and biometric permissions. Profile photo selection uses the system picker for one chosen image.
- J7 APK contains only 32-bit ARM native libraries, bundled JavaScript, the original logo and three payment sounds. Minimum Android version is 7/API 24. The workflow verifies v1/v2 signing for Android 7–9 with the personal Android test key.

## Validation

Six TypeScript regression suites cover payment import/deduplication, debit reasons, finance validation, dashboard/goals, bill settlement and OAuth callbacks. Native Kotlin parser tests run during the ARM build. The release-screen test installs a separate 32-bit x86 release build on Android 7 and 9 emulators with 1536 MB RAM, checks name/username entry, salary plus savings, expense deduction, dream reservation and persistence after restart. APK archive integrity, manifest permissions, ABI, signing and SHA-256 are checked before publication.

Current check results and screenshots are in the [build workflow](https://github.com/7899kk/kknew/actions/workflows/android-apk.yml). Publication is gated on the ARM APK job and both Android screen checks. Pending or failing checks do not mean an APK is verified.

## Real-world boundaries

Automatic capture still requires Android notification access. Google Play Protect may restrict sideloaded apps that request it; removing unrelated permissions or signing the APK does not guarantee Google accepts the app. The emulator checks do not reproduce Play Protect or physical Samsung firmware, keyboard and battery restrictions. Do not bypass a security block. A Google review / Play Store distribution may be required.

Capture sees supported future payment notifications, never cash or every bank format. Notification sounds depend on Android sound/channel/DND settings. Live notification delivery, Samsung keyboard behavior and installation on the user's phone need device testing. Google sign-in remains disabled until the user's Supabase URL/public client key and Google provider are configured. No private credentials are bundled.
