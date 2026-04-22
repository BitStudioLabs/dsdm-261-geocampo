import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InfoBox } from '@/features/proprietario/components/InfoBox';
import { InfoLine } from '@/features/proprietario/components/InfoLine';
import { useProprietarioFazendas } from '@/features/proprietario/hooks/useProprietarioFazendas';
import { PROPRIETARIO_THEME as THEME } from '@/features/proprietario/theme';
import { formatArea, leaseLabel, statusLabel } from '@/features/proprietario/utils/formatting';

export default function ProprietarioFazendasScreen() {
  const insets = useSafeAreaInsets();
  const { filteredProperties, handleRefresh, loading, properties, refreshing, search, setSearch } = useProprietarioFazendas();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.page} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={THEME.primary} />}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: Math.max(insets.top + 10, 28) }]}>
          <Text style={styles.title}>Minhas Fazendas</Text>
          <Text style={styles.subtitle}>Veja as propriedades vinculadas ao seu cadastro e os principais detalhes de cada uma.</Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={THEME.textSoft} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nome, municipio ou bairro"
            placeholderTextColor={THEME.textMuted}
          />
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={THEME.primary} />
            <Text style={styles.loadingText}>Carregando fazendas...</Text>
          </View>
        ) : !filteredProperties.length ? (
          <View style={styles.emptyCard}>
            <Ionicons name="business-outline" size={22} color={THEME.primary} />
            <Text style={styles.emptyTitle}>Nenhuma fazenda encontrada</Text>
            <Text style={styles.emptySubtitle}>
              {properties.length
                ? 'Nenhuma propriedade corresponde ao filtro atual.'
                : 'Ainda nao existem propriedades vinculadas ao seu cadastro.'}
            </Text>
          </View>
        ) : (
          filteredProperties.map((item) => (
            <View key={item.id} style={styles.propertyCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Ionicons name="home-outline" size={18} color={THEME.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.propertyName}>{item.nome}</Text>
                  <Text style={styles.propertyMeta}>
                    {item.municipio_nome ?? 'Municipio nao informado'}
                    {item.uf ? ` - ${item.uf}` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.pillsRow}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{statusLabel(item.status_propriedade)}</Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{leaseLabel(item.status_arrendamento)}</Text>
                </View>
              </View>

              <View style={styles.infoGrid}>
                <InfoBox label="Area total" value={`${formatArea(Number(item.area_total ?? 0))} ha`} />
                <InfoBox label="Contato" value={item.telefone ?? 'Nao informado'} />
              </View>

              <InfoLine
                icon="people-outline"
                text={
                  item.instrutores.length
                    ? `Instrutor${item.instrutores.length > 1 ? 'es' : ''}: ${item.instrutores.join(', ')}`
                    : 'Nenhum instrutor vinculado no momento'
                }
              />
              <InfoLine icon="location-outline" text={item.bairro ?? 'Bairro/zona nao informado'} />
              <InfoLine icon="flag-outline" text={item.referencia ?? 'Sem referencia cadastrada'} />
              <InfoLine icon="navigate-outline" text={item.como_chegar ?? 'Sem instrucoes de acesso cadastradas'} />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.page },
  content: { paddingBottom: 110 },
  hero: { backgroundColor: THEME.page, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: THEME.textSoft, fontSize: 14, lineHeight: 20 },
  searchWrap: { marginHorizontal: 18, marginTop: 16, marginBottom: 14, backgroundColor: THEME.panel, borderRadius: 18, borderWidth: 1, borderColor: THEME.line, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, padding: 0 },
  loadingCard: { marginHorizontal: 18, backgroundColor: THEME.panel, borderRadius: 18, borderWidth: 1, borderColor: THEME.line, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { color: THEME.textSoft, fontSize: 13, fontWeight: '600' },
  emptyCard: { marginHorizontal: 18, backgroundColor: THEME.panel, borderRadius: 22, borderWidth: 1, borderColor: THEME.line, padding: 22, alignItems: 'center', gap: 6 },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  emptySubtitle: { color: THEME.textSoft, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  propertyCard: { marginHorizontal: 18, marginBottom: 14, backgroundColor: THEME.panel, borderRadius: 22, borderWidth: 1, borderColor: THEME.line, padding: 16, shadowColor: '#030804', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.primarySoft },
  propertyName: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 3 },
  propertyMeta: { color: THEME.textSoft, fontSize: 12 },
  pillsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  pill: { backgroundColor: THEME.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: THEME.lineStrong },
  pillText: { color: THEME.primary, fontSize: 12, fontWeight: '700' },
  infoGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
});
