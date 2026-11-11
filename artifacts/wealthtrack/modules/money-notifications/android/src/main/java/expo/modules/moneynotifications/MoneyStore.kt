package expo.modules.moneynotifications
import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object MoneyStore {
  private fun prefs(c:Context)=c.getSharedPreferences("money_notification_queue",Context.MODE_PRIVATE)
  private fun commit(c:Context,edit:android.content.SharedPreferences.Editor){
    if(!edit.commit())throw IllegalStateException("Payment storage write failed; reopen the app and check your statement")
  }
  @Synchronized fun enabled(c:Context)=prefs(c).getBoolean("enabled",false)
  @Synchronized fun setEnabled(c:Context,value:Boolean){commit(c,prefs(c).edit().putBoolean("enabled",value))}
  @Synchronized fun alertsEnabled(c:Context)=prefs(c).getBoolean("alerts",true)
  @Synchronized fun setAlertsEnabled(c:Context,value:Boolean){commit(c,prefs(c).edit().putBoolean("alerts",value))}
  @Synchronized fun error(c:Context,message:String){prefs(c).edit().putString("lastError",message).commit()}
  private fun array(c:Context,key:String):JSONArray {
    val raw=prefs(c).getString(key,"[]")?:"[]"
    return try{JSONArray(raw)}catch(e:Exception){
      // Preserve the unreadable bytes and fail closed; do not acknowledge a partial queue.
      prefs(c).edit().putString("damaged_"+key,raw).putString("lastError","Saved capture data is unreadable. Export your finance backup and check your statement.").commit()
      val recovery=prefs(c).getString(key+"_recovery",null)
      if(recovery!=null){
        val restored=try{JSONArray(recovery)}catch(_:Exception){null}
        if(restored!=null){commit(c,prefs(c).edit().putString(key,recovery));return restored}
      }
      throw IllegalStateException("Saved capture data is unreadable")
    }
  }
  @Synchronized fun pending(c:Context)=array(c,"pending")
  @Synchronized fun observed(c:Context){commit(c,prefs(c).edit().putLong("lastObserved",System.currentTimeMillis()))}
  @Synchronized fun imported(c:Context){commit(c,prefs(c).edit().putLong("lastImported",System.currentTimeMillis()))}
  @Synchronized fun health(c:Context):Map<String,Any> {
    val p=prefs(c);val count=try{pending(c).length()}catch(e:Exception){-1}
    return mapOf("pendingCount" to count,"lastObserved" to p.getLong("lastObserved",0),"lastImported" to p.getLong("lastImported",0),"lastError" to (p.getString("lastError","")?:""),"listenerConnected" to MoneyListener.connected)
  }
  @Synchronized fun enqueueReason(c:Context,event:JSONObject):Boolean {
    val seen=array(c,"seen");val captureId=event.getString("captureId")
    if((0 until seen.length()).none{seen.getString(it)==captureId})return false
    return enqueue(c,event)
  }
  @Synchronized fun enqueue(c:Context,event:JSONObject):Boolean {
    val p=prefs(c);val queue=pending(c);val seen=array(c,"seen")
    val signatures=JSONObject(p.getString("signatures","{}")?:"{}")
    val reference=event.optString("reference","")
    val kind=event.optString("kind","");val amount=event.optDouble("amount",0.0)
    if(reference.isNotEmpty()&&reference!="null"&&(kind=="expense"||kind=="income")) {
      val old=signatures.optJSONObject(reference)
      if(old!=null&&(old.optString("kind")!=kind||old.optDouble("amount")!=amount)) {
        event.put("id",event.getString("id")+":conflict:"+kind).put("kind","review").put("conflict",true)
      }else signatures.put(reference,JSONObject().put("kind",kind).put("amount",amount))
    }
    val id=event.getString("id")
    for(i in 0 until seen.length())if(seen.getString(i)==id)return false
    if(queue.length()>=2000){commit(c,p.edit().putBoolean("overflow",true).putString("lastError","Capture queue full; some alerts were not saved. Check your statement."));return false}
    queue.put(event);seen.put(id)
    val recent=JSONArray();for(i in maxOf(0,seen.length()-10000) until seen.length())recent.put(seen.getString(i))
    // Bounded metadata only; notification text is never retained.
    if(signatures.length()>10000){val keys=signatures.keys().asSequence().toList();keys.take(signatures.length()-10000).forEach{signatures.remove(it)}}
    commit(c,p.edit().putString("pending_recovery",p.getString("pending","[]")).putString("seen_recovery",p.getString("seen","[]")).putString("pending",queue.toString()).putString("seen",recent.toString()).putString("signatures",signatures.toString()))
    return true
  }
  @Synchronized fun acknowledge(c:Context,ids:List<String>){
    val queue=pending(c);val next=JSONArray();val keys=ids.toSet()
    for(i in 0 until queue.length())if(queue.getJSONObject(i).getString("id") !in keys)next.put(queue.getJSONObject(i))
    commit(c,prefs(c).edit().putString("pending_recovery",prefs(c).getString("pending","[]")).putString("pending",next.toString()))
  }
  @Synchronized fun overflow(c:Context)=prefs(c).getBoolean("overflow",false)
  @Synchronized fun clear(c:Context){commit(c,prefs(c).edit().clear().putBoolean("enabled",false))}
}
