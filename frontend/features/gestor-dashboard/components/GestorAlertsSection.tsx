import { FontAwesome6 } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

import { THEME } from '../constants';
import { styles } from '../styles';
import type { DashboardAlert } from '../types';

interface GestorAlertsSectionProps {
  alerts: DashboardAlert[];
  alertCardWidth: number;
  isLoading: boolean;
}

export function GestorAlertsSection({ alerts, alertCardWidth, isLoading }: GestorAlertsSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Alertas Recentes</Text>
        <Link href="/(tabs-gestor)/auditoria" asChild>
          <TouchableOpacity activeOpacity={0.85}>
            <Text style={styles.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {alerts.length === 0 && !isLoading ? (
        <View style={styles.emptyState}>
          <FontAwesome6 name="circle-check" size={18} color={THEME.leafLight} />
          <Text style={styles.emptyText}>Nenhum alerta recente encontrado.</Text>
        </View>
      ) : null}

      <View style={styles.alertsGrid}>
        {alerts.map((alert) => (
          <Link key={alert.id} href="/(tabs-gestor)/auditoria" asChild>
            <TouchableOpacity style={[styles.alertCard, { width: alertCardWidth }]} activeOpacity={0.9}>
              <View style={styles.alertCardTop}>
                <View style={styles.alertTopLeft}>
                  <View
                    style={[
                      styles.alertIconBox,
                      alert.type === 'error' && { backgroundColor: 'rgba(255,107,107,0.2)' },
                      alert.type === 'warning' && { backgroundColor: 'rgba(245,200,66,0.2)' },
                      alert.type === 'info' && { backgroundColor: 'rgba(91,156,255,0.2)' },
                    ]}>
                    <FontAwesome6
                      name={alert.type === 'error' ? 'circle-xmark' : alert.type === 'warning' ? 'triangle-exclamation' : 'circle-info'}
                      size={14}
                      color={alert.type === 'error' ? THEME.error : alert.type === 'warning' ? THEME.gold : THEME.blue}
                    />
                  </View>
                  <View style={styles.alertHeadlineBox}>
                    <Text style={styles.alertLabel}>{alert.label}</Text>
                    <Text style={styles.alertTime}>{alert.time}</Text>
                  </View>
                </View>
                <FontAwesome6 name="chevron-right" size={12} color={THEME.textMuted} />
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>
    </View>
  );
}
