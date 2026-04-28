import { FontAwesome6 } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { THEME } from '../constants';
import { styles } from '../styles';

interface GestorDashboardHeaderProps {
  animatedStyle: AnimatedStyle<any>;
  displayName: string;
  formattedDate: string;
  regionalLabel: string;
  operationalSummary: string;
  unreadNotifications: number;
}

export function GestorDashboardHeader({
  animatedStyle,
  displayName,
  formattedDate,
  regionalLabel,
  operationalSummary,
  unreadNotifications,
}: GestorDashboardHeaderProps) {
  return (
    <Animated.View style={[styles.header, animatedStyle]}>
      <View style={styles.welcomeBox}>
        <Text style={styles.welcomeText}>Painel de Gestao</Text>
        <Text style={styles.userName}>{displayName}</Text>
        <View style={styles.roleBadge}>
          <FontAwesome6 name="chart-line" size={10} color={THEME.blue} />
          <Text style={styles.roleText}>Gestor Institucional</Text>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <FontAwesome6 name="calendar-day" size={11} color={THEME.offWhite} />
            <Text style={styles.metaPillText}>{formattedDate}</Text>
          </View>
          <View style={styles.metaPill}>
            <FontAwesome6 name="location-dot" size={11} color={THEME.leafLight} />
            <Text style={styles.metaPillText}>{regionalLabel}</Text>
          </View>
        </View>
        <Text style={styles.headerSummary}>{operationalSummary}</Text>
      </View>
      <TouchableOpacity style={styles.notifBtn}>
        <FontAwesome6 name="bell" size={18} color={THEME.white} />
        {unreadNotifications > 0 ? <View style={styles.notifDot} /> : null}
      </TouchableOpacity>
    </Animated.View>
  );
}
