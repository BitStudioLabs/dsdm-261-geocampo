import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProprietarioStatCard } from '@/features/proprietario/components/ProprietarioStatCard';
import { useProprietarioHome } from '@/features/proprietario/hooks/useProprietarioHome';
import { PROPRIETARIO_THEME as THEME } from '@/features/proprietario/theme';
import { formatArea, statusLabel } from '@/features/proprietario/utils/formatting';

export default function ProprietarioHomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    activePropertiesCount,
    displayName,
    handleRefresh,
    highlightedProperty,
    loading,
    refreshing,
    state,
    totalArea,
  } = useProprietarioHome();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.page} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={THEME.primary} />}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: Math.max(insets.top + 10, 28) }]}>
          <Text style={styles.eyebrow}>Area do Proprietario</Text>
          <Text style={styles.title}>Ola, {displayName.split(' ')[0] ?? 'produtor'}</Text>
          <Text style={styles.subtitle}>
            Aqui voce acompanha suas fazendas cadastradas e o volume de visitas vinculadas ao seu cadastro.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <ProprietarioStatCard label="Fazendas" value={loading ? '...' : state.properties.length} icon="business-outline" />
          <ProprietarioStatCard label="Area total" value={loading ? '...' : `${formatArea(totalArea)} ha`} icon="map-outline" />
          <ProprietarioStatCard label="Visitas" value={loading ? '...' : state.visitsCount} icon="clipboard-outline" />
          <ProprietarioStatCard label="Ativas" value={loading ? '...' : activePropertiesCount} icon="leaf-outline" />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Resumo rapido</Text>
            <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/(tabs-proprietario)/fazendas')}>
              <Text style={styles.sectionAction}>Ver fazendas</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={THEME.primary} />
              <Text style={styles.loadingText}>Carregando informacoes...</Text>
            </View>
          ) : !highlightedProperty ? (
            <View style={styles.emptyCard}>
              <Ionicons name="home-outline" size={22} color={THEME.primary} />
              <Text style={styles.emptyTitle}>Nenhuma fazenda vinculada</Text>
              <Text style={styles.emptySubtitle}>
                Quando um gestor vincular uma propriedade ao seu cadastro, ela aparecera nesta area.
              </Text>
            </View>
          ) : (
            <View style={styles.highlightCard}>
              <Text style={styles.highlightTitle}>{highlightedProperty.nome}</Text>
              <Text style={styles.highlightMeta}>
                {highlightedProperty.municipio_nome ?? 'Municipio não informado'}
                {highlightedProperty.uf ? ` - ${highlightedProperty.uf}` : ''}
              </Text>
              <View style={styles.highlightRow}>
                <View style={styles.highlightPill}>
                  <Text style={styles.highlightPillText}>{statusLabel(highlightedProperty.status_propriedade)}</Text>
                </View>
                <Text style={styles.highlightArea}>{formatArea(Number(highlightedProperty.area_total ?? 0))} ha</Text>
              </View>
              <Text style={styles.highlightInstructor}>
                {highlightedProperty.instrutores.length
                  ? `Instrutor responsavel: ${highlightedProperty.instrutores.join(', ')}`
                  : 'Nenhum instrutor vinculado no momento'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acessos rapidos</Text>

          <TouchableOpacity style={styles.linkCard} activeOpacity={0.92} onPress={() => router.push('/(tabs-proprietario)/fazendas')}>
            <View style={styles.linkIcon}>
              <Ionicons name="business-outline" size={18} color={THEME.primary} />
            </View>
            <View style={styles.linkCopy}>
              <Text style={styles.linkTitle}>Minhas fazendas</Text>
              <Text style={styles.linkSubtitle}>Consulte area, municipio e status das propriedades vinculadas.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkCard} activeOpacity={0.92} onPress={() => router.push('/(tabs-proprietario)/perfil')}>
            <View style={styles.linkIcon}>
              <Ionicons name="person-outline" size={18} color={THEME.primary} />
            </View>
            <View style={styles.linkCopy}>
              <Text style={styles.linkTitle}>Meu perfil</Text>
              <Text style={styles.linkSubtitle}>Atualize telefone, foto e dados principais do seu cadastro.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.page },
  content: { paddingBottom: 110 },
  hero: { backgroundColor: THEME.page, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 26 },
  eyebrow: { color: THEME.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: THEME.textSoft, fontSize: 14, lineHeight: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16, marginBottom: 16, paddingHorizontal: 18 },
  section: { backgroundColor: THEME.panel, borderRadius: 22, padding: 16, marginBottom: 14, marginHorizontal: 18, borderWidth: 1, borderColor: THEME.line, shadowColor: '#030804', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: THEME.primary, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  sectionAction: { color: THEME.primary, fontSize: 13, fontWeight: '700' },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  loadingText: { color: THEME.textSoft, fontSize: 13, fontWeight: '600' },
  emptyCard: { alignItems: 'center', paddingVertical: 18, gap: 6, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: THEME.lineStrong, backgroundColor: THEME.panelStrong },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  emptySubtitle: { color: THEME.textSoft, fontSize: 13, lineHeight: 18, textAlign: 'center', paddingHorizontal: 10 },
  highlightCard: { borderRadius: 18, padding: 16, backgroundColor: THEME.panelStrong, borderWidth: 1, borderColor: THEME.line },
  highlightTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 4 },
  highlightMeta: { color: THEME.textSoft, fontSize: 13, marginBottom: 10 },
  highlightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  highlightPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: THEME.primarySoft, borderWidth: 1, borderColor: THEME.lineStrong },
  highlightPillText: { color: THEME.primary, fontSize: 12, fontWeight: '700' },
  highlightArea: { color: '#fff', fontSize: 13, fontWeight: '800' },
  highlightInstructor: { color: THEME.textSoft, fontSize: 12, lineHeight: 18, marginTop: 10 },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: THEME.panelStrong, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: THEME.line, marginTop: 10 },
  linkIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.primarySoft },
  linkCopy: { flex: 1 },
  linkTitle: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  linkSubtitle: { color: THEME.textSoft, fontSize: 12, lineHeight: 17 },
});
