import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme/colors';

const THEME = {
  sky: '#0f281a',
  cardDark: 'rgba(15,40,26,0.88)',
  gold: '#d8b45b',
  green: '#74d27d',
  border: 'rgba(216,180,91,0.18)',
};

type Producer = {
  id: number;
  nome: string | null;
};

type Property = {
  id: number;
  nome: string;
  municipio_nome: string | null;
  uf: string | null;
  area_total: number | null;
  status_propriedade: string | null;
  instrutores: string[];
};

type DashboardState = {
  producer: Producer | null;
  properties: Property[];
  visitsCount: number;
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

export default function ProprietarioHomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, user, refreshProfile } = useAuth();
  const userId = profile?.id ?? user?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<DashboardState>({
    producer: null,
    properties: [],
    visitsCount: 0,
  });

  const loadData = useCallback(async () => {
    if (!userId) {
      setState({ producer: null, properties: [], visitsCount: 0 });
      return;
    }

    const { data: producerData, error: producerError } = await supabase
      .from('produtores')
      .select('id, nome')
      .eq('usuario_id', userId)
      .maybeSingle();

    if (producerError) {
      throw producerError;
    }

    if (!producerData?.id) {
      setState({ producer: null, properties: [], visitsCount: 0 });
      return;
    }

    const { data: propertiesData, error: propertiesError } = await supabase
      .from('propriedades')
      .select('id, nome, municipio_nome, uf, area_total, status_propriedade')
      .eq('id_produtor', producerData.id)
      .order('nome', { ascending: true });

    if (propertiesError) {
      throw propertiesError;
    }

    const baseProperties =
      ((propertiesData as Omit<Property, 'instrutores'>[] | null) ?? []).map((item) => ({
        ...item,
        instrutores: [] as string[],
      }));
    let visitsCount = 0;

    if (baseProperties.length > 0) {
      const { count, error: visitsError } = await supabase
        .from('visitas')
        .select('*', { count: 'exact', head: true })
        .in('id_propriedade', baseProperties.map((item) => item.id));

      if (visitsError) {
        throw visitsError;
      }

      visitsCount = count ?? 0;
    }

    const { data: assignmentsData, error: assignmentsError } = baseProperties.length
      ? await supabase
          .from('atribuicoes')
          .select('id_propriedade, id_instrutor, usuarios!atribuicoes_id_instrutor_fkey(nome_completo)')
          .in('id_propriedade', baseProperties.map((item) => item.id))
          .eq('ativa', true)
      : { data: [], error: null as any };

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

    const properties = baseProperties.map((item) => ({
      ...item,
      instrutores: instrutoresPorPropriedade.get(item.id) ?? [],
    }));

    setState({
      producer: producerData as Producer,
      properties,
      visitsCount,
    });
  }, [userId]);

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      try {
        await loadData();
      } catch (error) {
        console.error('Erro ao carregar painel do proprietario:', error);
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

  const displayName = useMemo(
    () => profile?.nomeCompleto ?? state.producer?.nome ?? user?.email ?? 'Proprietario Rural',
    [profile?.nomeCompleto, state.producer?.nome, user?.email]
  );

  const totalArea = useMemo(
    () => state.properties.reduce((sum, item) => sum + Number(item.area_total ?? 0), 0),
    [state.properties]
  );

  const lastProperty = state.properties[0] ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.sky} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.gold} />}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: Math.max(insets.top + 10, 28) }]}>
          <Text style={styles.eyebrow}>Area do Proprietario</Text>
          <Text style={styles.title}>Olá, {displayName.split(' ')[0] ?? 'produtor'}</Text>
          <Text style={styles.subtitle}>
            Aqui voce acompanha suas fazendas cadastradas e o volume de visitas vinculadas ao seu cadastro.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="Fazendas" value={loading ? '...' : String(state.properties.length)} icon="business-outline" />
          <StatCard label="Area total" value={loading ? '...' : `${formatArea(totalArea)} ha`} icon="map-outline" />
          <StatCard label="Visitas" value={loading ? '...' : String(state.visitsCount)} icon="clipboard-outline" />
          <StatCard
            label="Ativas"
            value={loading ? '...' : String(state.properties.filter((item) => item.status_propriedade === 'ativo').length)}
            icon="leaf-outline"
          />
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
              <ActivityIndicator color={THEME.green} />
              <Text style={styles.loadingText}>Carregando informacoes...</Text>
            </View>
          ) : !lastProperty ? (
            <View style={styles.emptyCard}>
              <Ionicons name="home-outline" size={22} color={THEME.gold} />
              <Text style={styles.emptyTitle}>Nenhuma fazenda vinculada</Text>
              <Text style={styles.emptySubtitle}>
                Quando um gestor vincular uma propriedade ao seu cadastro, ela aparecera nesta area.
              </Text>
            </View>
          ) : (
            <View style={styles.highlightCard}>
              <Text style={styles.highlightTitle}>{lastProperty.nome}</Text>
              <Text style={styles.highlightMeta}>
                {lastProperty.municipio_nome ?? 'Municipio não informado'}
                {lastProperty.uf ? ` - ${lastProperty.uf}` : ''}
              </Text>
              <View style={styles.highlightRow}>
                <View style={styles.highlightPill}>
                  <Text style={styles.highlightPillText}>{statusLabel(lastProperty.status_propriedade)}</Text>
                </View>
                <Text style={styles.highlightArea}>{formatArea(Number(lastProperty.area_total ?? 0))} ha</Text>
              </View>
              <Text style={styles.highlightInstructor}>
                {lastProperty.instrutores.length
                  ? `Instrutor responsavel: ${lastProperty.instrutores.join(', ')}`
                  : 'Nenhum instrutor vinculado no momento'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acessos rapidos</Text>

          <TouchableOpacity style={styles.linkCard} activeOpacity={0.92} onPress={() => router.push('/(tabs-proprietario)/fazendas')}>
            <View style={styles.linkIcon}>
              <Ionicons name="business-outline" size={18} color={THEME.gold} />
            </View>
            <View style={styles.linkCopy}>
              <Text style={styles.linkTitle}>Minhas fazendas</Text>
              <Text style={styles.linkSubtitle}>Consulte area, municipio e status das propriedades vinculadas.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkCard} activeOpacity={0.92} onPress={() => router.push('/(tabs-proprietario)/perfil')}>
            <View style={styles.linkIcon}>
              <Ionicons name="person-outline" size={18} color={THEME.green} />
            </View>
            <View style={styles.linkCopy}>
              <Text style={styles.linkTitle}>Meu perfil</Text>
              <Text style={styles.linkSubtitle}>Atualize telefone, foto e dados principais do seu cadastro.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color={THEME.gold} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 110 },
  hero: { backgroundColor: THEME.sky, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 26 },
  eyebrow: { color: THEME.gold, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16, marginBottom: 16, paddingHorizontal: 18 },
  statCard: { width: '48.5%', backgroundColor: colors.card, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: THEME.border },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(216,180,91,0.16)', marginBottom: 12 },
  statValue: { color: colors.textDark, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  statLabel: { color: colors.textMuted, fontSize: 12 },
  section: { backgroundColor: colors.card, borderRadius: 22, padding: 16, marginBottom: 14, marginHorizontal: 18, borderWidth: 1, borderColor: THEME.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: THEME.sky, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  sectionAction: { color: THEME.gold, fontSize: 13, fontWeight: '700' },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  emptyCard: { alignItems: 'center', paddingVertical: 18, gap: 6, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(216,180,91,0.35)' },
  emptyTitle: { color: colors.textDark, fontSize: 15, fontWeight: '800' },
  emptySubtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18, textAlign: 'center', paddingHorizontal: 10 },
  highlightCard: { borderRadius: 18, padding: 16, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: THEME.border },
  highlightTitle: { color: colors.textDark, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  highlightMeta: { color: colors.textMuted, fontSize: 13, marginBottom: 10 },
  highlightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  highlightPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: THEME.border },
  highlightPillText: { color: colors.textDark, fontSize: 12, fontWeight: '700' },
  highlightArea: { color: colors.textDark, fontSize: 13, fontWeight: '800' },
  highlightInstructor: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 10 },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.cardMuted, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: THEME.border, marginTop: 10 },
  linkIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(216,180,91,0.12)' },
  linkCopy: { flex: 1 },
  linkTitle: { color: colors.textDark, fontSize: 14, fontWeight: '800', marginBottom: 2 },
  linkSubtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
});
