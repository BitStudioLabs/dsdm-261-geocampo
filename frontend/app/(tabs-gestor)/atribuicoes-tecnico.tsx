import { FontAwesome6 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/src/lib/supabase';

const THEME = {
  bg: '#0a1f0d',
  card: 'rgba(10,31,13,0.88)',
  border: 'rgba(77,200,90,0.14)',
  borderStrong: 'rgba(77,200,90,0.35)',
  white: '#ffffff',
  offWhite: '#f0f8f0',
  muted: 'rgba(255,255,255,0.55)',
  green: '#4dc85a',
  gold: '#f5c842',
  blue: '#5b9cff',
  red: '#ff6b6b',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.1)',
};

type InstrutorOption = {
  id: string;
  nome_completo: string | null;
  email: string | null;
  ativo: boolean;
};

type PropriedadeOption = {
  id: number;
  nome: string | null;
  municipio_nome: string | null;
  uf: string | null;
  status_propriedade: 'ativo' | 'inativo' | 'em_analise' | null;
};

type AtribuicaoRow = {
  id: number;
  id_propriedade: number;
  ativa: boolean;
};

export default function AtribuicoesTecnicoScreen() {
  const PAGE_SIZE_OPTIONS = [8, 16, 24];
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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
          if (PAGE_SIZE_OPTIONS.includes(parsed)) {
            setInstrutoresPageSize(parsed);
          }
        }

        if (storedPropriedades) {
          const parsed = parseInt(storedPropriedades, 10);
          if (PAGE_SIZE_OPTIONS.includes(parsed)) {
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
    setInstrutores(loadedInstrutores);
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
            <View style={styles.currentLinksCard}>
              <View style={styles.currentLinksHeader}>
                <Text style={styles.currentLinksTitle}>Vinculos atuais</Text>
                <Text style={styles.currentLinksMeta}>
                  {linkedProperties.length === 0 ? 'Nenhuma fazenda vinculada' : `${linkedProperties.length} vinculada(s)`}
                </Text>
              </View>

              {linkedProperties.length === 0 ? (
                <Text style={styles.currentLinksEmpty}>Este tecnico ainda nao possui fazendas vinculadas.</Text>
              ) : null}

              {linkedProperties.map((property) => (
                <View key={`linked-${property.id}`} style={styles.linkedPropertyRow}>
                  <View style={styles.linkedPropertyCopy}>
                    <Text style={styles.linkedPropertyTitle}>{property.nome ?? 'Propriedade sem nome'}</Text>
                    <Text style={styles.linkedPropertyMeta}>
                      {[property.municipio_nome, property.uf].filter(Boolean).join(' - ') || 'Localizacao nao informada'}
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
              {PAGE_SIZE_OPTIONS.map((size) => (
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
            return (
              <TouchableOpacity
                key={instrutor.id}
                style={[styles.optionCard, selected && styles.optionCardActive]}
                activeOpacity={0.88}
                onPress={() => setSelectedInstructorId(instrutor.id)}>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{instrutor.nome_completo ?? 'Tecnico sem nome'}</Text>
                  <Text style={styles.optionMeta}>{instrutor.email ?? 'E-mail não informado'}</Text>
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
              {PAGE_SIZE_OPTIONS.map((size) => (
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

          {feedback ? (
            <View style={[styles.feedbackBox, feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
              <Text style={styles.feedbackText}>{feedback.message}</Text>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 110, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  title: { color: THEME.white, fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: THEME.muted, fontSize: 14, lineHeight: 20 },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  loadingText: { color: THEME.muted, fontSize: 13 },
  sectionCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  currentLinksCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    gap: 10,
  },
  currentLinksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  currentLinksTitle: {
    color: THEME.white,
    fontSize: 14,
    fontWeight: '800',
  },
  currentLinksMeta: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  currentLinksEmpty: {
    color: THEME.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  linkedPropertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
  },
  linkedPropertyCopy: {
    flex: 1,
  },
  linkedPropertyTitle: {
    color: THEME.white,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  linkedPropertyMeta: {
    color: THEME.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,107,107,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.28)',
  },
  unlinkButtonText: {
    color: THEME.white,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: { color: THEME.white, fontSize: 17, fontWeight: '800' },
  sectionSubtitle: { color: THEME.muted, fontSize: 13, lineHeight: 18 },
  summaryPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(77,200,90,0.14)',
  },
  summaryPillText: { color: THEME.offWhite, fontSize: 12, fontWeight: '700' },
  paginationToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  paginationText: { color: THEME.offWhite, fontSize: 12, opacity: 0.9, flex: 1 },
  pageSizeControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageSizeButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pageSizeButtonActive: {
    backgroundColor: 'rgba(77,200,90,0.18)',
    borderColor: THEME.green,
  },
  pageSizeText: { color: THEME.white, fontSize: 12, fontWeight: '700' },
  pageSizeTextActive: { color: THEME.white },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.inputBg,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  searchInput: { flex: 1, color: THEME.white, fontSize: 14, padding: 0 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
  },
  optionCardActive: {
    backgroundColor: 'rgba(91,156,255,0.14)',
    borderColor: 'rgba(91,156,255,0.28)',
  },
  optionCopy: { flex: 1 },
  optionTitle: { color: THEME.white, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  optionMeta: { color: THEME.muted, fontSize: 12, lineHeight: 17 },
  propertyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
  },
  propertyCardActive: {
    backgroundColor: 'rgba(77,200,90,0.12)',
    borderColor: 'rgba(77,200,90,0.28)',
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    backgroundColor: THEME.green,
    borderColor: THEME.green,
  },
  pageNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  pageNavButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  pageNavButtonDisabled: { opacity: 0.4 },
  pageNavText: { color: THEME.white, fontSize: 12, fontWeight: '700' },
  pageNavTextDisabled: { color: 'rgba(255,255,255,0.55)' },
  pageNumberButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  pageNumberButtonActive: {
    backgroundColor: 'rgba(77,200,90,0.18)',
    borderColor: THEME.green,
  },
  pageNumberText: { color: THEME.white, fontSize: 12, fontWeight: '700' },
  pageNumberTextActive: { color: THEME.white },
  pageDots: { color: THEME.offWhite, fontSize: 14, paddingHorizontal: 6 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusActive: { backgroundColor: 'rgba(77,200,90,0.18)' },
  statusInactive: { backgroundColor: 'rgba(255,107,107,0.18)' },
  statusText: { color: THEME.white, fontSize: 11, fontWeight: '700' },
  feedbackBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  feedbackSuccess: { backgroundColor: 'rgba(77,200,90,0.15)', borderColor: 'rgba(77,200,90,0.35)' },
  feedbackError: { backgroundColor: 'rgba(255,107,107,0.15)', borderColor: 'rgba(255,107,107,0.35)' },
  feedbackText: { color: THEME.white, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  saveButton: {
    marginTop: 4,
    backgroundColor: THEME.blue,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveButtonText: { color: THEME.white, fontSize: 14, fontWeight: '800' },
});
