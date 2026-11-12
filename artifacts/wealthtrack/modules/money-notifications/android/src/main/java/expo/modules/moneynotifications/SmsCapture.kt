package expo.modules.moneynotifications

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import org.json.JSONObject
import java.security.MessageDigest

object SmsCapture {
  private fun prefs(c:Context)=c.getSharedPreferences("money_sms_capture",Context.MODE_PRIVATE)
  fun granted(c:Context)=c.checkSelfPermission(Manifest.permission.READ_SMS)==PackageManager.PERMISSION_GRANTED && c.checkSelfPermission(Manifest.permission.RECEIVE_SMS)==PackageManager.PERMISSION_GRANTED
  fun enabled(c:Context)=prefs(c).getBoolean("enabled",false)
  fun status(c:Context)=mapOf("smsGranted" to granted(c),"smsEnabled" to enabled(c),"smsSetupHandled" to prefs(c).getBoolean("setup",false))
  @Synchronized fun setupHandled(c:Context){check(prefs(c).edit().putBoolean("setup",true).commit())}
  @Synchronized fun setEnabled(c:Context,value:Boolean){
    if(value) check(granted(c)){"SMS permission is required"}
    val edit=prefs(c).edit().putBoolean("enabled",value).putBoolean("setup",true)
    if(value && !enabled(c)) edit.putLong("since",System.currentTimeMillis()).putLong("cursor",0)
    check(edit.commit()) { "Could not save SMS settings" }
    if(value) MoneyStore.setEnabled(c,false)
  }
  @Synchronized fun clear(c:Context){check(prefs(c).edit().clear().commit())}
  @Synchronized fun capture(c:Context,sender:String,body:String,timestamp:Long){
    if(!enabled(c)||!granted(c)) return
    MoneyStore.observed(c)
    val parsed=SmsPaymentParser.parse(sender,body) ?: return
    val source="sms:"+sender.uppercase()
    val fingerprint=parsed.fingerprint(source,sender.uppercase(),timestamp,body)
    val id=MessageDigest.getInstance("SHA-256").digest(fingerprint.toByteArray()).joinToString(""){"%02x".format(it)}
    val event=JSONObject().put("id",id).put("amount",parsed.amount).put("kind",parsed.kind).put("source",source).put("timestamp",timestamp).put("reference",parsed.reference ?: JSONObject.NULL)
    if(MoneyStore.enqueue(c,event)) try{MoneyAlerts.show(c,event)}catch(_:Exception){}
  }
  /** Recover only inbox messages arriving since opt-in; cursor advances after durable processing. */
  @Synchronized fun recover(c:Context){
    if(!enabled(c)||!granted(c)) return
    val p=prefs(c)
    try {
      c.contentResolver.query(Uri.parse("content://sms/inbox"),arrayOf("_id","address","body","date","date_sent"),"_id > ? AND date >= ?",arrayOf(p.getLong("cursor",0).toString(),p.getLong("since",Long.MAX_VALUE).toString()),"_id ASC")?.use { rows ->
        var count=0
        while(count++<200 && rows.moveToNext()) {
          if(MoneyStore.pending(c).length()>=2000) break
          val sent=rows.getLong(4)
          capture(c,rows.getString(1).orEmpty(),rows.getString(2).orEmpty(),if(sent>0)sent else rows.getLong(3))
          check(p.edit().putLong("cursor",rows.getLong(0)).commit())
        }
      }
    } catch(_:Exception){MoneyStore.error(c,"SMS sync paused. Check SMS permission and storage.")}
  }
}
