package expo.modules.moneynotifications

import android.app.NotificationManager
import android.app.RemoteInput
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONObject
import java.security.MessageDigest

/** Android's inline notification reply works without opening the app or overlays. */
class DebitReasonReceiver : BroadcastReceiver() {
  override fun onReceive(c: Context, intent: Intent) {
    val captureId=intent.getStringExtra("captureId") ?: return
    val reason=RemoteInput.getResultsFromIntent(intent)?.getCharSequence("debitReason")?.toString()?.trim() ?: return
    if (reason.isEmpty() || reason.length>200) return
    val digest=MessageDigest.getInstance("SHA-256").digest(reason.toByteArray()).joinToString("") { "%02x".format(it) }
    val event=JSONObject().put("id","reason:$captureId:$digest").put("kind","reason").put("captureId",captureId).put("reason",reason).put("timestamp",System.currentTimeMillis())
    // Only dismiss after a durable write. JS updates the original debit and
    // acknowledges the reply after its own ledger save, never adding a new debit.
    if (MoneyStore.enqueueReason(c,event)) c.getSystemService(NotificationManager::class.java).cancel(captureId.hashCode() and Int.MAX_VALUE)
  }
}
