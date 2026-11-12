import expo.modules.moneynotifications.SmsReceipt
import expo.modules.moneynotifications.SmsReceiptIdentity
import expo.modules.moneynotifications.SmsPaymentParser
import expo.modules.moneynotifications.MoneyParser
import expo.modules.moneynotifications.fingerprint
fun main() {
  val cases=listOf(
    Triple("PhonePe You paid Rs.1,234.56 UPI Ref No: 912345678901", "expense", 1234.56),
    Triple("Paytm Received ₹500 from a friend. UPI Ref: 912345678902", "income", 500.0),
    Triple("Google Pay ₹250 sent. UPI transaction ID: 912345678903", "expense", 250.0),
    Triple("BHIM INR 100 paid. UTR: 912345678904", "expense", 100.0),
    Triple("SBI a/c XX1234 debited INR 200. Ref No: 912345678905", "expense", 200.0),
    Triple("ICICI INR 350 credited. Transaction ID: 912345678906", "income", 350.0),
    Triple("HDFC Rs. 1,00,000 credited. UTR: 912345678907", "income", 100000.0),
    Triple("Axis INR 450 debited. Ref: 912345678908", "expense", 450.0),
    Triple("INR 100 credited. Balance INR 5000. Ref: ABC123456", "review", 100.0),
    Triple("INR 100 reversed. Ref: ABC123456", "review", 100.0),
    Triple("INR 100 scheduled payment. Ref: ABC123456", "skip", 0.0),
    Triple("INR 100 never successfully received. Ref: ABC123456", "skip", 0.0),
    Triple("INR .50 debited. Ref: ABC123456", "skip", 0.0),
    Triple("INR 1,00,00,000.25 credited. UTR: ABC123456", "income", 10000000.25),
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
  val smsCases=listOf(
    Triple("INR 1,500 debited from A/c XX1234. Avl Bal INR 40,500. Ref: ABC123456", "expense",1500.0),
    Triple("Your a/c credited by Rs. 10,000. Available balance Rs. 90,000", "income",10000.0),
    Triple("Available balance INR 40,500. INR 200 debited from account XX1234", "expense",200.0),
    Triple("Rs. 1,00,000.50 credited to A/c XX1234", "income",100000.50),
    Triple("A/c XX1234 debited with INR 250.50 on 12-Nov", "expense",250.50),
    Triple("INR 200 spent using card XX1234. Avl bal INR 20000", "expense",200.0),
    Triple("INR 500 withdrawn from account XX1234", "expense",500.0),
    Triple("INR 500 credited and INR 100 debited in a/c", "review",500.0),
    Triple("A/c XX1234 transaction INR 500", "review",500.0),
    Triple("INR 100 refunded to account XX1234", "review",100.0),
    Triple("Own account transfer INR 500 debited", "transfer",500.0),
    Triple("INR 500 debited. Payment failed", "skip",0.0),
    Triple("INR 500 debited. Status: FAIL", "skip",0.0),
    Triple("INR 500 debited. Transaction FAILURE", "skip",0.0),
    Triple("INR 500 debited. Payment rejected", "skip",0.0),
    Triple("INR 500 debited. Transaction aborted", "skip",0.0),
    Triple("INR 500 debited unsuccessfully", "skip",0.0),
    Triple("INR 500 debited. Transaction timed-out", "skip",0.0),
    Triple("INR 500 debit pending in a/c", "skip",0.0),
    Triple("INR 500 paid. Transaction timed out", "skip",0.0),
    Triple("INR 500 credited but not processed", "skip",0.0),
    Triple("INR 500 will be credited to account", "skip",0.0),
    Triple("INR 500 to be debited from account", "skip",0.0),
    Triple("OTP 123456 to pay INR 100", "skip",0.0),
    Triple("INR 1,,000 debited", "skip",0.0),
    Triple("INR 1.234 credited", "skip",0.0)
  )
  for((text,kind,amount) in smsCases){
    val event=SmsPaymentParser.parse("VM-HDFCBK",text)
    check((event?.kind ?: "skip")==kind){"SMS expected $kind for $text; got $event"}
    if(event!=null) check(event.amount==amount){"SMS wrong amount: $event"}
  }
  check(SmsPaymentParser.parse("+919876543210","INR 200 paid for dinner")==null)
  check(SmsPaymentParser.parse("+919876543210","INR 200 debited from account XX1234")?.kind=="review")
  check(SmsPaymentParser.parse("AD-UNKNWN","INR 200 debited from account XX1234")?.kind=="review")
  check(SmsPaymentParser.parse("AD-SBIINB-S","INR 200 debited from account XX1234")?.kind=="expense")
  check(SmsPaymentParser.parse("HDFCBK","INR 200 debited from account XX1234")?.kind=="expense")
  println("${smsCases.size + 5} bank SMS checks passed: direction, separate balances, no-reference, sender trust, malformed amounts, failed/pending/future payments and OTPs")
  check(SmsReceiptIdentity.bank("VM-HDFCBK")==SmsReceiptIdentity.bank("AD-HDFCBN-S"))
  check(SmsReceiptIdentity.account("A/c XX1234 credited INR 100")=="1234")
  check(SmsReceiptIdentity.balance("Avl Bal INR 90,000.50")==90000.5)
  val receipt=SmsReceipt("original","HDFC","1234",5000.0,1000.0,"income","REF1000001",1000000)
  check(SmsReceiptIdentity.possibleDuplicate(receipt.copy(id="same-ref",timestamp=1001000),listOf(receipt))==null)
  check(SmsReceiptIdentity.possibleDuplicate(receipt.copy(id="repeat",reference="REF1000002",timestamp=1001000),listOf(receipt))?.id=="original")
  check(SmsReceiptIdentity.possibleDuplicate(receipt.copy(id="new-credit",reference="REF1000003",balance=6000.0,timestamp=1001000),listOf(receipt))==null)
  check(SmsReceiptIdentity.possibleDuplicate(receipt.copy(id="other-account",reference="REF1000004",account="5678",timestamp=1001000),listOf(receipt))==null)
  check(SmsReceiptIdentity.possibleDuplicate(receipt.copy(id="other-bank",reference="REF1000005",bank="SBI",timestamp=1001000),listOf(receipt))==null)
  check(SmsReceiptIdentity.possibleDuplicate(receipt.copy(id="later",reference="REF1000006",timestamp=87400001),listOf(receipt))==null)
  check(SmsReceiptIdentity.possibleDuplicate(receipt.copy(id="no-ref",reference=null,timestamp=1001000),listOf(receipt))?.id=="original")
  println("10 bank receipt identity checks passed: bank aliases, masked accounts, balance parsing, repeated alerts, distinct credits and review safety")
  println("${cases.size + 1} native parser cases and refund/dedup fingerprint regressions passed")
}
