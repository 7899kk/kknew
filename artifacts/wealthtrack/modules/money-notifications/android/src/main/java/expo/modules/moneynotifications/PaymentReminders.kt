package expo.modules.moneynotifications

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/** One inexact daily alarm: no server, exact-alarm permission or background JS required. */
object PaymentReminders {
  private fun prefs(c:Context)=c.getSharedPreferences("payment_reminders",Context.MODE_PRIVATE)
  private fun intent(c:Context)=PendingIntent.getBroadcast(c,9091,Intent(c,PaymentReminderReceiver::class.java),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  private val dateFormat get()=SimpleDateFormat("yyyy-MM-dd",Locale.US).apply{isLenient=false}
  fun enabled(c:Context)=prefs(c).getBoolean("enabled",false)
  @Synchronized fun sync(c:Context,enabled:Boolean,raw:String){
    val items=JSONArray(raw)
    require(items.length()<=5000){"Too many payment reminders"}
    for(i in 0 until items.length()){
      val item=items.getJSONObject(i)
      require(item.getString("id").length in 1..240 && item.getString("title").length in 1..550)
      val date=item.getString("dueDate");require(date.matches(Regex("\\d{4}-\\d{2}-\\d{2}"))&&dateFormat.format(requireNotNull(dateFormat.parse(date)))==date)
      val amount=item.getDouble("amount");require(amount.isFinite()&&amount>0&&amount<=1e12)
    }
    check(prefs(c).edit().putBoolean("enabled",enabled).putString("items",items.toString()).commit())
    (c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(9091)
    schedule(c)
  }
  fun schedule(c:Context){
    val alarm=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    if(!enabled(c)){alarm.cancel(intent(c));return}
    val next=Calendar.getInstance().apply{set(Calendar.HOUR_OF_DAY,9);set(Calendar.MINUTE,0);set(Calendar.SECOND,0);set(Calendar.MILLISECOND,0);if(timeInMillis<=System.currentTimeMillis())add(Calendar.DAY_OF_MONTH,1)}
    // Android may defer this slightly for battery saving. No exact-time promise.
    alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next.timeInMillis,intent(c))
  }
  @Synchronized fun deliver(c:Context,force:Boolean=false){
    if(!enabled(c))return
    val today=dateFormat.format(Calendar.getInstance().time)
    if((!force&&prefs(c).getString("lastDay","")==today)||!MoneyAlerts.allowed(c))return
    val week=Calendar.getInstance().apply{add(Calendar.DAY_OF_MONTH,7)};val end=dateFormat.format(week.time)
    val items=JSONArray(prefs(c).getString("items","[]"));val lines=mutableListOf<String>()
    val money=NumberFormat.getCurrencyInstance(Locale("en","IN"))
    for(i in 0 until items.length()){val item=items.getJSONObject(i);if(item.getString("dueDate")<=end){lines.add(item.getString("title")+" · "+money.format(item.getDouble("amount"))+" · due "+item.getString("dueDate"))}}
    if(lines.isEmpty())return
    val manager=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel="payment_due_reminders"
    if(Build.VERSION.SDK_INT>=26){manager.createNotificationChannel(NotificationChannel(channel,"Payment due reminders",NotificationManager.IMPORTANCE_DEFAULT));if(manager.getNotificationChannel(channel)?.importance==NotificationManager.IMPORTANCE_NONE)return}
    val launch=(c.packageManager.getLaunchIntentForPackage(c.packageName) ?: return).apply{flags=Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP}
    val pending=PendingIntent.getActivity(c,9091,launch,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val builder=if(Build.VERSION.SDK_INT>=26)Notification.Builder(c,channel)else Notification.Builder(c)
    val body=lines.take(6).joinToString("\n")+(if(lines.size>6)"\n+${lines.size-6} more payments" else "")
    manager.notify(9091,builder.setSmallIcon(R.drawable.money_notification).setContentTitle("Payments due · ${lines.size}").setContentText(lines.first()).setStyle(Notification.BigTextStyle().bigText(body)).setContentIntent(pending).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).setPublicVersion((if(Build.VERSION.SDK_INT>=26)Notification.Builder(c,channel)else Notification.Builder(c)).setSmallIcon(R.drawable.money_notification).setContentTitle("Pro Financer").setContentText("Payment reminder").build()).build())
    check(prefs(c).edit().putString("lastDay",today).commit())
  }
  fun clear(c:Context){sync(c,false,"[]");check(prefs(c).edit().clear().commit())}
}
class PaymentReminderReceiver:BroadcastReceiver(){
  override fun onReceive(context:Context,intent:Intent){try{if(intent.action==null)PaymentReminders.deliver(context);PaymentReminders.schedule(context)}catch(e:Exception){android.util.Log.e("PaymentReminders","Unable to deliver or schedule payment reminders",e)}}
}
