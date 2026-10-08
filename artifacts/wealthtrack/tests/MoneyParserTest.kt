import expo.modules.moneynotifications.MoneyParser
import expo.modules.moneynotifications.fingerprint
fun main() {
  val cases=listOf(
    Triple("₹ 250.50 debited. UPI Ref: 123456789012", "expense", 250.50),
    Triple("INR 1,00,000 received. UTR: ABCD123456", "income", 100000.0),
    Triple("Rs. 1,,200 debited. UTR: ABCD123456", "skip", 0.0),
    Triple("INR 12,34 debited. UTR: ABCD123456", "skip", 0.0),
    Triple("INR 100 payment not successful. UTR: ABCD123456", "skip", 0.0),
    Triple("INR 100 not received. UTR: ABCD123456", "skip", 0.0),
    Triple("INR 100 paid. Reference number: ABCD123456", "expense", 100.0),
    Triple("INR 100 paid. Ref: merchant", "review", 100.0),
    Triple("INR 100 paid. Reference: 1234567890123456789012345678901234567890123", "review", 100.0),
    Triple("INR 250.50 debited. UPI Ref: 123456789012", "expense", 250.50),
    Triple("Rs. 1,200 received. UTR: ABCD123456", "income", 1200.0),
    Triple("You paid ₹100. Transaction ID: ABC123456", "expense", 100.0),
    Triple("INR 150 credited. Ref: 987654321123", "income", 150.0),
    Triple("INR 200 debited. Available balance INR 4000. Ref: ABC123456", "review", 200.0),
    Triple("₹100 refunded. UTR: ABC123456", "review", 100.0),
    Triple("Cashback ₹10 credited. UTR: ABC123456", "review", 10.0),
    Triple("Own account transfer INR 500 debited. UTR: ABC123456", "transfer", 500.0),
    Triple("₹200 debited", "review", 200.0),
    Triple("INR 20 payment update", "review", 20.0),
    Triple("INR 100 credited and debited. Ref: ABC123456", "review", 100.0),
    Triple("INR 100 payment failed. Ref: ABC123456", "skip", 0.0),
    Triple("INR 100 payment pending. Ref: ABC123456", "skip", 0.0),
    Triple("INR 100 processing. Ref: ABC123456", "skip", 0.0),
    Triple("INR 100 paid declined. Ref: ABC123456", "skip", 0.0),
    Triple("OTP 112233 to pay INR 100. Ref: ABC123456", "skip", 0.0),
    Triple("Verification code 222333 INR 100", "skip", 0.0),
    Triple("Offer INR 100 when you paid", "skip", 0.0),
    Triple("You sent a request for INR 100. Ref: ABC123456", "skip", 0.0),
    Triple("INR 0 debited. Ref: ABC123456", "skip", 0.0),
    Triple("INR 999999999999 debited. Ref: ABC123456", "skip", 0.0),
    Triple("Hello, friend", "skip", 0.0),
    Triple("INR 1.234 debited. Ref: ABC123456", "skip", 0.0)
  )
  for((text,kind,amount) in cases){
    val event=MoneyParser.parse(text)
    check((event?.kind ?: "skip")==kind) { "Expected $kind for $text; got $event" }
    if(event!=null) check(event.amount==amount) { "Wrong amount: $event" }
  }
  check(MoneyParser.parse("INR 10 paid. UTR: abc123456")?.reference=="ABC123456")
  val paid=checkNotNull(MoneyParser.parse("INR 100 paid. UTR: ABC123456"))
  val duplicate=checkNotNull(MoneyParser.parse("INR 100 debited. UTR: ABC123456"))
  val refunded=checkNotNull(MoneyParser.parse("INR 100 refunded. UTR: ABC123456"))
  val paymentKey=paid.fingerprint("phonepe","1",1000,"payment")
  check(paymentKey=="ref:ABC123456:100.0") // Stable IDs when updating an existing installation.
  check(paymentKey==duplicate.fingerprint("bank","2",2000,"duplicate"))
  check(paymentKey!=refunded.fingerprint("bank","3",3000,"refund"))
  check(refunded.fingerprint("bank","3",3000,"refund")==refunded.fingerprint("phonepe","4",4000,"duplicate refund"))
  println("${cases.size + 1} native parser cases and refund/dedup fingerprint regressions passed")
}
