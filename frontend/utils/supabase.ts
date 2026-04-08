import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, processLock } from '@supabase/supabase-js';

const isBrowser = typeof window !== 'undefined';
const isWebClient = Platform.OS === 'web' && isBrowser;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

const memoryStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

function buildStorageKey() {
  if (!supabaseUrl) {
    return 'geocampo-auth-token-v2';
  }

  try {
    const hostname = new URL(supabaseUrl).hostname;
    const projectRef = hostname.split('.')[0];
    return `sb-${projectRef}-auth-token-v2`;
  } catch {
    return 'geocampo-auth-token-v2';
  }
}

const AUTH_STORAGE_KEY = buildStorageKey();
const USER_STORAGE_KEY = `${AUTH_STORAGE_KEY}-user`;
const CODE_VERIFIER_STORAGE_KEY = `${AUTH_STORAGE_KEY}-code-verifier`;
const EXPIRY_MARGIN_MS = 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function shouldDiscardPersistedSession(rawValue: string | null) {
  if (!rawValue) {
    return false;
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!isRecord(parsed)) {
      return true;
    }

    const accessToken = parsed.access_token;
    const refreshToken = parsed.refresh_token;
    const expiresAt = parsed.expires_at;

    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
      return true;
    }

    if (typeof expiresAt === 'number' && expiresAt * 1000 <= Date.now() + EXPIRY_MARGIN_MS) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

const baseStorage = isWebClient ? window.localStorage : Platform.OS === 'web' ? memoryStorage : AsyncStorage;

const storage = {
  getItem: async (key: string) => {
    const value = await baseStorage.getItem(key);

    if (key === AUTH_STORAGE_KEY && shouldDiscardPersistedSession(value)) {
      await Promise.allSettled([
        baseStorage.removeItem(AUTH_STORAGE_KEY),
        baseStorage.removeItem(USER_STORAGE_KEY),
        baseStorage.removeItem(CODE_VERIFIER_STORAGE_KEY),
      ]);
      return null;
    }

    return value;
  },
  setItem: (key: string, value: string) => baseStorage.setItem(key, value),
  removeItem: (key: string) => baseStorage.removeItem(key),
};

export const supabase = createClient(
  supabaseUrl!,
  supabaseKey!,
  {
    auth: {
      storage: supabaseUrl && supabaseKey ? storage : memoryStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: AUTH_STORAGE_KEY,
      lock: isWebClient ? processLock : undefined,
    },
  }
);

export default supabase;
