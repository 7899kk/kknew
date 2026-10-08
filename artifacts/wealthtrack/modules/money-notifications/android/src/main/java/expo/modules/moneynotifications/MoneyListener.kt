package expo.modules.moneynotifications
import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.security.MessageDigest
import org.json.JSONObject

class MoneyListener : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (!MoneyStore.enabled(this)) return
    val sources=setOf("com.phonepe.app","net.one97.paytm","com.google.android.apps.nbu.paisa.user","in.org.npci.upiapp","com.sbi.SBIFreedomPlus","com.csam.icici.bank.imobile","com.snapwork.hdfc","com.axis.mobile")
    if(sbn.packageName !in sources || (sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0) return
    val extras=sbn.notification.extras
    val title=extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val body=(extras.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString().orEmpty()
    val text="$title $body"
    val parsed=MoneyParser.parse(text) ?: return
    // Ref key omits app source so the same UPI alert from bank + payment app is not counted twice.
    val fingerprint=parsed.fingerprint(sbn.packageName,sbn.key,sbn.postTime,text)
    val id=MessageDigest.getInstance("SHA-256").digest(fingerprint.toByteArray()).joinToString("") { "%02x".format(it) }
    val event=JSONObject().put("id",id).put("amount",parsed.amount).put("kind",parsed.kind).put("source",sbn.packageName).put("timestamp",sbn.postTime).put("reference",parsed.reference ?: JSONObject.NULL)
    if (MoneyStore.enqueue(this,event)) {
      // Alert failure never affects the durable payment queue.
      try { MoneyAlerts.show(this,event) } catch (_: Exception) {}
    }
  }
}
