package expo.modules.moneynotifications

/** Parses bank SMS locally. Uncertain messages are review items, never booked money. */
object SmsPaymentParser {
  private val trusted = Regex("^(?:[A-Z]{2}-)?(?:HDFCBK|HDFCBN|SBIINB|SBIUPI|SBIPSG|SBIBNK|ICICIB|ICICIT|AXISBK|AXISB|KOTAKB|KOTAK|PNBSMS|PNBMSG|CANBNK|BOIIND|BOBTXN|IDFCFB|IDFCBK|UNIONB|INDBNK|IOBCHN|YESBNK|FEDSVC|FEDBNK|AUBANK|DBSSBK|SCBANK|CITIBK)(?:-[A-Z])?$", RegexOption.IGNORE_CASE)
  private val currency = "(?:₹|INR|Rs\\.?)\\s*[0-9][0-9,]*(?:\\.[0-9]+)?"
  private val direction = "(?:debit(?:ed)?|credited|paid|sent|spent|withdraw(?:n|al)?|purchase(?:d)?|received|dr|cr)"
  fun parse(sender:String, text:String):MoneyEvent? {
    // Reuse failure, pending, OTP, promotion and strict amount validation guards.
    if(Regex("\\b(?:timed?[\\s-]*out|timeout|unable|insufficient\\s+funds|not\\s+processed|could\\s+not|(?:will|would|may)\\s+be\\s+(?:credited|debited)|to\\s+be\\s+(?:credited|debited))\\b",RegexOption.IGNORE_CASE).containsMatchIn(text)) return null
    val base=MoneyParser.parse(text) ?: return null
    val bankTemplate=Regex("\\b(?:a/c|ac|acct|account|card|upi)\\b",RegexOption.IGNORE_CASE).containsMatchIn(text)
    if(!trusted.matches(sender) && !bankTemplate) return null
    if(base.isRefund || base.kind=="transfer") return base.copy(kind=if(base.kind=="transfer") "transfer" else "review")
    // Recipient-side credit wording does not prove income to the phone owner.
    if(Regex("\\b(?:received\\s+by\\s+(?:merchant|beneficiary|payee)|(?:beneficiary|payee|merchant)(?:\\s+(?:a/c|account))?\\s+(?:is\\s+|has\\s+been\\s+)?credited)\\b",RegexOption.IGNORE_CASE).containsMatchIn(text))return base.copy(kind="review")
    val debit=Regex("\\b(?:debit(?:ed)?|paid|sent|spent|withdraw(?:n|al)?|purchase(?:d)?|dr)\\b",RegexOption.IGNORE_CASE).containsMatchIn(text)
    val credit=Regex("\\b(?:credited|received|cr)\\b",RegexOption.IGNORE_CASE).containsMatchIn(text)
    if(debit==credit) return base.copy(kind="review")
    // A balance is also a currency amount. Only use an amount attached to a payment verb.
    val adjacent=Regex("(?:$currency)[^₹0-9.;]{0,28}\\b$direction\\b|\\b$direction\\b[^₹0-9.;]{0,28}(?:$currency)",RegexOption.IGNORE_CASE)
      .findAll(text).mapNotNull { MoneyParser.parse(it.value)?.amount }.distinct().toList()
    if(adjacent.size!=1) return base.copy(kind="review")
    return base.copy(amount=adjacent.single(),kind=if(trusted.matches(sender)) { if(debit) "expense" else "income" } else "review")
  }
}
