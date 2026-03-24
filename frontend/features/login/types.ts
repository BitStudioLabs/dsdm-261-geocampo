import type { SharedValue } from 'react-native-reanimated';

export interface LoginScreenProps {
  onLogin?: (email: string, password: string) => Promise<void>;
  onForgotPassword?: () => void;
}

export interface LoginFormState {
  email: string;
  password: string;
  loading: boolean;
  emailFocused: boolean;
  passFocused: boolean;
  showPass: boolean;
  error: string;
}

export interface LoginFormActions {
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setEmailFocused: (value: boolean) => void;
  setPassFocused: (value: boolean) => void;
  toggleShowPass: () => void;
  handleLogin: () => Promise<void>;
}

export interface CornConfig {
  id: number;
  x: number;
  maxHeight: number;
  delay: number;
  scale: number;
  leafCount: number;
  hasCob: boolean;
  swayOffset: number;
}

export interface StarConfig {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleDelay: number;
}

export interface LeafProps {
  index: number;
  side: number;
  posFromBottom: number;
  leafLen: number;
  leafH: number;
  progress: SharedValue<number>;
  swayOffset: number;
}
