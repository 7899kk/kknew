import React, { useEffect, useState } from 'react';
import { AppState, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Button, Input, formatCurrencyFull } from './UI';
import { debitReasonDetails, pendingDebitReasons } from '@/utils/debitReasons';

export function DebitReasonPrompt() {
  const { expenses, updateExpense, profile, storageError } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [deferred, setDeferred] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const entry = pendingDebitReasons(expenses).find(item => !deferred.includes(item.id));
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => listener.remove();
  }, []);
  useEffect(() => { setReason(''); setError(''); }, [entry?.id]);
  const later = () => { if (entry) setDeferred(ids => [...ids, entry.id]); };
  const save = () => {
    const details = debitReasonDetails(reason, entry?.category ?? 'Others');
    if (!entry || !details) { setError('Enter a reason between 1 and 200 characters.'); return; }
    updateExpense(entry.id, details);
  };
  const visible = !!entry && active && profile.onboardingComplete && segments[0] === '(tabs)' && !storageError;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={later}>
    <KeyboardAvoidingView style={{flex:1,justifyContent:'center',alignItems:'flex-end',padding:12,backgroundColor:'#00000033'}} behavior={Platform.OS==='ios'?'padding':'height'}>
      <View style={{backgroundColor:colors.card,borderRadius:20,borderWidth:1,borderColor:colors.border,padding:18,paddingBottom:18,marginTop:insets.top,marginBottom:insets.bottom,width:'94%',maxWidth:380,maxHeight:'75%'}}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:12}}>
            <Image source={require('../assets/images/logo.png')} style={{width:42,height:42,borderRadius:10}} accessibilityLabel="Pro Financer logo"/>
            <View style={{flex:1}}><Text style={{color:colors.foreground,fontWeight:'700',fontSize:18}}>Money debited</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close debit reason" onPress={later} hitSlop={10} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.mutedForeground,fontSize:26}}>×</Text></Pressable>
          </View>
          <Text style={{color:colors.expense,fontSize:30,fontWeight:'700',marginBottom:8}}>{formatCurrencyFull(entry?.amount ?? 0)}</Text>
          <Text style={{color:colors.mutedForeground,marginBottom:16}}>{entry?.source} · Already deducted. What was it for?</Text>
          <Input label="Reason" placeholder="Groceries, lunch, payment to a friend…" value={reason} onChangeText={setReason}/>
          {!!error && <Text accessibilityRole="alert" style={{color:colors.destructive,marginTop:12}}>{error}</Text>}
          <Button title="OK" onPress={save} style={{marginTop:16}}/>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
