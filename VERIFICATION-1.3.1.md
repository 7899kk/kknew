# Pro Financer 1.3.1 verification

**[Download the published APK](https://github.com/7899kk/kknew/releases/download/v1.3.1-j7/Pro-Financer-J7.apk)**. Version 1.3.1, Android code 10. App source: `84092f2bb6aae1b37fa9fedd0909c563267b0748`.

The dashboard restores the original 1.2.0 layout: decorated balance card, three figures within that card, smaller summary cards, finance pie chart, top goal and recent expenses. Explanatory paragraphs are removed. Balance, income, expenses, savings, available money, debts and the chart open detailed views. Balance details also link to the other breakdowns. The existing first-month/previous-month saving suggestions remain inside the original goal card.

Bill split restores the previous group-name and comma-separated member-names form. Its modal ScrollView keeps button taps while the keyboard is open, so a tap reaches Save. Existing groups, shared files, repayments, SMS capture and profile photos retain their data formats and behaviour.

Local verification passed: TypeScript, financial/SQLite/encryption/replay regressions and Chromium flows for every dashboard metric, the restored SVG graph, detail navigation, member entry, shared groups, repayments, profile photos and encrypted backup/restore. Screenshots were captured after entry animations and modal transitions completed.

Android verification passed. The device flow saves a group with the real soft keyboard open, checks all member names and confirms the group after restart. It also retains the existing finance and real emulator SMS checks.

## Native build, device tests and publication

- [Build run](https://github.com/7899kk/kknew/actions/runs/43168602605): standalone ARM32/ARM64 APK and x86/x86_64 emulator APK built, native parser tests passed, and signatures/manifest checked. Android 7 confirmed one-tap group saving and member persistence; the old SMS driver then expected the redesigned dashboard's exact text label.
- [Full recheck and publication](https://github.com/7899kk/kknew/actions/runs/43170906969): Android 7/API 24, Android 9/API 28 and Android 16/API 36 all passed. Only the driver changed: it finds the dashboard using the stable available-balance card action, then checks the same money totals. Source/dependency comparison verified the reused compiled app; no app code or assertions on totals were removed.
- Each platform saved the Weekend group with Arun, Priya and Karthik while the soft keyboard was open, and found the group and names after restart. Finance balance/reservation checks and actual bank SMS consent, debit/credit, duplicate/failure/OTP filtering, debit reasons, background delivery and persistence also passed.
- GitHub's finance and Chromium checks passed on the restored source and the final driver commit.
- The published public APK downloaded successfully without authentication. Size: **57,881,573 bytes**. Package `com.profinancer.app`, version `1.3.1` / code `10`, min SDK `24`, target SDK `36`, ABIs `armeabi-v7a` and `arm64-v8a`. SMS receiver and requested read/receive permissions passed the manifest guard.
- Signatures verify for Android API 24 through 36. Signing certificate matches the earlier previews: SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

APK SHA-256: `9c5af3e870976281425e5954b6271dce44d0841a7f942470740ed36f821db932` (matches GitHub's uploaded asset digest).

This remains a personal preview signed with the Android public test key. Physical-phone installation and real bank message variations still need phone checks.
