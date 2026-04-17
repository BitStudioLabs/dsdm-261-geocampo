import React from 'react';
import { Image } from 'expo-image';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EmptyStateCard } from '@/features/instrutor/components/EmptyStateCard';
import { FeedbackCard } from '@/features/instrutor/components/FeedbackCard';
import { HeroHeaderCard } from '@/features/instrutor/components/HeroHeaderCard';
import { LoadingState } from '@/features/instrutor/components/LoadingState';
import { useInstructorDashboard } from '@/features/instrutor/hooks/useInstructorDashboard';
import type { DashboardFilter, DashboardItem, StatusType } from '@/features/instrutor/types/dashboard';

const THEME = {
  page: '#06180a',
  hero: '#0a2711',
  heroSoft: '#14341c',
  panel: '#0f2116',
  line: 'rgba(122, 217, 140, 0.14)',
  lineStrong: 'rgba(122, 217, 140, 0.3)',
  primary: '#59d27c',
  primarySoft: 'rgba(89, 210, 124, 0.16)',
  yellow: '#f2c94c',
  blue: '#67b8ff',
  success: '#38d39f',
  textSoft: 'rgba(240, 247, 241, 0.72)',
};

function getStatusStyle(status: StatusType) {
  switch (status) {
    case 'Hoje':
      return { bg: 'rgba(89,210,124,0.12)', text: THEME.primary, dot: THEME.primary, icon: 'sunny-outline' as const };
    case 'Agendada':
      return { bg: 'rgba(242,201,76,0.14)', text: THEME.yellow, dot: THEME.yellow, icon: 'calendar-outline' as const };
    case 'Em andamento':
      return { bg: 'rgba(103,184,255,0.14)', text: THEME.blue, dot: THEME.blue, icon: 'time-outline' as const };
    default:
      return { bg: 'rgba(56,211,159,0.14)', text: THEME.success, dot: THEME.success, icon: 'checkmark-done-outline' as const };
  }
}

export default function DashboardScreen() {
  const {
    activeFilter,
    activeSummaryText,
    avatarUrl,
    errorMessage,
    filteredProperties,
    handleRefresh,
    isLoading,
    refreshing,
    sectionCopy,
    setActiveFilter,
    shortName,
    statCards,
    stats,
  } = useInstructorDashboard();

  const renderItem = ({ item, index }: { item: DashboardItem; index: number }) => {
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity activeOpacity={0.9} style={[styles.visitCard, index === 0 && styles.firstVisitCard]}>
        <View style={[styles.visitIconWrap, { backgroundColor: item.iconeBg }]}>
          <Ionicons name={item.icone} size={22} color={THEME.hero} />
        </View>

        <View style={styles.visitBody}>
          <View style={styles.visitHeaderRow}>
            <Text style={styles.visitTitle}>{item.nome}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} />
              <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{item.status}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={THEME.yellow} />
            <Text style={styles.metaText}>{item.local}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="compass-outline" size={14} color={THEME.primary} />
            <Text style={styles.metaText}>{item.distancia}</Text>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.datePill}>
              <Ionicons name="calendar-outline" size={13} color={THEME.primary} />
              <Text style={styles.datePillText}>{item.visitaEm}</Text>
            </View>
            <View style={[styles.dot, { backgroundColor: statusStyle.dot }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.page} />

      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={THEME.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <View style={styles.heroGlowLarge} />
              <View style={styles.heroGlowSmall} />

              <View style={styles.topRow}>
                <View style={styles.greetingBlock}>
                  <Text style={styles.greeting}>Painel do instrutor</Text>
                  <Text style={styles.userName}>Olá, {shortName}</Text>
                  <Text style={styles.userSubtitle}>{activeSummaryText}</Text>
                </View>

                <View style={styles.avatarShell}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
                  ) : (
                    <Ionicons name="person" size={24} color="#fff" />
                  )}
                </View>
              </View>

              <HeroHeaderCard
                eyebrow="Seu ritmo de campo"
                title={sectionCopy.title}
                description={sectionCopy.description}
                metricLabel="Em foco"
                metricValue={
                  isLoading ? '...' : activeFilter === 'concluidas' ? stats.concluidas : activeFilter === 'hoje' ? stats.hoje : stats.atribuidas
                }
                containerStyle={styles.heroCard}
                copyStyle={styles.heroCardCopy}
                eyebrowStyle={styles.heroEyebrow}
                titleStyle={styles.heroTitle}
                descriptionStyle={styles.heroDescription}
                metricStyle={styles.heroMetric}
                metricLabelStyle={styles.heroMetricLabel}
                metricValueStyle={styles.heroMetricValue}
              />
            </View>

            <View style={styles.segmentWrap}>
              {statCards.map((item) => {
                const isActive = item.id === activeFilter;

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.92}
                    onPress={() => setActiveFilter(item.id)}
                    style={[styles.segmentCard, isActive && styles.segmentCardActive]}>
                    <View style={styles.segmentTopRow}>
                      <View style={[styles.segmentIconWrap, isActive && styles.segmentIconWrapActive]}>
                        <Ionicons name={item.icon} size={16} color={isActive ? THEME.hero : THEME.primary} />
                      </View>
                      {isActive ? <View style={styles.activePill}><Text style={styles.activePillText}>Ativo</Text></View> : null}
                    </View>

                    <Text style={styles.segmentValue}>{isLoading ? '...' : item.value}</Text>
                    <Text style={styles.segmentLabel}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>{sectionCopy.eyebrow}</Text>
                <Text style={styles.sectionHeading}>
                  {activeFilter === 'atribuidas'
                    ? 'Sua fila de visitas'
                    : activeFilter === 'hoje'
                      ? 'O que precisa acontecer hoje'
                      : 'Registros já finalizados'}
                </Text>
              </View>

              <View style={styles.counterPill}>
                <Ionicons name="albums-outline" size={14} color={THEME.primary} />
                <Text style={styles.counterPillText}>{filteredProperties.length}</Text>
              </View>
            </View>

            {errorMessage ? (
              <FeedbackCard
                text={errorMessage}
                iconColor={THEME.yellow}
                containerStyle={styles.feedbackCard}
                textStyle={styles.feedbackText}
              />
            ) : null}

            {isLoading ? (
              <LoadingState
                color={THEME.primary}
                size="large"
                text="Carregando sua rotina de campo..."
                containerStyle={styles.loadingWrap}
                textStyle={styles.loadingText}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyStateCard
              icon="trail-sign-outline"
              iconColor={THEME.primary}
              title="Nada para mostrar nesta visão"
              description="Quando houver registros nessa categoria, eles vão aparecer aqui para você acompanhar."
              containerStyle={styles.emptyState}
              iconWrapStyle={styles.emptyIconWrap}
              titleStyle={styles.emptyTitle}
              descriptionStyle={styles.emptyDescription}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.page },
  listContent: { paddingBottom: 120 },
  hero: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26, backgroundColor: THEME.page, overflow: 'hidden' },
  heroGlowLarge: { position: 'absolute', width: 280, height: 280, borderRadius: 999, backgroundColor: 'rgba(89,210,124,0.09)', top: -160, right: -70 },
  heroGlowSmall: { position: 'absolute', width: 180, height: 180, borderRadius: 999, backgroundColor: 'rgba(242,201,76,0.06)', top: 40, left: -90 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  greetingBlock: { flex: 1, paddingRight: 16 },
  greeting: { color: THEME.primary, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  userName: { color: '#fff', fontSize: 30, lineHeight: 34, fontWeight: '800', marginBottom: 6 },
  userSubtitle: { color: THEME.textSoft, fontSize: 14, lineHeight: 20 },
  avatarShell: { width: 54, height: 54, borderRadius: 18, overflow: 'hidden', backgroundColor: '#93663d', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)' },
  avatarImage: { width: '100%', height: '100%' },
  heroCard: { backgroundColor: THEME.hero, borderRadius: 26, borderWidth: 1, borderColor: THEME.lineStrong, padding: 18, flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
  heroCardCopy: { flex: 1 },
  heroEyebrow: { color: THEME.primary, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  heroTitle: { color: '#fff', fontSize: 22, lineHeight: 28, fontWeight: '800', marginBottom: 8 },
  heroDescription: { color: THEME.textSoft, fontSize: 14, lineHeight: 20 },
  heroMetric: { minWidth: 68, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 16, backgroundColor: THEME.primarySoft, alignItems: 'center' },
  heroMetricLabel: { color: THEME.primary, fontSize: 10, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase' },
  heroMetricValue: { color: '#fff', fontSize: 22, lineHeight: 26, fontWeight: '800' },
  segmentWrap: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  segmentCard: { flex: 1, backgroundColor: THEME.panel, borderRadius: 22, borderWidth: 1, borderColor: THEME.line, padding: 14 },
  segmentCardActive: { backgroundColor: THEME.heroSoft, borderColor: THEME.primary, shadowColor: THEME.primary, shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  segmentTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  segmentIconWrap: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.primarySoft },
  segmentIconWrapActive: { backgroundColor: THEME.primary },
  activePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  activePillText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  segmentValue: { color: '#fff', fontSize: 26, lineHeight: 30, fontWeight: '800', marginBottom: 4 },
  segmentLabel: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 3 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionEyebrow: { color: THEME.primary, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  sectionHeading: { color: '#fff', fontSize: 20, lineHeight: 24, fontWeight: '800', maxWidth: 260 },
  counterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: THEME.panel, borderRadius: 999, borderWidth: 1, borderColor: THEME.line, paddingHorizontal: 12, paddingVertical: 8 },
  counterPillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  feedbackCard: { marginHorizontal: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(242,201,76,0.12)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(242,201,76,0.18)', padding: 14 },
  feedbackText: { flex: 1, color: '#f2dfaa', fontSize: 13, lineHeight: 18 },
  loadingWrap: { paddingHorizontal: 20, paddingVertical: 34, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: THEME.textSoft, fontSize: 13, marginTop: 12 },
  visitCard: { marginHorizontal: 20, marginBottom: 12, backgroundColor: THEME.panel, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: THEME.line, flexDirection: 'row', gap: 14, shadowColor: '#030804', shadowOpacity: 0.24, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  firstVisitCard: { marginTop: 2 },
  visitIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  visitBody: { flex: 1 },
  visitHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  visitTitle: { flex: 1, color: '#fff', fontSize: 19, lineHeight: 23, fontWeight: '800' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  metaText: { flex: 1, color: THEME.textSoft, fontSize: 13, lineHeight: 18 },
  footerRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(89,210,124,0.14)', borderWidth: 1, borderColor: 'rgba(89,210,124,0.16)', paddingHorizontal: 10, paddingVertical: 8 },
  datePillText: { color: '#dff9e7', fontSize: 12, fontWeight: '700' },
  dot: { width: 10, height: 10, borderRadius: 999 },
  emptyState: { marginHorizontal: 20, marginTop: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 20, backgroundColor: THEME.panel, borderRadius: 24, borderWidth: 1, borderColor: THEME.line },
  emptyIconWrap: { width: 58, height: 58, borderRadius: 18, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptyDescription: { color: THEME.textSoft, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});

