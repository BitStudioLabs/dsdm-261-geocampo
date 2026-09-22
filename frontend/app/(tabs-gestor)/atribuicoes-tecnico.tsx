import { FontAwesome6 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { FeedbackPickup } from '@/features/cadastro-usuario/components/FeedbackPickup';
import { ATRIBUICOES_PAGE_SIZE_OPTIONS, ATRIBUICOES_TECNICO_THEME as THEME } from '@/features/atribuicoes-tecnico/constants';
import { styles } from '@/features/atribuicoes-tecnico/styles';
import type { AtribuicaoRow, AtribuicoesFeedback, InstrutorOption, PropriedadeOption } from '@/features/atribuicoes-tecnico/types';
import { supabase } from '@/src/lib/supabase';

export default function AtribuicoesTecnicoScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const [instrutores, setInstrutores] = useState<InstrutorOption[]>([]);
  const [propriedades, setPropriedades] = useState<PropriedadeOption[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<number[]>([]);
  const [searchInstructor, setSearchInstructor] = useState('');
  const [searchProperty, setSearchProperty] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [instrutoresPage, setInstrutoresPage] = useState(1);
  const [instrutoresPageSize, setInstrutoresPageSize] = useState(8);
  const [propriedadesPage, setPropriedadesPage] = useState(1);
  const [propriedadesPageSize, setPropriedadesPageSize] = useState(8);
  const [feedback, setFeedback] = useState<AtribuicoesFeedback>(null);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    const loadStoredPageSizes = async () => {
      try {
        const [storedInstrutores, storedPropriedades] = await Promise.all([
          AsyncStorage.getItem('@atribuicoes_instrutores_pageSize'),
          AsyncStorage.getItem('@atribuicoes_propriedades_pageSize'),
        ]);

        if (storedInstrutores) {
          const parsed = parseInt(storedInstrutores, 10);
          if ((ATRIBUICOES_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)) {
            setInstrutoresPageSize(parsed);
          }
        }

        if (storedPropriedades) {
          const parsed = parseInt(storedPropriedades, 10);
          if ((ATRIBUICOES_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)) {
            setPropriedadesPageSize(parsed);
          }
        }
      } catch (error) {
        console.warn('Não foi possivel ler paginação de atribuições', error);
      }
    };

    loadStoredPageSizes();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('@atribuicoes_instrutores_pageSize', String(instrutoresPageSize)).catch((error) => {
      console.warn('Não foi possivel salvar paginação de tecnicos', error);
    });
  }, [instrutoresPageSize]);

  useEffect(() => {
    AsyncStorage.setItem('@atribuicoes_propriedades_pageSize', String(propriedadesPageSize)).catch((error) => {
      console.warn('Não foi possivel salvar paginação de propriedades', error);
    });
  }, [propriedadesPageSize]);

  const loadBaseData = async () => {
    const [instrutoresRes, propriedadesRes] = await Promise.all([
      supabase
        .from('usuarios')
        .select('id, nome_completo, email, ativo')
        .eq('perfil', 'instrutor')
        .order('nome_completo', { ascending: true }),
      supabase
        .from('propriedades')
        .select('id, nome, municipio_nome, uf, status_propriedade')
        .order('nome', { ascending: true }),
    ]);

    if (instrutoresRes.error) {
      throw instrutoresRes.error;
    }

    if (propriedadesRes.error) {
      throw propriedadesRes.error;
    }

    const loadedInstrutores = (instrutoresRes.data ?? []) as InstrutorOption[];
    const instrutorIds = loadedInstrutores.map((item) => item.id);

    const scoreRes = await supabase
      .from('vw_score_instrutores')
      .select('instrutor_id, score_medio')
      .in('instrutor_id', instrutorIds);

    if (scoreRes.error) {
      throw scoreRes.error;
    }

    const scoreById = new Map<string, number | null>(
      ((scoreRes.data ?? []) as Array<{ instrutor_id: string; score_medio: number | string | null }>).map((row) => [
        row.instrutor_id,
        row.score_medio == null ? null : Number(row.score_medio),
      ])
    );

    const loadedInstrutoresWithScore = loadedInstrutores.map((instrutor) => ({
      ...instrutor,
      score_medio: scoreById.get(instrutor.id) ?? null,
    }));

    setInstrutores(loadedInstrutoresWithScore);
    setPropriedades((propriedadesRes.data ?? []) as PropriedadeOption[]);

    const initialInstructorId =
      typeof params.userId === 'string' && loadedInstrutores.some((item) => item.id === params.userId)
        ? params.userId
        : loadedInstrutores[0]?.id ?? null;

    setSelectedInstructorId((current) => current ?? initialInstructorId);
  };

  const loadAssignments = async (instructorId: string) => {
    const { data, error } = await supabase
      .from('atribuicoes')
      .select('id, id_propriedade, ativa')
      .eq('id_instrutor', instructorId);

    if (error) {
      throw error;
    }

    const activeIds = ((data ?? []) as AtribuicaoRow[])
      .filter((item) => item.ativa)
      .map((item) => item.id_propriedade);

    setSelectedPropertyIds(activeIds);
  };

  useEffect(() => {
    let mounted = true;

    async function run() {
      setIsLoading(true);
      try {
        await loadBaseData();
      } catch (error) {
        console.error('Erro ao carregar dados de atribuição:', error);
        if (mounted) {
          setFeedback({ type: 'error', message: 'Não foi possivel carregar os dados de atribuição.' });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [params.userId]);

  useEffect(() => {
    if (!selectedInstructorId) {
      setSelectedPropertyIds([]);
      return;
    }

    loadAssignments(selectedInstructorId).catch((error) => {
      console.error('Erro ao carregar atribuições do tecnico:', error);
      setFeedback({ type: 'error', message: 'Não foi possivel carregar as fazendas deste tecnico.' });
    });
  }, [selectedInstructorId]);

  const filteredInstrutores = useMemo(() => {
    const term = searchInstructor.trim().toLowerCase();

    if (!term) {
      return instrutores;
    }

    return instrutores.filter((item) =>
      [item.nome_completo, item.email].filter(Boolean).some((value) => value?.toLowerCase().includes(term))
    );
  }, [instrutores, searchInstructor]);

  const filteredPropriedades = useMemo(() => {
    const term = searchProperty.trim().toLowerCase();

    if (!term) {
      return propriedades;
    }

    return propriedades.filter((item) =>
      [item.nome, item.municipio_nome, item.uf].filter(Boolean).some((value) => value?.toLowerCase().includes(term))
    );
  }, [propriedades, searchProperty]);

  const instrutoresTotalPages = Math.max(1, Math.ceil(filteredInstrutores.length / instrutoresPageSize));
  const propriedadesTotalPages = Math.max(1, Math.ceil(filteredPropriedades.length / propriedadesPageSize));

  useEffect(() => {
    if (instrutoresPage > instrutoresTotalPages) {
      setInstrutoresPage(instrutoresTotalPages);
    }
  }, [instrutoresPage, instrutoresTotalPages]);

  useEffect(() => {
    if (propriedadesPage > propriedadesTotalPages) {
      setPropriedadesPage(propriedadesTotalPages);
    }
  }, [propriedadesPage, propriedadesTotalPages]);

  useEffect(() => {
    setInstrutoresPage(1);
  }, [searchInstructor, instrutoresPageSize, instrutores]);

  useEffect(() => {
    setPropriedadesPage(1);
  }, [searchProperty, propriedadesPageSize, propriedades]);

  const paginatedInstrutores = useMemo(() => {
    const start = (instrutoresPage - 1) * instrutoresPageSize;
    return filteredInstrutores.slice(start, start + instrutoresPageSize);
  }, [filteredInstrutores, instrutoresPage, instrutoresPageSize]);

  const paginatedPropriedades = useMemo(() => {
    const start = (propriedadesPage - 1) * propriedadesPageSize;
    return filteredPropriedades.slice(start, start + propriedadesPageSize);
  }, [filteredPropriedades, propriedadesPage, propriedadesPageSize]);

  const instrutoresPageLinks = useMemo(() => {
    const pages: Array<number | '...'> = [];
    for (let i = 1; i <= instrutoresTotalPages; i += 1) {
      if (instrutoresTotalPages <= 7 || i <= 2 || i > instrutoresTotalPages - 2 || (i >= instrutoresPage - 1 && i <= instrutoresPage + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  }, [instrutoresPage, instrutoresTotalPages]);

  const propriedadesPageLinks = useMemo(() => {
    const pages: Array<number | '...'> = [];
    for (let i = 1; i <= propriedadesTotalPages; i += 1) {
      if (propriedadesTotalPages <= 7 || i <= 2 || i > propriedadesTotalPages - 2 || (i >= propriedadesPage - 1 && i <= propriedadesPage + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  }, [propriedadesPage, propriedadesTotalPages]);

  const selectedInstructor = useMemo(
    () => instrutores.find((item) => item.id === selectedInstructorId) ?? null,
    [instrutores, selectedInstructorId]
  );

  const linkedProperties = useMemo(
    () => propriedades.filter((property) => selectedPropertyIds.includes(property.id)),
    [propriedades, selectedPropertyIds]
  );

  const toggleProperty = (propertyId: number) => {
    setSelectedPropertyIds((current) =>
      current.includes(propertyId)
        ? current.filter((item) => item !== propertyId)
        : [...current, propertyId]
    );
  };

  const handleSave = async () => {
    if (!selectedInstructorId) {
      setFeedback({ type: 'error', message: 'Selecione um tecnico para continuar.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const { data, error } = await supabase
      .from('atribuicoes')
      .select('id, id_propriedade, ativa')
      .eq('id_instrutor', selectedInstructorId);

    if (error) {
      console.error('Erro ao carregar atribuições atuais:', error);
      setIsSaving(false);
      setFeedback({ type: 'error', message: 'Não foi possivel carregar as atribuições atuais.' });
      return;
    }

    const existingAssignments = (data ?? []) as AtribuicaoRow[];
    const selectedSet = new Set(selectedPropertyIds);
    const existingPropertyIds = new Set<number>();
    const operations: Array<Promise<{ error: any }>> = [];

    existingAssignments.forEach((assignment) => {
      existingPropertyIds.add(assignment.id_propriedade);

      if (selectedSet.has(assignment.id_propriedade) && !assignment.ativa) {
        operations.push(
          (async () =>
            supabase
              .from('atribuicoes')
              .update({ ativa: true, atualizado_em: new Date().toISOString() })
              .eq('id', assignment.id))()
        );
      }

      if (!selectedSet.has(assignment.id_propriedade) && assignment.ativa) {
        operations.push(
          (async () =>
            supabase
              .from('atribuicoes')
              .update({ ativa: false, atualizado_em: new Date().toISOString() })
              .eq('id', assignment.id))()
        );
      }
    });

    selectedPropertyIds.forEach((propertyId) => {
      if (!existingPropertyIds.has(propertyId)) {
        operations.push(
          (async () =>
            supabase.from('atribuicoes').insert({
              id_instrutor: selectedInstructorId,
              id_propriedade: propertyId,
              ativa: true,
              atualizado_em: new Date().toISOString(),
            }))()
        );
      }
    });

    const results = await Promise.all(operations);
    const failedOperation = results.find((result) => result.error);

    setIsSaving(false);

    if (failedOperation?.error) {
      console.error('Erro ao salvar atribuições:', failedOperation.error);
      setFeedback({ type: 'error', message: 'Não foi possivel salvar as atribuições de fazendas.' });
      return;
    }

    setFeedback({ type: 'success', message: 'Atribuições salvas com sucesso.' });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadBaseData();
      if (selectedInstructorId) {
        await loadAssignments(selectedInstructorId);
      }
      setFeedback(null);
    } catch (error) {
      console.error('Erro ao atualizar atribuições:', error);
      setFeedback({ type: 'error', message: 'Não foi possivel atualizar os dados.' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.root}>
      <FeedbackPickup feedback={feedback} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={THEME.green} />}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.88} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={14} color={THEME.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Atribuir Fazendas</Text>
            <Text style={styles.subtitle}>Vincule uma ou mais propriedades ao tecnico responsavel pelas visitas.</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={THEME.green} />
            <Text style={styles.loadingText}>Carregando tecnicos e propriedades...</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tecnico de Campo</Text>
          {selectedInstructor ? (
            <Text style={styles.selectedInstructorScore}>
              Score do tecnico: {selectedInstructor.score_medio != null ? `${Math.round(selectedInstructor.score_medio)}/100` : 'Sem score disponível'}
            </Text>
          ) : null}
          <View style={styles.searchBox}>
            <FontAwesome6 name="magnifying-glass" size={14} color={THEME.muted} />
            <TextInput
              value={searchInstructor}
              onChangeText={setSearchInstructor}
              placeholder="Buscar tecnico..."
              placeholderTextColor={THEME.muted}
              style={styles.searchInput}
            />
          </View>

          <View style={styles.paginationToolbar}>
            <Text style={styles.paginationText}>
              {filteredInstrutores.length === 0
                ? 'Nenhum tecnico para exibir'
                : `Mostrando ${(instrutoresPage - 1) * instrutoresPageSize + 1} a ${Math.min(instrutoresPage * instrutoresPageSize, filteredInstrutores.length)} de ${filteredInstrutores.length}`}
            </Text>
            <View style={styles.pageSizeControls}>
              {ATRIBUICOES_PAGE_SIZE_OPTIONS.map((size: number) => (
                <TouchableOpacity
                  key={`instrutores-${size}`}
                  style={[styles.pageSizeButton, instrutoresPageSize === size && styles.pageSizeButtonActive]}
                  onPress={() => setInstrutoresPageSize(size)}
                  activeOpacity={0.85}>
                  <Text style={[styles.pageSizeText, instrutoresPageSize === size && styles.pageSizeTextActive]}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {paginatedInstrutores.map((instrutor) => {
            const selected = instrutor.id === selectedInstructorId;
            const scoreLabel = instrutor.score_medio != null ? `${Math.round(instrutor.score_medio)}/100` : 'Sem score';
            return (
              <TouchableOpacity
                key={instrutor.id}
                style={[styles.optionCard, selected && styles.optionCardActive]}
                activeOpacity={0.88}
                onPress={() => setSelectedInstructorId(instrutor.id)}>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{instrutor.nome_completo ?? 'Tecnico sem nome'}</Text>
                  <Text style={styles.optionMeta}>{instrutor.email ?? 'E-mail não informado'}</Text>
                  <Text style={styles.optionMeta}>Score: {scoreLabel}</Text>
                </View>
                <View style={[styles.statusBadge, instrutor.ativo ? styles.statusActive : styles.statusInactive]}>
                  <Text style={styles.statusText}>{instrutor.ativo ? 'Ativo' : 'Inativo'}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredInstrutores.length > 0 ? (
            <View style={styles.pageNumberRow}>
              <TouchableOpacity
                style={[styles.pageNavButton, instrutoresPage === 1 && styles.pageNavButtonDisabled]}
                onPress={() => setInstrutoresPage(1)}
                disabled={instrutoresPage === 1}
                activeOpacity={0.85}>
                <Text style={[styles.pageNavText, instrutoresPage === 1 && styles.pageNavTextDisabled]}>1a</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pageNavButton, instrutoresPage === 1 && styles.pageNavButtonDisabled]}
                onPress={() => setInstrutoresPage((current) => Math.max(1, current - 1))}
                disabled={instrutoresPage === 1}
                activeOpacity={0.85}>
                <Text style={[styles.pageNavText, instrutoresPage === 1 && styles.pageNavTextDisabled]}>Anterior</Text>
              </TouchableOpacity>
              {instrutoresPageLinks.map((pageNumber, index) =>
                pageNumber === '...' ? (
                  <Text key={`instrutores-dots-${index}`} style={styles.pageDots}>...</Text>
                ) : (
                  <TouchableOpacity
                    key={`instrutores-page-${pageNumber}`}
                    style={[styles.pageNumberButton, pageNumber === instrutoresPage && styles.pageNumberButtonActive]}
                    onPress={() => setInstrutoresPage(pageNumber)}
                    activeOpacity={0.85}>
                    <Text style={[styles.pageNumberText, pageNumber === instrutoresPage && styles.pageNumberTextActive]}>{pageNumber}</Text>
                  </TouchableOpacity>
                )
              )}
              <TouchableOpacity
                style={[styles.pageNavButton, instrutoresPage === instrutoresTotalPages && styles.pageNavButtonDisabled]}
                onPress={() => setInstrutoresPage((current) => Math.min(instrutoresTotalPages, current + 1))}
                disabled={instrutoresPage === instrutoresTotalPages}
                activeOpacity={0.85}>
                <Text style={[styles.pageNavText, instrutoresPage === instrutoresTotalPages && styles.pageNavTextDisabled]}>Proxima</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pageNavButton, instrutoresPage === instrutoresTotalPages && styles.pageNavButtonDisabled]}
                onPress={() => setInstrutoresPage(instrutoresTotalPages)}
                disabled={instrutoresPage === instrutoresTotalPages}
                activeOpacity={0.85}>
                <Text style={[styles.pageNavText, instrutoresPage === instrutoresTotalPages && styles.pageNavTextDisabled]}>Ultima</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {selectedInstructor ? (
            <View style={styles.currentLinksCard}>
              <View style={styles.currentLinksHeader}>
                <Text style={styles.currentLinksTitle}>Vinculos atuais</Text>
                <Text style={styles.currentLinksMeta}>
                  {linkedProperties.length === 0 ? 'Nenhuma fazenda vinculada' : `${linkedProperties.length} vinculada(s)`}
                </Text>
              </View>

              {linkedProperties.length === 0 ? (
                <Text style={styles.currentLinksEmpty}>Este tecnico ainda não possui fazendas vinculadas.</Text>
              ) : null}

              {linkedProperties.map((property) => (
                <View key={`linked-${property.id}`} style={styles.linkedPropertyRow}>
                  <View style={styles.linkedPropertyCopy}>
                    <Text style={styles.linkedPropertyTitle}>{property.nome ?? 'Propriedade sem nome'}</Text>
                    <Text style={styles.linkedPropertyMeta}>
                      {[property.municipio_nome, property.uf].filter(Boolean).join(' - ') || 'Localizacao não informada'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.unlinkButton}
                    activeOpacity={0.88}
                    onPress={() => toggleProperty(property.id)}>
                    <FontAwesome6 name="link-slash" size={11} color={THEME.white} />
                    <Text style={styles.unlinkButtonText}>Retirar</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fazendas Vinculadas</Text>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryPillText}>{selectedPropertyIds.length} selecionadas</Text>
            </View>
          </View>

          <Text style={styles.sectionSubtitle}>
            {selectedInstructor
              ? `Selecione as propriedades que ficam sob responsabilidade de ${selectedInstructor.nome_completo ?? 'este tecnico'}.`
              : 'Escolha um tecnico para gerenciar as atribuições.'}
          </Text>

          <View style={styles.searchBox}>
            <FontAwesome6 name="magnifying-glass" size={14} color={THEME.muted} />
            <TextInput
              value={searchProperty}
              onChangeText={setSearchProperty}
              placeholder="Buscar fazenda por nome ou municipio..."
              placeholderTextColor={THEME.muted}
              style={styles.searchInput}
            />
          </View>

          <View style={styles.paginationToolbar}>
            <Text style={styles.paginationText}>
              {filteredPropriedades.length === 0
                ? 'Nenhuma fazenda para exibir'
                : `Mostrando ${(propriedadesPage - 1) * propriedadesPageSize + 1} a ${Math.min(propriedadesPage * propriedadesPageSize, filteredPropriedades.length)} de ${filteredPropriedades.length}`}
            </Text>
            <View style={styles.pageSizeControls}>
              {ATRIBUICOES_PAGE_SIZE_OPTIONS.map((size: number) => (
                <TouchableOpacity
                  key={`propriedades-${size}`}
                  style={[styles.pageSizeButton, propriedadesPageSize === size && styles.pageSizeButtonActive]}
                  onPress={() => setPropriedadesPageSize(size)}
                  activeOpacity={0.85}>
                  <Text style={[styles.pageSizeText, propriedadesPageSize === size && styles.pageSizeTextActive]}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {paginatedPropriedades.map((property) => {
            const checked = selectedPropertyIds.includes(property.id);
            return (
              <TouchableOpacity
                key={property.id}
                style={[styles.propertyCard, checked && styles.propertyCardActive]}
                activeOpacity={0.88}
                onPress={() => toggleProperty(property.id)}>
                <View style={[styles.checkBox, checked && styles.checkBoxActive]}>
                  {checked ? <FontAwesome6 name="check" size={11} color={THEME.white} /> : null}
                </View>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{property.nome ?? 'Propriedade sem nome'}</Text>
                  <Text style={styles.optionMeta}>
                    {[property.municipio_nome, property.uf].filter(Boolean).join(' - ') || 'Localização não informada'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, property.status_propriedade === 'ativo' ? styles.statusActive : styles.statusInactive]}>
                  <Text style={styles.statusText}>
                    {property.status_propriedade === 'em_analise'
                      ? 'Em analise'
                      : property.status_propriedade === 'inativo'
                        ? 'Inativa'
                        : 'Ativa'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredPropriedades.length > 0 ? (
            <View style={styles.pageNumberRow}>
              <TouchableOpacity
                style={[styles.pageNavButton, propriedadesPage === 1 && styles.pageNavButtonDisabled]}
                onPress={() => setPropriedadesPage(1)}
                disabled={propriedadesPage === 1}
                activeOpacity={0.85}>
                <Text style={[styles.pageNavText, propriedadesPage === 1 && styles.pageNavTextDisabled]}>1a</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pageNavButton, propriedadesPage === 1 && styles.pageNavButtonDisabled]}
                onPress={() => setPropriedadesPage((current) => Math.max(1, current - 1))}
                disabled={propriedadesPage === 1}
                activeOpacity={0.85}>
                <Text style={[styles.pageNavText, propriedadesPage === 1 && styles.pageNavTextDisabled]}>Anterior</Text>
              </TouchableOpacity>
              {propriedadesPageLinks.map((pageNumber, index) =>
                pageNumber === '...' ? (
                  <Text key={`propriedades-dots-${index}`} style={styles.pageDots}>...</Text>
                ) : (
                  <TouchableOpacity
                    key={`propriedades-page-${pageNumber}`}
                    style={[styles.pageNumberButton, pageNumber === propriedadesPage && styles.pageNumberButtonActive]}
                    onPress={() => setPropriedadesPage(pageNumber)}
                    activeOpacity={0.85}>
                    <Text style={[styles.pageNumberText, pageNumber === propriedadesPage && styles.pageNumberTextActive]}>{pageNumber}</Text>
                  </TouchableOpacity>
                )
              )}
              <TouchableOpacity
                style={[styles.pageNavButton, propriedadesPage === propriedadesTotalPages && styles.pageNavButtonDisabled]}
                onPress={() => setPropriedadesPage((current) => Math.min(propriedadesTotalPages, current + 1))}
                disabled={propriedadesPage === propriedadesTotalPages}
                activeOpacity={0.85}>
                <Text style={[styles.pageNavText, propriedadesPage === propriedadesTotalPages && styles.pageNavTextDisabled]}>Proxima</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pageNavButton, propriedadesPage === propriedadesTotalPages && styles.pageNavButtonDisabled]}
                onPress={() => setPropriedadesPage(propriedadesTotalPages)}
                disabled={propriedadesPage === propriedadesTotalPages}
                activeOpacity={0.85}>
                <Text style={[styles.pageNavText, propriedadesPage === propriedadesTotalPages && styles.pageNavTextDisabled]}>Ultima</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity style={styles.saveButton} activeOpacity={0.9} onPress={handleSave} disabled={isSaving || !selectedInstructorId}>
            {isSaving ? (
              <ActivityIndicator color={THEME.white} />
            ) : (
              <>
                <FontAwesome6 name="diagram-project" size={14} color={THEME.white} />
                <Text style={styles.saveButtonText}>Salvar atribuições</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
