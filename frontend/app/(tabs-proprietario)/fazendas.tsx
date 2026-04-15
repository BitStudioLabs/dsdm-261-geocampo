import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme/colors';

const THEME = {
  sky: '#0f281a',
  gold: '#d8b45b',
  green: '#74d27d',
  border: 'rgba(216,180,91,0.18)',
};

type Property = {
  id: number;
  nome: string;
  municipio_nome: string | null;
  uf: string | null;
  area_total: number | null;
  status_propriedade: string | null;
  status_arrendamento: string | null;
  bairro: string | null;
  referencia: string | null;
  como_chegar: string | null;
  telefone: string | null;
  instrutores: string[];
};

function formatArea(area: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(area);
}

function statusLabel(status: string | null) {
  if (status === 'ativo') return 'Ativa';
  if (status === 'inativo') return 'Inativa';
  if (status === 'em_analise') return 'Em analise';
  return 'Sem status';
}

function leaseLabel(status: string | null) {
  if (status === 'arrendada') return 'Arrendada';
  if (status === 'parcialmente_arrendada') return 'Parcialmente arrendada';
  if (status === 'nao_arrendada') return 'Não arrendada';
  return 'Sem informação';
}

export default function ProprietarioFazendasScreen() {
  const insets = useSafeAreaInsets();
  const { profile, user, refreshProfile } = useAuth();
  const userId = profile?.id ?? user?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);

  const loadData = useCallback(async () => {
    if (!userId) {
      setProperties([]);
      return;
    }

    const { data: producerData, error: producerError } = await supabase
      .from('produtores')
      .select('id')
      .eq('usuario_id', userId)
      .maybeSingle();

    if (producerError) {
      throw producerError;
    }

    if (!producerData?.id) {
      setProperties([]);
      return;
    }

    const { data, error } = await supabase
      .from('propriedades')
      .select('id, nome, municipio_nome, uf, area_total, status_propriedade, status_arrendamento, bairro, referencia, como_chegar, telefone')
      .eq('id_produtor', producerData.id)
      .order('nome', { ascending: true });

    if (error) {
      throw error;
    }

    const baseProperties =
      ((data as Omit<Property, 'instrutores'>[] | null) ?? []).map((item) => ({
        ...item,
        instrutores: [] as string[],
      }));

    if (!baseProperties.length) {
      setProperties(baseProperties);
      return;
    }

    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('atribuicoes')
      .select('id_propriedade, id_instrutor, usuarios!atribuicoes_id_instrutor_fkey(nome_completo)')
      .in('id_propriedade', baseProperties.map((item) => item.id))
      .eq('ativa', true);

    if (assignmentsError) {
      throw assignmentsError;
    }

    const instrutoresPorPropriedade = new Map<number, string[]>();

    for (const row of (assignmentsData ?? []) as Array<{
      id_propriedade: number;
      id_instrutor: string | null;
      usuarios: { nome_completo: string | null } | { nome_completo: string | null }[] | null;
    }>) {
      const current = instrutoresPorPropriedade.get(row.id_propriedade) ?? [];
      const relatedUsers = Array.isArray(row.usuarios) ? row.usuarios : row.usuarios ? [row.usuarios] : [];

      for (const relatedUser of relatedUsers) {
        if (relatedUser?.nome_completo && !current.includes(relatedUser.nome_completo)) {
          current.push(relatedUser.nome_completo);
        }
      }

      if (!relatedUsers.length && row.id_instrutor) {
        const fallbackLabel = current.length > 0 ? `Instrutor vinculado ${current.length + 1}` : 'Instrutor vinculado';
        if (!current.includes(fallbackLabel)) {
          current.push(fallbackLabel);
        }
      }

      instrutoresPorPropriedade.set(row.id_propriedade, current);
    }

    setProperties(
      baseProperties.map((item) => ({
        ...item,
        instrutores: instrutoresPorPropriedade.get(item.id) ?? [],
      }))
    );
  }, [userId]);

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      try {
        await loadData();
      } catch (error) {
        console.error('Erro ao carregar fazendas do proprietario:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshProfile(), loadData()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadData, refreshProfile]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return properties;

    return properties.filter((item) =>
      [item.nome, item.municipio_nome, item.uf, item.bairro]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [properties, search]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.gold} />}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: Math.max(insets.top + 10, 28) }]}>
          <Text style={styles.title}>Minhas Fazendas</Text>
          <Text style={styles.subtitle}>Veja as propriedades vinculadas ao seu cadastro e os principais detalhes de cada uma.</Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nome, municipio ou bairro"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={THEME.green} />
            <Text style={styles.loadingText}>Carregando fazendas...</Text>
          </View>
        ) : !filtered.length ? (
          <View style={styles.emptyCard}>
            <Ionicons name="business-outline" size={22} color={THEME.gold} />
            <Text style={styles.emptyTitle}>Nenhuma fazenda encontrada</Text>
            <Text style={styles.emptySubtitle}>
              {properties.length
                ? 'Nenhuma propriedade corresponde ao filtro atual.'
                : 'Ainda não existem propriedades vinculadas ao seu cadastro.'}
            </Text>
          </View>
        ) : (
          filtered.map((item) => (
            <View key={item.id} style={styles.propertyCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Ionicons name="home-outline" size={18} color={THEME.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.propertyName}>{item.nome}</Text>
                  <Text style={styles.propertyMeta}>
                    {item.municipio_nome ?? 'Municipio não informado'}
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
                <InfoBox label="Contato" value={item.telefone ?? 'Não informado'} />
              </View>

              <InfoLine
                icon="people-outline"
                text={
                  item.instrutores.length
                    ? `Instrutor${item.instrutores.length > 1 ? 'es' : ''}: ${item.instrutores.join(', ')}`
                    : 'Nenhum instrutor vinculado no momento'
                }
              />

              <InfoLine icon="location-outline" text={item.bairro ?? 'Bairro/zona não informado'} />
              <InfoLine icon="flag-outline" text={item.referencia ?? 'Sem referencia cadastrada'} />
              <InfoLine icon="navigate-outline" text={item.como_chegar ?? 'Sem instrucoes de acesso cadastradas'} />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoBoxLabel}>{label}</Text>
      <Text style={styles.infoBoxValue}>{value}</Text>
    </View>
  );
}

function InfoLine({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoLine}>
      <Ionicons name={icon} size={15} color={THEME.green} />
      <Text style={styles.infoLineText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 110 },
  hero: { backgroundColor: THEME.sky, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 20 },
  searchWrap: { marginHorizontal: 18, marginTop: 16, marginBottom: 14, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, color: colors.textDark, fontSize: 14, padding: 0 },
  loadingCard: { marginHorizontal: 18, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: THEME.border, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  emptyCard: { marginHorizontal: 18, backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: THEME.border, padding: 22, alignItems: 'center', gap: 6 },
  emptyTitle: { color: colors.textDark, fontSize: 15, fontWeight: '800' },
  emptySubtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  propertyCard: { marginHorizontal: 18, marginBottom: 14, backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: THEME.border, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(216,180,91,0.15)' },
  propertyName: { color: colors.textDark, fontSize: 16, fontWeight: '800', marginBottom: 3 },
  propertyMeta: { color: colors.textMuted, fontSize: 12 },
  pillsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  pill: { backgroundColor: colors.cardMuted, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: THEME.border },
  pillText: { color: colors.textDark, fontSize: 12, fontWeight: '700' },
  infoGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  infoBox: { flex: 1, backgroundColor: colors.cardMuted, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: THEME.border },
  infoBoxLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  infoBoxValue: { color: colors.textDark, fontSize: 13, fontWeight: '800' },
  infoLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  infoLineText: { flex: 1, color: colors.textDark, fontSize: 13, lineHeight: 18 },
});
