package expo.modules.moneynotifications
import android.content.Intent
import android.content.ComponentName
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MoneyNotificationsModule : Module() {
  private fun context() = requireNotNull(appContext.reactContext)
  override fun definition() = ModuleDefinition {
    Name("MoneyNotifications")
    AsyncFunction("status") {
      val c=context(); val component=ComponentName(c,MoneyListener::class.java).flattenToString()
      val granted=Settings.Secure.getString(c.contentResolver,"enabled_notification_listeners")?.split(":")?.contains(component) == true
      mapOf("granted" to granted,"enabled" to MoneyStore.enabled(c),"overflow" to MoneyStore.overflow(c),"notificationsGranted" to MoneyAlerts.allowed(c),"alertsEnabled" to MoneyStore.alertsEnabled(c))
    }
    AsyncFunction("openSettings") { context().startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
    AsyncFunction("requestNotifications") {
      if (android.os.Build.VERSION.SDK_INT >= 33 && !MoneyAlerts.allowed(context())) {
        val activity=requireNotNull(appContext.currentActivity) { "Open the app before requesting notifications" }
        activity.runOnUiThread { activity.requestPermissions(arrayOf("android.permission.POST_NOTIFICATIONS"),7082) }
      } else if (!MoneyAlerts.allowed(context())) {
        context().startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,context().packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    }
    AsyncFunction("openAppNotificationSettings") { context().startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,context().packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
    AsyncFunction("setAlertsEnabled") { value:Boolean -> MoneyStore.setAlertsEnabled(context(),value) }
    AsyncFunction("testNotification") { direction:String -> val kind=if(direction=="income") "test-income" else "test-expense"; MoneyAlerts.show(context(),org.json.JSONObject().put("id",kind).put("kind",kind).put("amount",0)) }
    AsyncFunction("setEnabled") { value: Boolean -> MoneyStore.setEnabled(context(),value) }
    AsyncFunction("pending") { MoneyStore.pending(context()).toString() }
    AsyncFunction("acknowledge") { ids: List<String> -> MoneyStore.acknowledge(context(),ids) }
    AsyncFunction("clear") { MoneyStore.clear(context()) }
  }
}
