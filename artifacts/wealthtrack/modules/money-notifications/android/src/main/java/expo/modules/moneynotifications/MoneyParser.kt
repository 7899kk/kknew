package expo.modules.moneynotifications

// Pure parser: no Android dependencies, network, OTPs, or raw notification retention.
data class MoneyEvent(val amount: Double, val kind: String, val reference: String?, val isRefund: Boolean = false)
object MoneyParser {
  private val money = Regex("(?:₹|INR|Rs\\.?)\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)(?![0-9,]|\\.[0-9])", RegexOption.IGNORE_CASE)
  private val amountFormat = Regex("(?:[0-9]+|[1-9][0-9]{0,2}(?:,[0-9]{3})+|[1-9][0-9]?(?:,[0-9]{2})*,[0-9]{3})(?:\\.[0-9]{1,2})?")
  fun parse(text: String): MoneyEvent? {
    if (Regex("\\b(otp|one.time.password|verification.code|authentication.code|promo|offer|cashback.offer)\\b", RegexOption.IGNORE_CASE).containsMatchIn(text)) return null
    if (Regex("\\b(failed|declined|unsuccessful|cancelled|canceled|pending|processing|requested|request|request.to.pay|due|reminder|mandate|scheduled)\\b", RegexOption.IGNORE_CASE).containsMatchIn(text)) return null
    if (Regex("\\b(?:not|never)\\s+(?:(?:yet|been|successfully)\\s+)*(?:successful|completed|paid|sent|received|credited|debited)\\b", RegexOption.IGNORE_CASE).containsMatchIn(text)) return null
    val rawAmounts = money.findAll(text).map { it.groupValues[1] }.toList()
    if (rawAmounts.isEmpty() || rawAmounts.any { !amountFormat.matches(it) }) return null
    val amounts = rawAmounts.map { it.replace(",", "").toDoubleOrNull() ?: return null }
    // Multiple currency amounts may include an account balance: review rather than guess.
    val amount = amounts.first()
    if (!amount.isFinite() || amount <= 0.0 || amount > 1_000_000_000.0) return null
    val debit = Regex("\\b(debited|paid|sent|payment.successful|payment.completed)\\b", RegexOption.IGNORE_CASE).containsMatchIn(text)
    val credit = Regex("\\b(credited|received)\\b", RegexOption.IGNORE_CASE).containsMatchIn(text)
    val refund = Regex("\\b(refund|refunded|reversal|reversed|cashback)\\b", RegexOption.IGNORE_CASE).containsMatchIn(text)
    val transfer = Regex("\\b(self.transfer|own.account|between.your.accounts)\\b", RegexOption.IGNORE_CASE).containsMatchIn(text)
    val ref = Regex("\\b(?:UTR|UPI\\s*Ref(?:erence)?|Txn|Transaction|Ref(?:erence)?)(?:\\s*(?:number|no\\.?|id))?\\s*[:#.-]?\\s*([A-Za-z0-9]{6,40})(?![A-Za-z0-9])", RegexOption.IGNORE_CASE).find(text)?.groupValues?.get(1)?.takeIf { it.any(Char::isDigit) }?.uppercase()
    val kind = when {
      transfer -> "transfer"
      refund -> "review"
      amounts.size != 1 || debit == credit || ref == null -> "review"
      debit -> "expense"
      else -> "income"
    }
    return MoneyEvent(amount, kind, ref, refund)
  }
}

// Keep ordinary IDs compatible with earlier APKs, but a refund is a separate event.
fun MoneyEvent.fingerprint(source:String,key:String,postTime:Long,text:String):String =
  reference?.let { "ref:$it:$amount" + if(isRefund) ":refund" else "" }
    ?: "$source:$key:${postTime/300000}:${text.trim()}"
