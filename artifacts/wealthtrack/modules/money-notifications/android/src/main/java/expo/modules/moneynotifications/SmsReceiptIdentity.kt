package expo.modules.moneynotifications

import kotlin.math.abs

data class SmsReceipt(val id:String,val bank:String,val account:String?,val balance:Double?,val amount:Double,val kind:String,val reference:String?,val timestamp:Long)
/** Metadata only. Distinct references are never silently discarded on an amount match. */
object SmsReceiptIdentity {
  fun bank(sender:String):String {
    val code=sender.uppercase().replace(Regex("^[A-Z]{2}-"),"").replace(Regex("-[A-Z]$"),"")
    return when(code){"HDFCBK","HDFCBN"->"HDFC";"SBIINB","SBIUPI","SBIPSG","SBIBNK"->"SBI";"ICICIB","ICICIT"->"ICICI";"AXISBK","AXISB"->"AXIS";"KOTAKB","KOTAK"->"KOTAK";else->code}
  }
  fun account(body:String):String? = Regex("\\b(?:a/c|ac|acct|account|card)(?:\\s*(?:no\\.?|number|ending(?:\\s+in)?))?\\s*[:.-]?\\s*([Xx*•0-9-]{4,30})(?![A-Za-z0-9])",RegexOption.IGNORE_CASE).find(body)?.groupValues?.get(1)?.filter{it.isDigit()}?.takeLast(4)?.takeIf{it.length>=2}
  fun balance(body:String):Double? = Regex("\\b(?:avl\\.?\\s*bal(?:ance)?|avail(?:able)?\\s*bal(?:ance)?|closing\\s*balance|balance|bal)\\s*[:.-]?\\s*(?:₹|INR|Rs\\.?)\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)(?![0-9,]|\\.[0-9])",RegexOption.IGNORE_CASE).find(body)?.groupValues?.get(1)?.replace(",","")?.toDoubleOrNull()?.takeIf{it.isFinite()&&it>=0&&it<=1e12}
  fun possibleDuplicate(current:SmsReceipt,recent:List<SmsReceipt>):SmsReceipt? {
    if(current.kind!="income"&&current.kind!="expense")return null
    return recent.asReversed().firstOrNull { old ->
      old.id!=current.id && old.kind==current.kind && old.bank==current.bank && old.amount==current.amount && abs(old.timestamp-current.timestamp)<=(if(old.account!=null&&old.account==current.account&&old.balance!=null&&old.balance==current.balance)86400000 else 600000) &&
      !(old.reference!=null && old.reference==current.reference) &&
      !(old.account!=null && current.account!=null && old.account!=current.account) &&
      !(old.balance!=null && current.balance!=null && old.balance!=current.balance)
    }
  }
}
