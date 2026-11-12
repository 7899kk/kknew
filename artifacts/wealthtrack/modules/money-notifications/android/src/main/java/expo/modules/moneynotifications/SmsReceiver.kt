package expo.modules.moneynotifications
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import java.util.concurrent.Executors

class SmsReceiver:BroadcastReceiver(){
  companion object { private val executor=Executors.newSingleThreadExecutor() }
  override fun onReceive(context:Context,intent:Intent){
    if(intent.action!=Telephony.Sms.Intents.SMS_RECEIVED_ACTION || !SmsCapture.enabled(context)) return
    val messages=Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    val result=goAsync()
    executor.execute {
      try {
        messages.groupBy { it.originatingAddress.orEmpty() }.forEach { (sender,parts) ->
          SmsCapture.capture(context,sender,parts.joinToString(""){it.messageBody.orEmpty()},parts.first().timestampMillis)
        }
      } catch(_:Exception){MoneyStore.error(context,"Could not save a payment SMS. Reopen the app to sync.")}
      finally {result.finish()}
    }
  }
}
