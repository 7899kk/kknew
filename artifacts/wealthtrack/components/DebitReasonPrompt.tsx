import React, { useEffect, useState } from 'react';
import { AppState, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, ExpenseCategory } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Button, Input, PillSelector, formatCurrencyFull } from './UI';
import { debitReasonDetails, expenseCategories, pendingDebitReasons } from '@/utils/debitReasons';

export function DebitReasonPrompt() {
  const { expenses, updateExpense, profile, storageError } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [deferred, setDeferred] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Others');
  const [error, setError] = useState('');
  const entry = pendingDebitReasons(expenses).find(item => !deferred.includes(item.id));
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => listener.remove();
  }, []);
  useEffect(() => { setReason(''); setCategory('Others'); setError(''); }, [entry?.id]);
  const later = () => { if (entry) setDeferred(ids => [...ids, entry.id]); };
  const save = () => {
    const details = debitReasonDetails(reason, category);
    if (!entry || !details) { setError('Enter a reason between 1 and 200 characters.'); return; }
    updateExpense(entry.id, details);
  };
  const visible = !!entry && active && profile.onboardingComplete && segments[0] === '(tabs)' && !storageError;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={later}>
    <KeyboardAvoidingView style={{flex:1,justifyContent:'flex-end',backgroundColor:'#00000066'}} behavior={Platform.OS==='ios'?'padding':'height'}>
      <View style={{backgroundColor:colors.card,borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,paddingBottom:Math.max(insets.bottom,16)+12,maxHeight:'85%'}}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:12}}>
            <Image source={require('../assets/images/logo.jpg')} style={{width:42,height:42,borderRadius:10}} accessibilityLabel="Pro Financer logo"/>
            <View><Text style={{color:colors.foreground,fontWeight:'700',fontSize:18}}>Money debited</Text><Text style={{color:colors.mutedForeground}}>Payment recorded</Text></View>
          </View>
          <Text style={{color:colors.expense,fontSize:30,fontWeight:'700',marginBottom:8}}>{formatCurrencyFull(entry?.amount ?? 0)}</Text>
          <Text style={{color:colors.mutedForeground,marginBottom:16}}>{entry?.source} · Already included in your expenses. What was this payment for?</Text>
          <Input label="Reason" placeholder="Groceries, lunch, payment to a friend…" value={reason} onChangeText={setReason}/>
          <PillSelector options={expenseCategories} value={category} onChange={setCategory}/>
          {!!error && <Text accessibilityRole="alert" style={{color:colors.destructive,marginTop:12}}>{error}</Text>}
          <Button title="Save reason" onPress={save} style={{marginTop:16}}/>
          <Button title="Later — keep in Activity" variant="ghost" onPress={later} style={{marginTop:8}}/>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
