import { FontAwesome6 } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { THEME } from '../constants';
import { styles } from '../styles';
import type { DashboardStats } from '../types';

interface GestorStatsSectionProps {
  stats: DashboardStats;
  isLoading: boolean;
  isWideLayout: boolean;
}

export function GestorStatsSection({ stats, isLoading, isWideLayout }: GestorStatsSectionProps) {
  return (
    <View style={styles.statsGrid}>
      <View style={[styles.statCard, styles.statCardLarge, styles.statCardMain]}>
        <View style={styles.statCardHeader}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(77,200,90,0.2)' }]}>
            <FontAwesome6 name="calendar-check" size={20} color={THEME.leafLight} />
          </View>
          <View style={styles.statTrend}>
            <FontAwesome6 name="database" size={10} color={THEME.leafLight} />
            <Text style={styles.trendText}>Dados reais</Text>
          </View>
        </View>
        <Text style={styles.statValue}>{isLoading ? '...' : stats.visitasMes}</Text>
        <Text style={styles.statLabel}>Visitas Este Mês</Text>
      </View>

      <View style={[styles.statCard, styles.statSummaryCard, isWideLayout && styles.statSummaryCardWide]}>
        <View style={styles.statSummaryHeader}>
          <Text style={styles.statSummaryTitle}>Resumo Operacional</Text>
          <Text style={styles.statSummarySubtitle}>Panorama rápido do time e da base</Text>
        </View>

        <View style={styles.statSummaryList}>
          <View style={styles.statSummaryRow}>
            <View style={styles.statSummaryLeft}>
              <View style={[styles.statSummaryIcon, { backgroundColor: 'rgba(91,156,255,0.2)' }]}>
                <FontAwesome6 name="users" size={15} color={THEME.blue} />
              </View>
              <Text style={styles.statSummaryLabel}>Instrutores</Text>
            </View>
            <Text style={styles.statSummaryValue}>{isLoading ? '...' : stats.instrutores}</Text>
          </View>

          <View style={styles.statSummaryDivider} />

          <View style={styles.statSummaryRow}>
            <View style={styles.statSummaryLeft}>
              <View style={[styles.statSummaryIcon, { backgroundColor: 'rgba(245,200,66,0.2)' }]}>
                <FontAwesome6 name="house-chimney" size={15} color={THEME.gold} />
              </View>
              <Text style={styles.statSummaryLabel}>Propriedades</Text>
            </View>
            <Text style={styles.statSummaryValue}>{isLoading ? '...' : stats.propriedades}</Text>
          </View>

          <View style={styles.statSummaryDivider} />

          <View style={styles.statSummaryRow}>
            <View style={styles.statSummaryLeft}>
              <View style={[styles.statSummaryIcon, { backgroundColor: 'rgba(255,107,107,0.2)' }]}>
                <FontAwesome6 name="triangle-exclamation" size={15} color={THEME.error} />
              </View>
              <Text style={styles.statSummaryLabel}>Alertas</Text>
            </View>
            <Text style={styles.statSummaryValue}>{isLoading ? '...' : stats.alertas}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
