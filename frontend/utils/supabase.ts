import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, processLock } from '@supabase/supabase-js';

const isBrowser = typeof window !== 'undefined';
const isWebClient = Platform.OS === 'web' && isBrowser;

const memoryStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: isWebClient ? window.localStorage : isBrowser ? AsyncStorage : memoryStorage,
      autoRefreshToken: true,
      persistSession: isBrowser,
      detectSessionInUrl: false,
      lock: isBrowser ? processLock : undefined,
    },
  }
);

export default supabase;
