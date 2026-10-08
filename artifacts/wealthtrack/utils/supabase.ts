import 'react-native-url-polyfill/auto';
import 'fast-text-encoding';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as ExpoCrypto from 'expo-crypto';

// Hermes needs native secure randomness and SHA-256 for Google OAuth PKCE.
if (Platform.OS !== 'web') {
  globalThis.crypto = { ...globalThis.crypto, getRandomValues:ExpoCrypto.getRandomValues, subtle:{digest:async(algorithm:string,data:BufferSource)=>{if(algorithm!=='SHA-256')throw new Error('Unsupported digest');return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256,data);}} } as unknown as Crypto;
}

const secureStorage = {
  async getItem(key:string) {
    const count=Number(await SecureStore.getItemAsync(`${key}-count`));
    if (!count) return null;
    let value='';
    for(let i=0;i<count;i++) { const part=await SecureStore.getItemAsync(`${key}-${i}`); if(part===null) return null; value+=part; }
    return value;
  },
  async setItem(key:string,value:string) {
    const old=Number(await SecureStore.getItemAsync(`${key}-count`))||0;
    const count=Math.ceil(value.length/450);
    for(let i=0;i<count;i++) await SecureStore.setItemAsync(`${key}-${i}`,value.slice(i*450,(i+1)*450));
    await SecureStore.setItemAsync(`${key}-count`,String(count));
    for(let i=count;i<old;i++) await SecureStore.deleteItemAsync(`${key}-${i}`);
  },
  async removeItem(key:string) {
    const count=Number(await SecureStore.getItemAsync(`${key}-count`))||0;
    await SecureStore.deleteItemAsync(`${key}-count`);
    for(let i=0;i<count;i++) await SecureStore.deleteItemAsync(`${key}-${i}`);
  },
};
const url=process.env.EXPO_PUBLIC_SUPABASE_URL;
const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url,key,{auth:{storage:Platform.OS==='web'?AsyncStorage:secureStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}}) : null;
