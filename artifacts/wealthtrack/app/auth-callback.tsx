import React,{useEffect} from 'react';
import { ActivityIndicator,Text,View } from 'react-native';
import { router } from 'expo-router';
import { useAccount } from '@/context/AuthContext';
import { Button } from '@/components/UI';
export default function AuthCallback(){const account=useAccount();useEffect(()=>{if(account.session)router.replace('/');},[account.session]);return <View style={{flex:1,justifyContent:'center',padding:24,gap:16}}><ActivityIndicator/><Text>{account.error||'Completing Google sign-in…'}</Text><Button title="Back to app" onPress={()=>router.replace('/')}/></View>;}
