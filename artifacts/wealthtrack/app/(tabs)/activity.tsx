import { validMoney,validDate } from "@/utils/financeValidation";
import React, { useEffect, useState } from 'react';
import { Alert, AppState, Modal, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp, Expense, ExpenseCategory } from '@/context/AppContext';
import { Button, Card, Input, PillSelector, formatCurrencyFull } from '@/components/UI';
import { ProFinancierHeader } from '@/components/ProFinancierHeader';
import { CaptureStatus, notificationBridge, sourceNames } from '@/utils/notificationBridge';

import { debitReasonDetails, expenseCategories, pendingDebitReasons } from '@/utils/debitReasons';

type Editing = { id?:string; kind:'expense'|'income'|'review'; amount:string; notes:string; date:string; name?:string; category?:string };
export default function ActivityScreen() {
  const app=useApp(); const colors=useColors(); const insets=useSafeAreaInsets();
  const [status,setStatus]=useState<CaptureStatus>({granted:false,enabled:false,overflow:false});
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const [filter,setFilter]=useState('All'); const [editing,setEditing]=useState<Editing|null>(null);
  const [reviewKind,setReviewKind]=useState('Expense');
  const refresh=async()=>{ if(notificationBridge) try{setStatus(await notificationBridge.status());setError('');}catch{setError('Could not check notification access.');} };
  useEffect(()=>{void refresh();const sub=AppState.addEventListener('change',s=>{if(s==='active') void refresh();}); return ()=>sub.remove();},[]);
  const setCapture=async(value:boolean)=>{if(!notificationBridge) return;setBusy(true);try{if(value&&!status.granted){await notificationBridge.openSettings();}else{await notificationBridge.setEnabled(value);}await refresh();}catch{setError('Could not change capture settings. Use Android Settings > Notification access.');}finally{setBusy(false);}};
  const save=()=>{
    if(!editing) return;
    const amount=Number(editing.amount);
    if(!validMoney(editing.amount)||!validDate(editing.date)){Alert.alert('Check entry','Enter a positive amount and valid date (YYYY-MM-DD).');return;}
    if(editing.kind==='review'&&editing.id) app.resolvePayment(editing.id,reviewKind==='Income'?'income':'expense',amount,{name:editing.name,category:editing.category,notes:editing.notes});
    else if(editing.kind==='income') {
      const data={amount,date:editing.date,notes:editing.notes,name:editing.name?.trim() || "Money received",category:editing.category || "Uncategorized"};
      editing.id?app.updateIncome(editing.id,data):app.addIncome(data);
    } else if(editing.id) {
      const original=app.expenses.find(item=>item.id===editing.id);
      const details=debitReasonDetails(editing.notes,(editing.category||'Others') as ExpenseCategory);
      if(original?.needsReason&&!details){Alert.alert('Add a reason','Enter a reason between 1 and 200 characters.');return;}
      app.updateExpense(editing.id,{amount,date:editing.date,notes:editing.notes,category:(editing.category||'Others') as ExpenseCategory,...(details||{})});
    }
    setEditing(null);
  };
  const remove=(id:string,kind:'expense'|'income')=>Alert.alert('Delete entry?','This removes the entry from your totals. A captured notification will not be imported again.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>kind==='income'?app.deleteIncome(id):app.deleteExpense(id)}]);
  const rows=[...app.expenses.map(e=>({...e,kind:'expense' as const})),...app.incomes.map(e=>({...e,kind:'income' as const}))].sort((a,b)=>b.date.localeCompare(a.date));
  return <View style={{flex:1,backgroundColor:colors.background}}>
    <ProFinancierHeader title="Activity" subtitle="Transactions and payment tracking" />
    <ScrollView contentContainerStyle={{padding:16,paddingBottom:100+insets.bottom,gap:16}}>
      <Card>
        <Text style={{color:colors.foreground,fontSize:18,fontWeight:'700'}}>Automatic payment tracking</Text>
        <Text style={{color:colors.mutedForeground,fontSize:14,marginVertical:12}}>{!notificationBridge ? (Platform.OS==='web'?'Phone notifications are available only in the Android APK. This web view supports manual entries.':'A custom Android build is required. Expo Go cannot capture payment notifications.') : 'Allow notification access, then enable tracking. Supported payment alerts are processed on this phone. OTPs and unrelated notifications are discarded.'}</Text>
        {notificationBridge && <>
          <Text style={{color:colors.foreground,fontSize:14}}>Access: {status.granted?'Allowed':'Not allowed'} · Capture: {status.enabled&&status.granted?'On':'Off'}</Text>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginVertical:12}}><Text style={{color:colors.foreground,fontSize:16}}>Capture new payments</Text><Switch accessibilityLabel="Capture new payments" value={status.enabled&&status.granted} disabled={busy} onValueChange={setCapture}/></View>
          <Button title="Notification access settings" variant="secondary" onPress={()=>{notificationBridge?.openSettings().catch(()=>setError('Open Android notification access settings manually.'));}} />
          <Text style={{color:colors.mutedForeground,fontSize:14,marginTop:12}}>Supported sources: {Object.values(sourceNames).join(', ')}. Formats vary; ambiguous payments and refunds require review. Without a transaction reference, alerts are never added automatically. Self-transfers may need manual correction.</Text>
          <Text style={{color:colors.mutedForeground,fontSize:14,marginTop:8}}>Capture continues while the app is closed when Android allows it. Totals update when you reopen the app. Force-stop and some battery restrictions can prevent capture. Notifications from before you enabled tracking are not recovered.</Text>
        </>}
        {status.overflow&&<Text style={{color:colors.destructive,marginTop:12}}>Capture queue is full. Some notifications were not saved. Open Activity regularly and check your bank statement for gaps.</Text>}
        {!!error&&<Text style={{color:colors.destructive,marginTop:12}}>{error}</Text>}
      </Card>
      {notificationBridge&&<Card>
        <Text style={{color:colors.foreground,fontSize:18,fontWeight:'700'}}>Payment notifications</Text>
        <Text style={{color:colors.mutedForeground,marginVertical:10}}>Get an alert for newly captured money and payments needing review. Tap it to open Activity, name income or add a payment reason. Amounts are hidden on the lock screen.</Text>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{color:colors.foreground}}>Send payment alerts</Text><Switch accessibilityLabel="Send payment alerts" value={status.alertsEnabled??true} onValueChange={async value=>{try{await notificationBridge!.setAlertsEnabled(value);await refresh();}catch{setError('Could not change payment alerts.');}}}/></View>
        <Text style={{color:colors.mutedForeground,marginVertical:10}}>Android notification permission: {status.notificationsGranted?'Allowed':'Not allowed'}</Text>
        {!status.notificationsGranted&&<Button title="Allow app notifications" onPress={async()=>{try{await notificationBridge!.requestNotifications();await refresh();}catch{setError('Open Android Settings > Apps > Pro Financer > Notifications.');}}}/>}
        <Button title="Android notification settings" variant="ghost" onPress={()=>notificationBridge!.openAppNotificationSettings().catch(()=>setError('Could not open notification settings.'))}/>
        <Button title="Test money received sound" variant="secondary" onPress={async()=>{try{const sent=await notificationBridge!.testNotification("income");if(!sent) Alert.alert('Notifications are off','Enable payment alerts and allow notifications in Android settings.');}catch{setError('Could not send the test alert.');}}}/>
        <Button title="Test money sent sound" variant="secondary" onPress={async()=>{try{if(!await notificationBridge!.testNotification('expense')) Alert.alert('Notifications are off','Enable app notifications and payment alerts.');}catch{setError('Could not send the test alert.');}}}/>
        <Text style={{color:colors.mutedForeground,marginTop:10}}>Received money uses a rising chime; sent money uses a falling chime. Android silent mode, Do Not Disturb and your channel settings control whether sounds play.</Text>
      </Card>}
      {app.incomes.some(e=>!e.category||e.category==='Uncategorized')&&<Card><Text style={{color:colors.foreground,fontWeight:'700'}}>Name your received money</Text><Text style={{color:colors.mutedForeground,marginTop:8}}>New income already counts in your totals. Use Name income below to label it Salary, Gift or anything you choose.</Text></Card>}
      {pendingDebitReasons(app.expenses).length>0&&<Card><Text style={{color:colors.expense,fontWeight:'700'}}>Add payment reasons ({pendingDebitReasons(app.expenses).length})</Text><Text style={{color:colors.mutedForeground,marginTop:8}}>These debits already count in your totals. Tap Add reason on a transaction to tell us what it was for.</Text></Card>}
      {!!app.storageError&&<Card><Text style={{color:colors.destructive}}>{app.storageError}</Text><Button title="Retry saving" variant="secondary" onPress={app.retrySave}/></Card>}
      {app.paymentReviews.length>0&&<Card>
        <Text style={{color:colors.foreground,fontSize:18,fontWeight:'700'}}>Needs review ({app.paymentReviews.length})</Text>
        {app.paymentReviews.map(e=><View key={e.id} style={{paddingVertical:14,borderBottomWidth:1,borderColor:colors.border,gap:8}}>
          <Text style={{color:colors.foreground,fontSize:16}}>{formatCurrencyFull(e.amount)} · {sourceNames[e.source]||e.source}</Text>
          <Text style={{color:colors.mutedForeground,fontSize:14}}>{e.status==='transfer'?'Possible transfer between your accounts':'Ambiguous alert or refund'} · {new Date(e.timestamp).toLocaleDateString()}</Text>
          <Button title="Review amount and direction" variant="secondary" onPress={()=>{setReviewKind('Expense');const d=new Date(e.timestamp);setEditing({id:e.id,kind:'review',amount:String(e.amount),notes:'',date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});}}/>
          <Button title="Ignore / own-account transfer" variant="ghost" onPress={()=>app.resolvePayment(e.id,'ignore')}/>
        </View>)}
      </Card>}
      <Button title="Add income" icon="plus" onPress={()=>{const d=new Date();setEditing({kind:'income',amount:'',notes:'',name:'',category:'Other',date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});}}/>
      <PillSelector options={['All','Expenses','Income']} value={filter} onChange={setFilter}/>
      <Text style={{color:colors.mutedForeground,fontSize:14}}>Recorded income replaces your planned salary for that month, so it is not counted twice. Refunds should be matched against the original expense before you adjust it.</Text>
      {rows.filter(e=>filter==='All'||(filter==='Income'?e.kind==='income':e.kind==='expense')).map(e=><Card key={`${e.kind}-${e.id}`}>
        <Text style={{color:e.kind==='income'?colors.success:colors.expense,fontSize:20,fontWeight:'700'}}>{e.kind==='income'?'+':'−'}{formatCurrencyFull(e.amount)}</Text>
        <Text style={{color:colors.foreground,fontSize:16,marginTop:6}}>{e.kind==='income'?(e.name||'Money received'):((e as Expense).needsReason?'Payment reason needed':e.notes||(e as Expense).category)}</Text>
        <Text style={{color:colors.mutedForeground,fontSize:14,marginVertical:8}}>{e.kind==='income'?`${e.category||'Uncategorized'} · `:''}{e.date} · {e.source?`Notification · ${e.source}`:'Manual entry'}</Text>
        <View style={{flexDirection:'row',gap:8}}><Button title={e.kind==='income'?'Name income / Edit':(e as Expense).needsReason?'Add reason':'Edit'} variant="secondary" style={{flex:1}} onPress={()=>setEditing({id:e.id,kind:e.kind,amount:String(e.amount),notes:e.kind==='expense'&&(e as Expense).needsReason?'':e.notes||'',date:e.date,name:e.kind==='income'?e.name:undefined,category:e.category})}/><Button title="Delete" variant="ghost" style={{flex:1}} onPress={()=>remove(e.id,e.kind)}/></View>
      </Card>)}
      {!rows.length&&<Text style={{color:colors.mutedForeground,fontSize:16,textAlign:'center'}}>No transactions yet. Add an expense or income, or enable Android payment tracking.</Text>}
    </ScrollView>
    <Modal visible={!!editing} animationType="slide" onRequestClose={()=>setEditing(null)}>
      <ScrollView contentContainerStyle={{padding:24,paddingTop:insets.top+24,backgroundColor:colors.background,flexGrow:1,gap:12}}>
        <Text style={{color:colors.foreground,fontSize:24,fontWeight:'700'}}>Edit transaction</Text>
        {editing?.kind==='review'&&<PillSelector options={['Expense','Income']} value={reviewKind} onChange={setReviewKind}/>}
        {(editing?.kind==='income'||(editing?.kind==='review'&&reviewKind==='Income'))&&<>
          <Input label="Income name" placeholder="Salary, gift, freelance work…" value={editing?.name==='Money received'?'':editing?.name||''} onChangeText={name=>setEditing(e=>e?{...e,name}:null)}/>
          <PillSelector options={['Salary','Business','Gift','Refund','Other']} value={editing?.category||'Uncategorized'} onChange={category=>setEditing(e=>e?{...e,category,name:(!e.name||e.name==='Money received')?category:e.name}:null)}/>
        </>}
        {editing?.kind==='expense'&&<PillSelector options={expenseCategories} value={(editing.category||'Others') as ExpenseCategory} onChange={category=>setEditing(e=>e?{...e,category}:null)}/>}
        <Input label="Amount (INR)" value={editing?.amount||''} onChangeText={amount=>setEditing(e=>e?{...e,amount}:null)} keyboardType="decimal-pad"/>
        {editing?.kind!=='review'&&<><Input label="Date (YYYY-MM-DD)" value={editing?.date||''} onChangeText={date=>setEditing(e=>e?{...e,date}:null)}/><Input label={editing?.kind==='expense'?'Payment reason':'Notes'} value={editing?.notes||''} onChangeText={notes=>setEditing(e=>e?{...e,notes}:null)}/></>}
        <Button title="Save" onPress={save}/><Button title="Cancel" variant="ghost" onPress={()=>setEditing(null)}/>
      </ScrollView>
    </Modal>
  </View>;
}
