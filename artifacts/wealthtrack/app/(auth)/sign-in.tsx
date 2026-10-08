import React,{useState} from 'react';
import { ActivityIndicator,Image,Text,View } from 'react-native';
import { router } from 'expo-router';
import { useAccount } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { Button } from '@/components/UI';
export default function SignInPage(){
 const account=useAccount();const colors=useColors();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const login=async()=>{setBusy(true);setError('');try{await account.signInGoogle();router.replace('/');}catch(e){setError(e instanceof Error?e.message:'Could not sign in.');}finally{setBusy(false);}};
 return <View style={{flex:1,backgroundColor:colors.background,justifyContent:'center',padding:24,gap:18}}>
 <Image source={require('../../assets/images/logo.jpg')} style={{height:100,width:100,borderRadius:24,alignSelf:'center'}}/>
 <Text style={{color:colors.foreground,fontSize:28,fontWeight:'700',textAlign:'center'}}>Pro Financer</Text>
 <Text style={{color:colors.mutedForeground,textAlign:'center'}}>Sign in with Google using Supabase. Your finance records stay on this device; sign-in does not upload or back them up.</Text>
 {!account.configured&&<Text style={{color:colors.mutedForeground}}>Google sign-in is awaiting this app's Supabase configuration. Continue locally to use payment tracking.</Text>}
 {!!(error||account.error)&&<Text style={{color:colors.destructive}}>{error||account.error}</Text>}
 {busy?<ActivityIndicator color={colors.primary}/>:<Button title="Continue with Google" onPress={login} disabled={!account.configured||!account.ready}/>}
 <Button title="Continue locally" variant="secondary" onPress={()=>router.replace('/')}/>
 </View>;
}
