import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../src/theme/colors';

const PERIODOS = ['7 dias', 'Mes', 'Ano'] as const;

type Periodo = (typeof PERIODOS)[number];

type ReportData = {
  score: string;
  delta: string;
  visitasLabel: string;
  visitasValor: string;
  alertasValor: string;
  alertas: readonly {
    id: string;
    title: string;
    subtitle: string;
    date: string;
    tone: 'danger' | 'warning';
    icon: keyof typeof Ionicons.glyphMap;
  }[];
  historico: readonly {
    id: string;
    title: string;
    date: string;
    score: number;
    icon: keyof typeof Ionicons.glyphMap;
  }[];
};

const RELATORIOS: Record<Periodo, ReportData> = {
  '7 dias': {
    score: '84.6',
    delta: '+1.4',
    visitasLabel: 'Visitas em 7 dias',
    visitasValor: '6',
    alertasValor: '1',
    alertas: [
      {
        id: '1',
        title: 'Sitio Boa Esperanca',
        subtitle: 'Score 61 - IP inconsistente com regiao',
        date: '22/05',
        tone: 'warning',
        icon: 'warning',
      },
    ],
    historico: [
      {
        id: '1',
        title: 'Faz. Santa Clara',
        date: '24/05/2025 - 09:41',
        score: 94,
        icon: 'leaf-outline',
      },
      {
        id: '2',
        title: 'Sitio Boa Esperanca',
        date: '22/05/2025 - 13:20',
        score: 61,
        icon: 'paw-outline',
      },
      {
        id: '3',
        title: 'Estancia Pedra Branca',
        date: '21/05/2025 - 15:00',
        score: 89,
        icon: 'rose-outline',
      },
    ],
  },
  Mes: {
    score: '87.4',
    delta: '+3.2',
    visitasLabel: 'Visitas no mes',
    visitasValor: '24',
    alertasValor: '2',
    alertas: [
      {
        id: '1',
        title: 'Chacara Vale Verde',
        subtitle: 'Score 22 - Alta prob. de VPN detectada',
        date: '23/05',
        tone: 'danger',
        icon: 'alert-circle',
      },
      {
        id: '2',
        title: 'Sitio Boa Esperanca',
        subtitle: 'Score 61 - IP inconsistente com regiao',
        date: '22/05',
        tone: 'warning',
        icon: 'warning',
      },
    ],
    historico: [
      {
        id: '1',
        title: 'Faz. Santa Clara',
        date: '24/05/2025 - 09:41',
        score: 94,
        icon: 'leaf-outline',
      },
      {
        id: '2',
        title: 'Sitio Boa Esperanca',
        date: '22/05/2025 - 13:20',
        score: 61,
        icon: 'paw-outline',
      },
      {
        id: '3',
        title: 'Chacara Vale Verde',
        date: '23/05/2025 - 08:10',
        score: 22,
        icon: 'nutrition-outline',
      },
      {
        id: '4',
        title: 'Rancho Ipe Amarelo',
        date: '20/05/2025 - 10:15',
        score: 97,
        icon: 'flower-outline',
      },
    ],
  },
  Ano: {
    score: '90.1',
    delta: '+6.8',
    visitasLabel: 'Visitas no ano',
    visitasValor: '86',
    alertasValor: '5',
    alertas: [
      {
        id: '1',
        title: 'Chacara Vale Verde',
        subtitle: 'Score 22 - Alta prob. de VPN detectada',
        date: '23/05',
        tone: 'danger',
        icon: 'alert-circle',
      },
      {
        id: '2',
        title: 'Sitio Boa Esperanca',
        subtitle: 'Score 61 - IP inconsistente com regiao',
        date: '22/05',
        tone: 'warning',
        icon: 'warning',
      },
      {
        id: '3',
        title: 'Fazenda Horizonte',
        subtitle: 'Score 58 - Divergencia de localizacao em abril',
        date: '17/04',
        tone: 'warning',
        icon: 'warning',
      },
    ],
    historico: [
      {
        id: '1',
        title: 'Faz. Santa Clara',
        date: '24/05/2025 - 09:41',
        score: 94,
        icon: 'leaf-outline',
      },
      {
        id: '2',
        title: 'Rancho Ipe Amarelo',
        date: '20/05/2025 - 10:15',
        score: 97,
        icon: 'flower-outline',
      },
      {
        id: '3',
        title: 'Fazenda Bela Vista',
        date: '18/05/2025 - 15:20',
        score: 91,
        icon: 'home-outline',
      },
      {
        id: '4',
        title: 'Sitio Boa Esperanca',
        date: '22/05/2025 - 13:20',
        score: 61,
        icon: 'paw-outline',
      },
      {
        id: '5',
        title: 'Chacara Vale Verde',
        date: '23/05/2025 - 08:10',
        score: 22,
        icon: 'nutrition-outline',
      },
    ],
  },
};

export default function RelatoriosScreen() {
  const [periodoAtivo, setPeriodoAtivo] = useState<Periodo>('Mes');

  const data = useMemo(() => RELATORIOS[periodoAtivo], [periodoAtivo]);
  const progressWidth = useMemo(
    () => `${Math.min(Number(data.score), 100)}%` as const,
    [data.score]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Relatorios</Text>
          <TouchableOpacity activeOpacity={0.9} style={styles.filterButton}>
            <Ionicons name="options-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.filterText}>Filtrar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.periodRow}>
          {PERIODOS.map((periodo) => {
            const ativo = periodoAtivo === periodo;

            return (
              <TouchableOpacity
                key={periodo}
                activeOpacity={0.9}
                onPress={() => setPeriodoAtivo(periodo)}
                style={[styles.periodChip, ativo && styles.periodChipActive]}>
                <Text style={[styles.periodChipText, ativo && styles.periodChipTextActive]}>
                  {periodo}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.scoreCard}>
          <View>
            <Text style={styles.scoreCaption}>
              Score medio do instrutor em {periodoAtivo === 'Mes' ? 'mes' : periodoAtivo.toLowerCase()}
            </Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreValue}>{data.score}</Text>
              <Text style={styles.scoreDelta}>{data.delta}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
          </View>
          <View style={styles.trophyWrap}>
            <Text style={styles.trophy}>T</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Ionicons name="clipboard-outline" size={22} color="#DF8E56" />
            <Text style={styles.summaryValue}>{data.visitasValor}</Text>
            <Text style={styles.summaryLabel}>{data.visitasLabel}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="warning-outline" size={22} color={colors.warning} />
            <Text style={[styles.summaryValue, styles.summaryDanger]}>{data.alertasValor}</Text>
            <Text style={styles.summaryLabel}>Alertas ativos</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ALERTAS DE POSSIVEL FRAUDE</Text>
          {data.alertas.map((alerta) => (
            <View key={alerta.id} style={styles.alertRow}>
              <View
                style={[
                  styles.alertIconWrap,
                  alerta.tone === 'danger' ? styles.alertDangerBg : styles.alertWarningBg,
                ]}>
                <Ionicons
                  name={alerta.icon}
                  size={16}
                  color={alerta.tone === 'danger' ? colors.danger : colors.warning}
                />
              </View>
              <View style={styles.alertTextWrap}>
                <Text style={styles.alertTitle}>{alerta.title}</Text>
                <Text style={styles.alertSubtitle}>{alerta.subtitle}</Text>
              </View>
              <Text style={styles.alertDate}>{alerta.date}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            HISTORICO DE VISITAS - {periodoAtivo.toUpperCase()}
          </Text>
          {data.historico.map((item) => (
            <TouchableOpacity key={item.id} activeOpacity={0.9} style={styles.historyRow}>
              <View style={styles.historyIconWrap}>
                <Ionicons name={item.icon} size={20} color={colors.primaryLight} />
              </View>
              <View style={styles.historyTextWrap}>
                <Text style={styles.historyTitle}>{item.title}</Text>
                <Text style={styles.historySubtitle}>{item.date}</Text>
              </View>
              <Text style={styles.historyScore}>{item.score}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    color: colors.textDark,
    fontSize: 31,
    fontWeight: '800',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DFF2E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  filterText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E0EFDF',
  },
  periodChipActive: {
    backgroundColor: colors.primaryDark,
  },
  periodChipText: {
    color: '#8AA68B',
    fontSize: 13,
    fontWeight: '700',
  },
  periodChipTextActive: {
    color: colors.textLight,
  },
  scoreCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreCaption: {
    color: '#C3D8CD',
    fontSize: 12,
    marginBottom: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  scoreValue: {
    color: colors.textLight,
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 44,
  },
  scoreDelta: {
    color: colors.primaryLight,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
  },
  progressTrack: {
    width: 160,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  trophyWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophy: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textLight,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#0B1E17',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  summaryValue: {
    marginTop: 10,
    color: colors.textDark,
    fontSize: 34,
    fontWeight: '800',
  },
  summaryDanger: {
    color: colors.danger,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0B1E17',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  sectionTitle: {
    color: '#98938A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBE7DE',
  },
  alertIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertDangerBg: {
    backgroundColor: '#FFE8E8',
  },
  alertWarningBg: {
    backgroundColor: '#FFF3D9',
  },
  alertTextWrap: {
    flex: 1,
  },
  alertTitle: {
    color: colors.textDark,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  alertSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  alertDate: {
    color: '#A49F95',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBE7DE',
  },
  historyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF5DF',
    marginRight: 12,
  },
  historyTextWrap: {
    flex: 1,
  },
  historyTitle: {
    color: colors.textDark,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  historySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  historyScore: {
    color: colors.success,
    fontSize: 26,
    fontWeight: '800',
    marginLeft: 10,
  },
});
