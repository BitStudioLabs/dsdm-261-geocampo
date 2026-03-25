import React from 'react';
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
import { router } from 'expo-router';

import { colors } from '../src/theme/colors';

const CRITERIOS = [
  {
    id: '1',
    titulo: 'Distancia da propriedade',
    descricao: '87 metros - dentro do raio permitido (200m)',
    progresso: 0.92,
    icon: 'location',
    cor: colors.danger,
    status: 'ok',
  },
  {
    id: '2',
    titulo: 'Coerencia do IP',
    descricao: 'IP de Ribeirao Preto, SP - compativel',
    progresso: 0.84,
    icon: 'globe-outline',
    cor: colors.info,
    status: 'ok',
  },
  {
    id: '3',
    titulo: 'Padrao de deslocamento',
    descricao: 'Trajetoria coerente - sem saltos suspeitos',
    progresso: 0.88,
    icon: 'car-sport-outline',
    cor: colors.danger,
    status: 'ok',
  },
  {
    id: '4',
    titulo: 'Indicadores de VPN',
    descricao: 'Nenhum indicio detectado',
    progresso: 0.91,
    icon: 'lock-closed-outline',
    cor: colors.warning,
    status: 'ok',
  },
  {
    id: '5',
    titulo: 'Data e hora dos metadados',
    descricao: '24/05/2025 09:38 - coerente (+3 min)',
    progresso: 0.52,
    icon: 'time-outline',
    cor: colors.info,
    status: 'warning',
  },
] as const;

export default function AvaliadorScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={18} color={colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Analise de Autenticidade</Text>
              <Text style={styles.heroSubtitle}>Fazenda Santa Clara - 24/05/2025</Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreRing}>
              <View style={styles.scoreRingInner}>
                <Text style={styles.scoreValue}>94</Text>
              </View>
            </View>

            <View style={styles.scoreMeta}>
              <Text style={styles.scoreHeadline}>Alta Confiabilidade</Text>
              <Text style={styles.scoreDescription}>
                Localizacao verificada com sucesso e sem sinais relevantes de fraude.
              </Text>
              <View style={styles.validBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.validBadgeText}>Localizacao Valida</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.sectionTitle}>CRITERIOS DE ANALISE</Text>

          {CRITERIOS.map((criterio) => (
            <View key={criterio.id} style={styles.criteriaRow}>
              <View style={[styles.criteriaIcon, { backgroundColor: `${criterio.cor}1A` }]}>
                <Ionicons name={criterio.icon} size={18} color={criterio.cor} />
              </View>
              <View style={styles.criteriaContent}>
                <View style={styles.criteriaHeader}>
                  <Text style={styles.criteriaTitle}>{criterio.titulo}</Text>
                  <Ionicons
                    name={criterio.status === 'ok' ? 'checkmark' : 'warning-outline'}
                    size={16}
                    color={criterio.status === 'ok' ? colors.success : colors.warning}
                  />
                </View>
                <Text style={styles.criteriaDescription}>{criterio.descricao}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${criterio.progresso * 100}%` }]} />
                </View>
              </View>
            </View>
          ))}

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
            <Text style={styles.infoText}>
              Pequena divergencia de 3 minutos entre metadados da foto e horario do envio. Dentro
              da margem considerada normal.
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>94</Text>
              <Text style={styles.summaryLabel}>Score final</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>5/5</Text>
              <Text style={styles.summaryLabel}>Crit. verificados</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  content: {
    paddingBottom: 32,
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroHeader: {
    marginBottom: 24,
  },
  heroCopy: {
    gap: 4,
  },
  heroTitle: {
    color: colors.textLight,
    fontSize: 28,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#BDD4C7',
    fontSize: 13,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  scoreRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 8,
    borderColor: '#53C990',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    color: colors.textLight,
    fontSize: 28,
    fontWeight: '800',
  },
  scoreMeta: {
    flex: 1,
  },
  scoreHeadline: {
    color: colors.textLight,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  scoreDescription: {
    color: '#C7D8CF',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  validBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(88,193,142,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  validBadgeText: {
    color: '#91E0B6',
    fontSize: 12,
    fontWeight: '700',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 18,
    minHeight: 520,
  },
  sectionTitle: {
    color: '#938F87',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  criteriaRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0B1E17',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  criteriaIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  criteriaContent: {
    flex: 1,
  },
  criteriaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  criteriaTitle: {
    color: colors.textDark,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  criteriaDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  track: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E7E2D8',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.success,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFF7E6',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1D596',
    marginTop: 4,
    marginBottom: 14,
  },
  infoText: {
    flex: 1,
    color: '#7A6641',
    fontSize: 13,
    lineHeight: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  summaryNumber: {
    color: colors.primaryDark,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
