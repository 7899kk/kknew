package com.sbi.SBIFreedomPlus;
import android.app.*;
import android.os.*;
public class MockBank extends Activity {
  public void onCreate(Bundle state) {
    super.onCreate(state);
    String text=getIntent().getStringExtra("message");
    int id=getIntent().getIntExtra("notificationId",1);
    if(text!=null) {
      NotificationManager manager=getSystemService(NotificationManager.class);
      if(Build.VERSION.SDK_INT>=26) manager.createNotificationChannel(new NotificationChannel("fixture","Mock bank",NotificationManager.IMPORTANCE_LOW));
      Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,"fixture"):new Notification.Builder(this);
      manager.notify(id,builder.setSmallIcon(android.R.drawable.stat_notify_more).setContentTitle("Mock bank · test only").setContentText(text).setStyle(new Notification.BigTextStyle().bigText(text)).build());
    }
    finish();
  }
}
