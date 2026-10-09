package expo.modules.moneynotifications
import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object MoneyStore {
  private fun prefs(c: Context) = c.getSharedPreferences("money_notification_queue", Context.MODE_PRIVATE)
  @Synchronized fun enabled(c: Context) = prefs(c).getBoolean("enabled", false)
  @Synchronized fun setEnabled(c: Context, value: Boolean) { prefs(c).edit().putBoolean("enabled", value).commit() }
  @Synchronized fun pending(c: Context): JSONArray = JSONArray(prefs(c).getString("pending", "[]"))
  @Synchronized fun alertsEnabled(c:Context) = prefs(c).getBoolean("alerts",true)
  @Synchronized fun enqueueReason(c:Context,event:JSONObject):Boolean {
    val seen=JSONArray(prefs(c).getString("seen","[]"))
    val captureId=event.getString("captureId")
    if ((0 until seen.length()).none { seen.getString(it)==captureId }) return false
    return enqueue(c,event)
  }
  @Synchronized fun setAlertsEnabled(c:Context,value:Boolean) { prefs(c).edit().putBoolean("alerts",value).commit() }
  @Synchronized fun enqueue(c: Context, event: JSONObject): Boolean {
    val p = prefs(c); val queue = pending(c)
    // Durable deduplication survives acknowledgement and service restarts.
    val seen = JSONArray(p.getString("seen", "[]"))
    val id = event.getString("id")
    for (i in 0 until seen.length()) if (seen.getString(i) == id) return false
    if (queue.length() >= 2000) { p.edit().putBoolean("overflow", true).commit(); return false }
    queue.put(event); seen.put(id)
    val recent = JSONArray()
    for (i in maxOf(0, seen.length() - 10000) until seen.length()) recent.put(seen.getString(i))
    return p.edit().putString("pending",queue.toString()).putString("seen",recent.toString()).commit()
  }
  @Synchronized fun acknowledge(c: Context, ids: List<String>) {
    val queue=pending(c); val next=JSONArray(); val keys=ids.toSet()
    for(i in 0 until queue.length()) if(queue.getJSONObject(i).getString("id") !in keys) next.put(queue.getJSONObject(i))
    prefs(c).edit().putString("pending",next.toString()).commit()
  }
  @Synchronized fun overflow(c: Context) = prefs(c).getBoolean("overflow",false)
  @Synchronized fun clear(c: Context) { prefs(c).edit().clear().putBoolean("enabled",false).commit() }
}
