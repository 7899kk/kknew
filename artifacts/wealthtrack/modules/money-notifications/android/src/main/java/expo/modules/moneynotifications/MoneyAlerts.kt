package expo.modules.moneynotifications

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import org.json.JSONObject

object MoneyAlerts {

  fun allowed(c:Context):Boolean {
    if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) return false
    return c.getSystemService(NotificationManager::class.java).areNotificationsEnabled()
  }
  fun show(c:Context,event:JSONObject):Boolean {
    if (!MoneyStore.alertsEnabled(c) || !allowed(c)) return false
    val kind=event.optString("kind")
    val credit=kind=="income" || kind=="test-income"
    val debit=kind=="expense" || kind=="test-expense"
    val channel=if(credit) "payment_income_v2" else if(debit) "payment_expense_v2" else "payment_review_v2"
    val channelName=if(credit) "Money received" else if(debit) "Money sent" else "Payments needing review"
    val soundName=if(credit) "money_received" else if(debit) "money_sent" else "money_review"
    val sound=Uri.parse("android.resource://${c.packageName}/raw/$soundName")
    val audio=android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
    val manager=c.getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= 26) {
      manager.createNotificationChannel(NotificationChannel(channel,channelName,NotificationManager.IMPORTANCE_HIGH).apply { description="New captured payments and items needing review"; lockscreenVisibility=Notification.VISIBILITY_PRIVATE; setSound(sound,audio) })
      if (manager.getNotificationChannel(channel)?.importance == NotificationManager.IMPORTANCE_NONE) return false
    }
    val title=when(kind) { "income" -> "Money received"; "expense" -> "Money debited"; "test-income" -> "Test: money received sound"; "test-expense" -> "Test: money sent sound"; "test" -> "Payment alerts are ready"; else -> "Payment needs review" }
    val amount=java.text.NumberFormat.getCurrencyInstance(java.util.Locale.forLanguageTag("en-IN")).apply { currency=java.util.Currency.getInstance("INR") }.format(event.optDouble("amount"))
    val text=when(kind) {
      "income" -> "$amount captured. Tap to name it Salary or another income."
      "expense" -> "$amount debited. What was it for? Tap to add a reason."
      "test", "test-income", "test-expense" -> "This is a sound test. No transaction was added."
      else -> "$amount needs your confirmation before it counts in totals."
    }
    val launch=c.packageManager.getLaunchIntentForPackage(c.packageName) ?: return false
    launch.data=Uri.parse("profinancer://activity")
    launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    val id=event.getString("id").hashCode() and Int.MAX_VALUE
    val pending=PendingIntent.getActivity(c,id,launch,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val builder=if(Build.VERSION.SDK_INT>=26) Notification.Builder(c,channel) else Notification.Builder(c)
    manager.notify(id,builder.setPriority(Notification.PRIORITY_HIGH).setSound(sound,audio).setLargeIcon(android.graphics.BitmapFactory.decodeResource(c.resources,R.drawable.money_logo)).setSmallIcon(R.drawable.money_notification).setContentTitle(title).setContentText(text).setStyle(Notification.BigTextStyle().bigText(text)).setContentIntent(pending).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).setPublicVersion((if(Build.VERSION.SDK_INT>=26) Notification.Builder(c,channel) else Notification.Builder(c)).setSmallIcon(R.drawable.money_notification).setContentTitle("Pro Financer").setContentText("New payment activity").build()).build())
    return true
  }
}
