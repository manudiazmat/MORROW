import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = !!url && !!anonKey;

/**
 * Session storage: Keychain/Keystore via SecureStore on native (chunked, its values are limited to ~2KB),
 * AsyncStorage (localStorage) on web.
 */
const CHUNK = 1800;
const secureStorage = {
  async getItem(key: string) {
    const n = await SecureStore.getItemAsync(`${key}.n`);
    if (!n) return null;
    let out = '';
    for (let i = 0; i < Number(n); i++) out += (await SecureStore.getItemAsync(`${key}.${i}`)) ?? '';
    return out;
  },
  async setItem(key: string, value: string) {
    const parts = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < parts; i++) await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    await SecureStore.setItemAsync(`${key}.n`, String(parts));
  },
  async removeItem(key: string) {
    const n = await SecureStore.getItemAsync(`${key}.n`);
    for (let i = 0; i < Number(n ?? 0); i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
    await SecureStore.deleteItemAsync(`${key}.n`);
  },
};

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        storage: Platform.OS === 'web' ? AsyncStorage : secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
