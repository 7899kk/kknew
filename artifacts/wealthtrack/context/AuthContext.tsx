import React,{createContext,useContext,useEffect,useState} from 'react';
import { AppState,Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import { parseOAuthCallback } from '@/utils/oauthCallback';

WebBrowser.maybeCompleteAuthSession();
const redirectUri=()=>Linking.createURL('auth-callback',{scheme:'profinancer'});
const exchanges=new Map<string,Promise<void>>();
async function finishOAuth(url:string) {
  if(!supabase) throw new Error('Google sign-in has not been configured yet.');
  const {code,flowId}=parseOAuthCallback(url);
  const existing=exchanges.get(code);if(existing) return existing;
  const task=(async()=>{const {error}=await supabase.auth.exchangeCodeForSession(code,flowId?{flowId}:undefined);if(error) throw error;})();
  exchanges.set(code,task);
  if(exchanges.size>8) exchanges.delete(exchanges.keys().next().value!);
  return task;
}
type AuthState={session:Session|null;ready:boolean;configured:boolean;error:string;signInGoogle:()=>Promise<void>;signOut:()=>Promise<void>};
const AuthContext=createContext<AuthState|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}) {
  const [session,setSession]=useState<Session|null>(null);const [ready,setReady]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{
    if(!supabase){setReady(true);return;}
    let active=true;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{if(active)setSession(next);});
    supabase.auth.getSession().then(({data,error})=>{if(active){if(error)setError(error.message);setSession(data.session);setReady(true);}}).catch(()=>{if(active){setError('Could not restore your login. Please sign in again.');setReady(true);}});
    const receive=(url:string)=>{if(url.split('?')[0].replace(/\/$/,'')===redirectUri().replace(/\/$/,''))void finishOAuth(url).catch(e=>{if(active)setError(e.message);});};
    const links=Linking.addEventListener('url',event=>receive(event.url));
    Linking.getInitialURL().then(url=>{if(url)receive(url);});
    const lifecycle=AppState.addEventListener('change',state=>{if(state==='active')supabase!.auth.startAutoRefresh();else supabase!.auth.stopAutoRefresh();});
    if(AppState.currentState==='active')supabase.auth.startAutoRefresh();
    return()=>{active=false;subscription.unsubscribe();links.remove();lifecycle.remove();supabase!.auth.stopAutoRefresh();};
  },[]);
  const signInGoogle=async()=>{
    setError('');
    if(!supabase)throw new Error('Google sign-in needs the Supabase project configuration. You can continue in local mode.');
    const redirect=redirectUri();
    const {data,error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect,skipBrowserRedirect:true}});
    if(error)throw error;if(!data.url)throw new Error('Could not start Google sign-in.');
    if(Platform.OS==='web'){window.location.assign(data.url);return;}
    const result=await WebBrowser.openAuthSessionAsync(data.url,redirect);
    if(result.type==='success')await finishOAuth(result.url);
    else if(result.type==='cancel'||result.type==='dismiss')throw new Error('Google sign-in was cancelled.');
  };
  const signOut=async()=>{if(supabase){const {error}=await supabase.auth.signOut();if(error)throw error;}};
  return <AuthContext.Provider value={{session,ready,configured:!!supabase,error,signInGoogle,signOut}}>{children}</AuthContext.Provider>;
}
export function useAccount(){const value=useContext(AuthContext);if(!value)throw new Error('AuthProvider is required');return value;}
