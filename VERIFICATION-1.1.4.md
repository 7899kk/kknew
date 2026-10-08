# Pro Financer 1.1.4: dashboard and Galaxy J7 rebuild

## Changes

- Dashboard shows this month's budget balance: starting savings + monthly income − recorded expenses. Salary ₹1,00,000 and starting savings ₹1,000 show ₹1,01,000; adding an expense of ₹2,500 shows ₹98,500. Recorded income replaces planned monthly income when present to avoid counting the same salary twice. This is a local monthly budget estimate, not a queried bank balance.
- Goal savings reserve existing money instead of increasing net worth. Available spending money subtracts goal reserves and active recurring bills. Goal quick contributions are atomic, limited by the remaining target and available money; a custom savings amount is supported.
- Dreams show how much remains and a monthly saving suggestion based on 20% of monthly income left after recorded expenses and recurring bills. Dated goals show the required saving and a warning when the deadline needs more than monthly surplus.
- Text fields disable prediction and autofill. Username normalization occurs when saving instead of changing the text during typing. These changes reduce keyboard/autofill interference; Samsung keyboard behavior requires a device check.
- Expense notes can resolve an outstanding captured-debit reason. Investment tab and onboarding investment description are removed. Existing investment data is preserved.
- Removed unused camera, microphone, location, overlay, SMS, contacts, broad media-library and biometric permissions. Profile photo selection uses the system picker for one chosen image.
- J7 APK contains only 32-bit ARM native libraries, bundled JavaScript, the original logo and three payment sounds. Minimum Android version is 7/API 24. The APK includes a legacy v1 signature and its v2 signature is verified for Android 7–9 with the personal Android test key.

## Validation

Six TypeScript regression suites cover payment import/deduplication, debit reasons, finance validation, dashboard/goals, bill settlement and OAuth callbacks. Native Kotlin parser tests run during the ARM build. The release-screen test installs a separate 32-bit x86 release build on Android 7 and 9 emulators with 1536 MB RAM, checks name/username entry, salary plus savings, expense deduction, dream reservation and persistence after restart. APK archive integrity, manifest permissions, ABI, signing and SHA-256 are checked before publication.

The equivalent finance implementation in 1.1.3 passed six TypeScript suites, native parser tests, APK checks and full Android 7/9 release-screen flows. Version 1.1.4 adds safe-area spacing to prevent bottom tabs overlapping Android on-screen navigation buttons. This was found during screenshot review; Samsung models using hardware navigation keys are unaffected by that overlap.

Version 1.1.4 passed **all three jobs** in [run 37829823948](https://github.com/7899kk/kknew/actions/runs/37829823948): ARM build/verification, Android 7/9 screen tests, and release publication. TypeScript and all six regression suites passed; native parser tests passed during compilation. The screen tests verified name and username entry once, ₹1,01,000 initial balance, ₹98,500 after a ₹2,500 expense, ₹97,500 available after reserving ₹1,000 for a dream, and persistence after restart. Saved XML and screenshots were inspected; final tab controls sit above Android navigation buttons.

**[Download Pro-Financer-J7.apk](https://github.com/7899kk/kknew/releases/download/v1.1.4-j7/Pro-Financer-J7.apk)**. Version 1.1.4/code 6; package `com.profinancer.app`; minimum Android 7/API 24; 32-bit ARM only; 32,246,769 bytes. SHA-256 `a3a1f53b1302e3567ccb1633cd034abd8f32129f712456baa6f2303d7708cf96`. The GitHub release asset digest matches the downloaded, inspected build. Signing, checksum and manifest reports are attached to the release.

The APK requests only internet/network state, notifications, vibration and the app-specific protected dynamic-receiver permission. Its notification listener remains present. A legacy v1 signature is included and its v2 signature verifies for Android 7–9. It contains the standalone JavaScript bundle and all three payment sounds.

## Real-world boundaries

Automatic capture still requires Android notification access. Google Play Protect may restrict sideloaded apps that request it; removing unrelated permissions or signing the APK does not guarantee Google accepts the app. The emulator checks do not reproduce Play Protect or physical Samsung firmware, keyboard and battery restrictions. Do not bypass a security block. A Google review / Play Store distribution may be required.

Capture sees supported future payment notifications, never cash or every bank format. Notification sounds depend on Android sound/channel/DND settings. Live notification delivery, Samsung keyboard behavior and installation on the user's phone need device testing. Google sign-in remains disabled until the user's Supabase URL/public client key and Google provider are configured. No private credentials are bundled.
