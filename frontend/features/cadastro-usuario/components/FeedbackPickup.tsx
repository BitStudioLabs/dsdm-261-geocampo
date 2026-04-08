import { FontAwesome6 } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { THEME } from '../constants';
import { styles } from '../styles';
import type { PickupFeedback } from '../types';

export function FeedbackPickup({ feedback }: { feedback: PickupFeedback | null }) {
  const insets = useSafeAreaInsets();

  if (!feedback) {
    return null;
  }

  const isSuccess = feedback.type === 'success';

  return (
    <View pointerEvents="none" style={[styles.pickupWrapper, { top: insets.top + 12 }]}>
      <View style={[styles.pickupCard, isSuccess ? styles.pickupSuccess : styles.pickupError]}>
        <View style={[styles.pickupIcon, isSuccess ? styles.pickupIconSuccess : styles.pickupIconError]}>
          <FontAwesome6 name={isSuccess ? 'circle-check' : 'triangle-exclamation'} size={14} color={THEME.white} />
        </View>
        <Text style={styles.pickupText}>{feedback.message}</Text>
      </View>
    </View>
  );
}
