import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { FeedbackPickup } from '@/features/cadastro-usuario/components/FeedbackPickup';
import { supabase } from '@/src/lib/supabase';

const THEME = {
  skyTop: '#0a1f0d',
  leafLight: '#4dc85a',
  gold: '#f5c842',
  blue: '#5b9cff',
  white: '#ffffff',
  offWhite: '#f0f8f0',
  textMuted: 'rgba(255,255,255,0.55)',
  cardBg: 'rgba(10,31,13,0.85)',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.1)',
  error: '#ff6b6b',
};

type UsuarioRow = {
  id: string;
  nome_completo: string | null;
  email: string | null;
  perfil: 'admin' | 'instrutor' | 'proprietario';
  telefone: string | null;
  ativo: boolean;
  id_regional: number | null;
  foto_url?: string | null;
};

type RegionalOption = {
  id: number;
  nome: string;
  uf: string;
};

type PropriedadeVinculada = {
  id: number;
  nome: string | null;
  municipio_nome: string | null;
  uf: string | null;
  projeto_nome: string | null;
  ativa: boolean;
};

type FeedbackState = {
  type: 'success' | 'error';
  message: string;
} | null;

type EditFormState = {
  nomeCompleto: string;
  telefone: string;
  perfil: UsuarioRow['perfil'];
  ativo: boolean;
  regionalId: number | null;
};

const ROLE_LABELS: Record<UsuarioRow['perfil'], string> = {
  admin: 'Gestor Institucional',
  instrutor: 'Tecnico de Campo',
  proprietario: 'Proprietario Rural',
};

const ROLE_EDIT_OPTIONS: { value: UsuarioRow['perfil']; label: string; hint: string }[] = [
  { value: 'admin', label: 'Gestor Institucional', hint: 'Gerencia usuarios, auditoria e operação.' },
  { value: 'instrutor', label: 'Tecnico de Campo', hint: 'Realiza visitas e acompanha propriedades.' },
  { value: 'proprietario', label: 'Proprietario Rural', hint: 'Acessa dados da fazenda e seu cadastro.' },
];

function getInitials(name: string | null, email: string | null) {
  const source = (name ?? email ?? 'Usuario').trim();
  return source
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getRegionalLabel(regionais: RegionalOption[], regionalId: number | null) {
  if (!regionalId) {
    return 'Regional não definida';
  }

  const regional = regionais.find((item) => item.id === regionalId);
  if (!regional) {
    return 'Regional não definida';
  }

  return `${regional.nome} (${regional.uf})`;
}

export default function UsuariosGestaoScreen() {
  const { width } = useWindowDimensions();
  const useTwoColumns = Platform.OS === 'web' && width >= 1080;
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UsuarioRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [linkedProperties, setLinkedProperties] = useState<Record<string, PropriedadeVinculada[]>>({});
  const [regionais, setRegionais] = useState<RegionalOption[]>([]);
  const [loadingPropertiesFor, setLoadingPropertiesFor] = useState<string | null>(null);
  const [form, setForm] = useState<EditFormState>({
    nomeCompleto: '',
    telefone: '',
    perfil: 'instrutor',
    ativo: true,
    regionalId: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const PAGE_SIZE_OPTIONS = [8, 16, 24];
  const [totalUsers, setTotalUsers] = useState(0);
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = setTimeout(() => {
      setFeedback(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    let mounted = true;

    const loadRegionais = async () => {
      const { data, error } = await supabase.from('regioes').select('id, nome, uf').order('nome');

      if (!mounted) {
        return;
      }

      if (error) {
        console.error('Erro ao carregar regionais:', error);
        return;
      }

      setRegionais((data ?? []) as RegionalOption[]);
    };

    loadRegionais();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const loadPageSize = async () => {
      try {
        const storedPageSize = await AsyncStorage.getItem('@instrutores_pageSize');
        if (storedPageSize) {
          const parsed = parseInt(storedPageSize, 10);
          if (PAGE_SIZE_OPTIONS.includes(parsed)) {
            setPageSize(parsed);
          }
        }
      } catch (err) {
        console.warn('Não foi possivel ler pageSize de Instrutores', err);
      }
    };

    loadPageSize();
  }, []);

  useEffect(() => {
    const storePageSize = async () => {
      try {
        await AsyncStorage.setItem('@instrutores_pageSize', String(pageSize));
      } catch (err) {
        console.warn('Não foi possivel salvar pageSize de Instrutores', err);
      }
    };

    storePageSize();
  }, [pageSize]);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome_completo, email, perfil, telefone, ativo, id_regional, foto_url')
      .order('nome_completo', { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as UsuarioRow[];
    setUsers(rows);
    setTotalUsers(rows.length);
  };

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setIsLoading(true);
      try {
        await loadUsers();
      } catch (error) {
        console.error('Erro ao carregar usuarios:', error);
        if (isMounted) {
          setFeedback({ type: 'error', message: 'Não foi possivel carregar os usuarios agora.' });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((item) => {
      const roleLabel = ROLE_LABELS[item.perfil].toLowerCase();
      return (
        item.nome_completo?.toLowerCase().includes(term) ||
        item.email?.toLowerCase().includes(term) ||
        roleLabel.includes(term)
      );
    });
  }, [search, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, users, pageSize, useInfiniteScroll]);

  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!useInfiniteScroll || isLoading || page >= totalPages) {
      return;
    }

    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 120) {
      setPage((current) => Math.min(totalPages, current + 1));
    }
  };

  const paginatedUsers = useMemo(() => {
    if (useInfiniteScroll) {
      return filteredUsers.slice(0, page * pageSize);
    }
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize, useInfiniteScroll]);

  const pageLinks = useMemo(() => {
    const pages: Array<number | '...'> = [];
    for (let i = 1; i <= totalPages; i += 1) {
      if (totalPages <= 7 || i <= 2 || i > totalPages - 2 || (i >= page - 1 && i <= page + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  }, [page, totalPages]);

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  useEffect(() => {
    if (!selectedUser) {
      return;
    }

    setForm({
      nomeCompleto: selectedUser.nome_completo ?? '',
      telefone: selectedUser.telefone ?? '',
      perfil: selectedUser.perfil,
      ativo: selectedUser.ativo,
      regionalId: selectedUser.id_regional ?? null,
    });

    if (selectedUser.perfil !== 'instrutor' || linkedProperties[selectedUser.id]) {
      return;
    }

    const selectedUserIdValue = selectedUser.id;
    setLoadingPropertiesFor(selectedUserIdValue);
    async function loadLinkedProperties() {
      try {
        const { data, error } = await supabase
          .from('atribuicoes')
          .select('ativa, propriedades(id, nome, municipio_nome, uf), projetos(nome)')
          .eq('id_instrutor', selectedUserIdValue);

        if (error) {
          console.error('Erro ao carregar propriedades vinculadas:', error);
          setLinkedProperties((current) => ({
            ...current,
            [selectedUserIdValue]: [],
          }));
          return;
        }

        const mapped = ((data ?? []) as any[]).map((item, index) => ({
          id: item.propriedades?.id ?? index,
          nome: item.propriedades?.nome ?? null,
          municipio_nome: item.propriedades?.municipio_nome ?? null,
          uf: item.propriedades?.uf ?? null,
          projeto_nome: item.projetos?.nome ?? null,
          ativa: item.ativa ?? false,
        }));

        setLinkedProperties((current) => ({
          ...current,
          [selectedUserIdValue]: mapped,
        }));
      } finally {
        setLoadingPropertiesFor((current) => (current === selectedUserIdValue ? null : current));
      }
    }

    loadLinkedProperties();
  }, [linkedProperties, selectedUser]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadUsers();
      setFeedback(null);
    } catch (error) {
      console.error('Erro ao atualizar usuarios:', error);
      setFeedback({ type: 'error', message: 'Não foi possivel atualizar a lista de usuarios.' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleUser = (userItem: UsuarioRow) => {
    if (selectedUserId === userItem.id) {
      setSelectedUserId(null);
      setFeedback(null);
      return;
    }

    setSelectedUserId(userItem.id);
    setFeedback(null);
  };

  const handleSave = async () => {
    if (!selectedUser) {
      return;
    }

    if (!form.nomeCompleto.trim()) {
      setFeedback({ type: 'error', message: 'Informe o nome completo do usuario.' });
      return;
    }

    if (!form.regionalId) {
      setFeedback({ type: 'error', message: 'Selecione a regional do usuario.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const { error } = await supabase
      .from('usuarios')
      .update({
        nome_completo: form.nomeCompleto.trim(),
        telefone: form.telefone.trim() || null,
        perfil: form.perfil,
        ativo: form.ativo,
        id_regional: form.regionalId,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', selectedUser.id);

    setIsSaving(false);

    if (error) {
      console.error('Erro ao atualizar usuario:', error);
      setFeedback({ type: 'error', message: 'Não foi possivel salvar as alterações do usuario.' });
      return;
    }

    setUsers((current) =>
      current.map((item) =>
        item.id === selectedUser.id
          ? {
              ...item,
              nome_completo: form.nomeCompleto.trim(),
              telefone: form.telefone.trim() || null,
              perfil: form.perfil,
              ativo: form.ativo,
              id_regional: form.regionalId,
            }
          : item
      )
    );
    setFeedback({ type: 'success', message: 'Usuario atualizado com sucesso.' });
  };

  const handleResetPassword = async () => {
    if (!selectedUser?.email) {
      setFeedback({ type: 'error', message: 'Este usuario não possui e-mail cadastrado para redefinição.' });
      return;
    }

    setIsResettingPassword(true);
    setFeedback(null);

    const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email);

    setIsResettingPassword(false);

    if (error) {
      console.error('Erro ao enviar redefinição de senha:', error);
      setFeedback({ type: 'error', message: 'Não foi possivel enviar o e-mail de redefinição de senha.' });
      return;
    }

    setFeedback({ type: 'success', message: 'E-mail de redefinição de senha enviado com sucesso.' });
  };

  const selectedProperties = selectedUser ? linkedProperties[selectedUser.id] ?? [] : [];

  return (
    <View style={styles.root}>
      <FeedbackPickup feedback={feedback} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={THEME.leafLight} />}>
        <Text style={styles.title}>Usuarios</Text>
        <Text style={styles.subtitle}>
          Liste, edite e acompanhe os vinculos dos usuarios. Para tecnicos de campo, as propriedades atribuidas aparecem no detalhe.
        </Text>

        <View style={styles.searchBox}>
          <FontAwesome6 name="magnifying-glass" size={16} color={THEME.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nome, e-mail ou perfil..."
            placeholderTextColor={THEME.textMuted}
            style={styles.searchInput}
          />
        </View>

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.9}
          onPress={() => router.push('/(tabs-gestor)/cadastro-usuario' as any)}>
          <FontAwesome6 name="user-plus" size={14} color={THEME.white} />
          <Text style={styles.addButtonText}>Cadastrar novo usuario</Text>
        </TouchableOpacity>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={THEME.leafLight} />
            <Text style={styles.loadingText}>Carregando usuarios...</Text>
          </View>
        ) : null}

        {!isLoading && filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome6 name="users-slash" size={18} color={THEME.gold} />
            <Text style={styles.emptyText}>Nenhum usuario encontrado com esse filtro.</Text>
          </View>
        ) : null}

        {!isLoading && filteredUsers.length > 0 ? (
          <View style={styles.paginationRow}>
            <View style={styles.paginationMainInfo}>
              <Text style={styles.paginationText}>
                {useInfiniteScroll
                  ? `Mostrando 1 a ${Math.min(page * pageSize, filteredUsers.length)} de ${filteredUsers.length}`
                  : `Mostrando ${(page - 1) * pageSize + 1} a ${Math.min(page * pageSize, filteredUsers.length)} de ${filteredUsers.length}`}
              </Text>
              <View style={styles.paginationModeControls}>
                <TouchableOpacity
                  style={[styles.modeButton, !useInfiniteScroll && styles.modeButtonActive]}
                  onPress={() => setUseInfiniteScroll(false)}
                  activeOpacity={0.85}>
                  <Text style={[styles.modeButtonText, !useInfiniteScroll && styles.modeButtonTextActive]}>Paginação</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, useInfiniteScroll && styles.modeButtonActive]}
                  onPress={() => setUseInfiniteScroll(true)}
                  activeOpacity={0.85}>
                  <Text style={[styles.modeButtonText, useInfiniteScroll && styles.modeButtonTextActive]}>Scroll infinito</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.pageSizeControls}>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[styles.pageSizeButton, pageSize === size && styles.pageSizeButtonActive]}
                  onPress={() => setPageSize(size)}
                  activeOpacity={0.85}>
                  <Text style={[styles.pageSizeText, pageSize === size && styles.pageSizeTextActive]}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {!isLoading && !useInfiniteScroll && filteredUsers.length > 0 ? (
          <View style={styles.pageNumberRow}>
            <TouchableOpacity
              style={[styles.pageNavButton, page === 1 && styles.pageNavButtonDisabled]}
              onPress={() => setPage(1)}
              disabled={page === 1}
              activeOpacity={0.8}>
              <Text style={[styles.pageNavText, page === 1 && styles.pageNavTextDisabled]}>1ª</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pageNavButton, page === 1 && styles.pageNavButtonDisabled]}
              onPress={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              activeOpacity={0.8}>
              <Text style={[styles.pageNavText, page === 1 && styles.pageNavTextDisabled]}>Anterior</Text>
            </TouchableOpacity>

            {pageLinks.map((pageNumber, index) =>
              pageNumber === '...' ? (
                <Text key={`dots-${index}`} style={styles.pageDots}>...</Text>
              ) : (
                <TouchableOpacity
                  key={pageNumber}
                  style={[styles.pageNumberButton, pageNumber === page && styles.pageNumberButtonActive]}
                  onPress={() => setPage(pageNumber)}
                  activeOpacity={0.8}>
                  <Text style={[styles.pageNumberText, pageNumber === page && styles.pageNumberTextActive]}>{pageNumber}</Text>
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity
              style={[styles.pageNavButton, page === totalPages && styles.pageNavButtonDisabled]}
              onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              activeOpacity={0.8}>
              <Text style={[styles.pageNavText, page === totalPages && styles.pageNavTextDisabled]}>Próxima</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pageNavButton, page === totalPages && styles.pageNavButtonDisabled]}
              onPress={() => setPage(totalPages)}
              disabled={page === totalPages}
              activeOpacity={0.8}>
              <Text style={[styles.pageNavText, page === totalPages && styles.pageNavTextDisabled]}>Última</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {paginatedUsers.map((userItem) => {
          const expanded = selectedUserId === userItem.id;
          const regionalLabel = getRegionalLabel(regionais, userItem.id_regional);
          return (
            <View key={userItem.id} style={styles.card}>
              <TouchableOpacity style={styles.cardHeader} activeOpacity={0.9} onPress={() => handleToggleUser(userItem)}>
                <View style={styles.avatar}>
                  {userItem.foto_url ? (
                    <Image
                      source={{ uri: userItem.foto_url }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.avatarText}>{getInitials(userItem.nome_completo, userItem.email)}</Text>
                  )}
                </View>

                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle}>{userItem.nome_completo ?? 'Usuario sem nome'}</Text>
                  <Text style={styles.cardMeta}>{userItem.email ?? 'E-mail não informado'}</Text>
                  <View style={styles.metaRow}>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>{ROLE_LABELS[userItem.perfil]}</Text>
                    </View>
                    <View style={styles.regionalBadge}>
                      <FontAwesome6 name="location-dot" size={10} color={THEME.gold} />
                      <Text style={styles.regionalBadgeText}>{regionalLabel}</Text>
                    </View>
                    <View style={[styles.statusBadge, userItem.ativo ? styles.statusActive : styles.statusInactive]}>
                      <Text style={styles.statusText}>{userItem.ativo ? 'Ativo' : 'Inativo'}</Text>
                    </View>
                  </View>
                </View>

                <FontAwesome6
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={THEME.textMuted}
                />
              </TouchableOpacity>

              {expanded ? (
                <View style={[styles.detailBox, useTwoColumns && styles.detailBoxWide]}>
                  <Text style={styles.sectionTitle}>Edição</Text>

                  <View style={[styles.editSectionCard, useTwoColumns && styles.editSectionCardWide]}>
                    <View style={styles.editSectionHeader}>
                      <View style={[styles.editSectionIcon, { backgroundColor: 'rgba(91,156,255,0.16)' }]}>
                        <FontAwesome6 name="id-card" size={12} color={THEME.blue} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.editSectionTitle}>Dados pessoais</Text>
                        <Text style={styles.editSectionSubtitle}>Atualize as informações principais do usuario.</Text>
                      </View>
                    </View>

                    <Text style={styles.label}>Nome completo</Text>
                    <TextInput
                      value={form.nomeCompleto}
                      onChangeText={(value) => setForm((current) => ({ ...current, nomeCompleto: value }))}
                      placeholder="Nome completo"
                      placeholderTextColor={THEME.textMuted}
                      style={styles.input}
                    />

                    <Text style={styles.label}>Telefone</Text>
                    <TextInput
                      value={form.telefone}
                      onChangeText={(value) => setForm((current) => ({ ...current, telefone: value }))}
                      placeholder="(63) 99999-9999"
                      placeholderTextColor={THEME.textMuted}
                      keyboardType="phone-pad"
                      style={styles.input}
                    />
                  </View>

                  <View style={[styles.editSectionCard, useTwoColumns && styles.editSectionCardWide]}>
                    <View style={styles.editSectionHeader}>
                      <View style={[styles.editSectionIcon, { backgroundColor: 'rgba(245,200,66,0.16)' }]}>
                        <FontAwesome6 name="user-shield" size={12} color={THEME.gold} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.editSectionTitle}>Permissoes e regional</Text>
                        <Text style={styles.editSectionSubtitle}>Defina o papel do usuario e sua unidade principal.</Text>
                      </View>
                    </View>

                    <Text style={styles.label}>Permissão de acesso</Text>
                    <Text style={styles.helperText}>Perfil atual: {ROLE_LABELS[form.perfil]}</Text>
                    <View style={styles.permissionGrid}>
                    {ROLE_EDIT_OPTIONS.map((option) => {
                      const selected = form.perfil === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.permissionCard, selected && styles.permissionCardActive]}
                          onPress={() => setForm((current) => ({ ...current, perfil: option.value }))}
                          activeOpacity={0.85}>
                          <View style={styles.permissionCardHeader}>
                            <Text style={[styles.permissionCardTitle, selected && styles.permissionCardTitleActive]}>
                              {option.label}
                            </Text>
                            {selected ? <FontAwesome6 name="circle-check" size={13} color={THEME.leafLight} /> : null}
                          </View>
                          <Text style={[styles.permissionCardMeta, selected && styles.permissionCardMetaActive]}>
                            {option.hint}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    </View>

                    <Text style={styles.label}>Regional</Text>
                    <Text style={styles.helperText}>Regional atual: {getRegionalLabel(regionais, form.regionalId)}</Text>
                    <View style={styles.regionalGrid}>
                    {regionais.map((regional) => {
                      const selected = form.regionalId === regional.id;
                      return (
                        <TouchableOpacity
                          key={regional.id}
                          style={[styles.regionalCard, selected && styles.regionalCardActive]}
                          onPress={() => setForm((current) => ({ ...current, regionalId: regional.id }))}
                          activeOpacity={0.85}>
                          <View style={styles.regionalCardHeader}>
                            <Text style={[styles.regionalCardTitle, selected && styles.regionalCardTitleActive]}>
                              {regional.nome}
                            </Text>
                            {selected ? <FontAwesome6 name="location-dot" size={13} color={THEME.gold} /> : null}
                          </View>
                          <Text style={[styles.regionalCardMeta, selected && styles.regionalCardMetaActive]}>
                            Unidade {regional.uf}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    </View>
                  </View>

                  <View style={[styles.editSectionCard, useTwoColumns && styles.editSectionCardWide, useTwoColumns && styles.editSectionCardSpanFull]}>
                    <View style={styles.editSectionHeader}>
                      <View style={[styles.editSectionIcon, { backgroundColor: 'rgba(77,200,90,0.16)' }]}>
                        <FontAwesome6 name="power-off" size={12} color={THEME.leafLight} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.editSectionTitle}>Acesso</Text>
                        <Text style={styles.editSectionSubtitle}>Controle o status do usuario e a recuperação de senha.</Text>
                      </View>
                    </View>

                    <View style={styles.switchRow}>
                    <View style={styles.switchCopy}>
                      <Text style={styles.switchTitle}>Usuario ativo</Text>
                      <Text style={styles.switchDescription}>
                        Desative o acesso logico do perfil sem perder o historico cadastrado.
                      </Text>
                      <Text style={[styles.switchStatus, form.ativo ? styles.switchStatusActive : styles.switchStatusInactive]}>
                        {form.ativo ? 'Status atual: ativo' : 'Status atual: inativo'}
                      </Text>
                    </View>
                    <Switch
                      value={form.ativo}
                      onValueChange={(value) => setForm((current) => ({ ...current, ativo: value }))}
                      thumbColor={form.ativo ? THEME.leafLight : '#d9d9d9'}
                      trackColor={{ false: 'rgba(255,255,255,0.16)', true: 'rgba(77,200,90,0.35)' }}
                      />
                    </View>

                    {!form.ativo ? (
                      <View style={styles.inactiveWarning}>
                        <FontAwesome6 name="triangle-exclamation" size={13} color={THEME.gold} />
                        <Text style={styles.inactiveWarningText}>
                          Este usuario esta inativo. Ele permanece cadastrado, mas o acesso ao sistema fica desativado.
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={styles.saveButton}
                    activeOpacity={0.9}
                    onPress={handleSave}
                    disabled={isSaving}>
                    {isSaving ? (
                      <ActivityIndicator color={THEME.white} />
                    ) : (
                      <>
                        <FontAwesome6 name="floppy-disk" size={14} color={THEME.white} />
                        <Text style={styles.saveButtonText}>Salvar alterações</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    activeOpacity={0.9}
                    onPress={handleResetPassword}
                    disabled={isResettingPassword}>
                    {isResettingPassword ? (
                      <ActivityIndicator color={THEME.white} />
                    ) : (
                      <>
                        <FontAwesome6 name="key" size={14} color={THEME.white} />
                        <Text style={styles.secondaryButtonText}>Enviar redefinição de senha</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {form.perfil === 'instrutor' ? (
                    <View style={styles.propertiesSection}>
                      <View style={styles.propertiesHeader}>
                        <Text style={styles.sectionTitle}>Propriedades vinculadas</Text>
                        <View style={styles.propertiesHeaderActions}>
                          <TouchableOpacity
                            style={styles.manageAssignmentsButton}
                            activeOpacity={0.88}
                            onPress={() =>
                              router.push({
                                pathname: '/(tabs-gestor)/atribuicoes-tecnico' as any,
                                params: { userId: userItem.id },
                              })
                            }>
                            <FontAwesome6 name="diagram-project" size={12} color={THEME.white} />
                            <Text style={styles.manageAssignmentsButtonText}>Gerenciar</Text>
                          </TouchableOpacity>
                          {loadingPropertiesFor === userItem.id ? <ActivityIndicator size="small" color={THEME.leafLight} /> : null}
                        </View>
                      </View>

                      {selectedProperties.length === 0 && loadingPropertiesFor !== userItem.id ? (
                        <View style={styles.emptyProperties}>
                          <Text style={styles.emptyPropertiesText}>Nenhuma propriedade vinculada a este tecnico.</Text>
                        </View>
                      ) : null}

                      {selectedProperties.map((property) => (
                        <View key={`${userItem.id}-${property.id}`} style={styles.propertyCard}>
                          <View style={styles.propertyIcon}>
                            <FontAwesome6 name="house-chimney" size={14} color={THEME.gold} />
                          </View>
                          <View style={styles.propertyCopy}>
                            <Text style={styles.propertyName}>{property.nome ?? 'Propriedade sem nome'}</Text>
                            <Text style={styles.propertyMeta}>
                              {[property.municipio_nome, property.uf].filter(Boolean).join(' - ') || 'Localização não informada'}
                            </Text>
                            <Text style={styles.propertyProject}>{property.projeto_nome ?? 'Sem projeto vinculado'}</Text>
                          </View>
                          <View style={[styles.statusBadge, property.ativa ? styles.statusActive : styles.statusInactive]}>
                            <Text style={styles.statusText}>{property.ativa ? 'Ativa' : 'Inativa'}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.skyTop },
  content: { padding: 20, paddingTop: 56, paddingBottom: 120 },
  title: { fontSize: 28, fontWeight: '800', color: THEME.white, marginBottom: 6 },
  subtitle: { fontSize: 14, color: THEME.textMuted, marginBottom: 18, lineHeight: 20 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.cardBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.14)',
    marginBottom: 18,
  },
  searchInput: { flex: 1, color: THEME.white, fontSize: 15 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: THEME.leafLight,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 18,
  },
  addButtonText: { color: THEME.white, fontSize: 14, fontWeight: '800' },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  loadingText: { color: THEME.textMuted, fontSize: 13 },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245,200,66,0.14)',
    borderColor: 'rgba(245,200,66,0.24)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  emptyText: { color: THEME.offWhite, fontSize: 13, flex: 1 },
  card: {
    backgroundColor: THEME.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.12)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(77,200,90,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  avatarText: { color: THEME.leafLight, fontWeight: '800' },
  cardCopy: { flex: 1 },
  cardTitle: { color: THEME.white, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardMeta: { color: THEME.textMuted, fontSize: 12, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(91,156,255,0.16)',
  },
  roleBadgeText: { color: THEME.blue, fontSize: 11, fontWeight: '700' },
  regionalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(245,200,66,0.14)',
  },
  regionalBadgeText: {
    color: THEME.offWhite,
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusActive: { backgroundColor: 'rgba(77,200,90,0.18)' },
  statusInactive: { backgroundColor: 'rgba(255,107,107,0.18)' },
  statusText: { color: THEME.white, fontSize: 11, fontWeight: '700' },
  detailBox: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    gap: 10,
  },
  detailBoxWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  sectionTitle: { color: THEME.white, fontSize: 16, fontWeight: '700', marginBottom: 2, width: '100%' },
  sectionTitleWide: { marginBottom: 4 },
  editSectionCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  editSectionCardWide: {
    width: '48.5%',
  },
  editSectionCardSpanFull: {
    width: '100%',
  },
  editSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 2,
  },
  editSectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSectionTitle: {
    color: THEME.white,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  editSectionSubtitle: {
    color: THEME.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  label: { color: THEME.offWhite, fontSize: 13, fontWeight: '700', marginTop: 4 },
  helperText: { color: THEME.textMuted, fontSize: 12, marginTop: 6, marginBottom: 8 },
  input: {
    backgroundColor: THEME.inputBg,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: THEME.white,
    fontSize: 14,
  },
  permissionGrid: {
    gap: 10,
  },
  permissionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 5,
  },
  permissionCardActive: {
    backgroundColor: 'rgba(91,156,255,0.14)',
    borderColor: 'rgba(91,156,255,0.32)',
  },
  permissionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  permissionCardTitle: {
    color: THEME.white,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  permissionCardTitleActive: {
    color: THEME.white,
  },
  permissionCardMeta: {
    color: THEME.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  permissionCardMetaActive: {
    color: THEME.offWhite,
  },
  regionalGrid: {
    gap: 10,
  },
  regionalCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  regionalCardActive: {
    backgroundColor: 'rgba(77,200,90,0.14)',
    borderColor: 'rgba(77,200,90,0.3)',
  },
  regionalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  regionalCardTitle: {
    color: THEME.white,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  regionalCardTitleActive: {
    color: THEME.white,
  },
  regionalCardMeta: {
    color: THEME.textMuted,
    fontSize: 12,
  },
  regionalCardMetaActive: {
    color: THEME.offWhite,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  switchCopy: { flex: 1 },
  switchTitle: { color: THEME.white, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  switchDescription: { color: THEME.textMuted, fontSize: 12, lineHeight: 18 },
  switchStatus: { marginTop: 8, fontSize: 12, fontWeight: '700' },
  switchStatusActive: { color: THEME.leafLight },
  switchStatusInactive: { color: THEME.error },
  inactiveWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(245,200,66,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.24)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inactiveWarningText: {
    color: THEME.offWhite,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
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
  secondaryButton: {
    backgroundColor: 'rgba(245,200,66,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.28)',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryButtonText: { color: THEME.white, fontSize: 14, fontWeight: '700' },
  propertiesSection: {
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  propertiesHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  manageAssignmentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(91,156,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(91,156,255,0.28)',
  },
  manageAssignmentsButtonText: {
    color: THEME.white,
    fontSize: 12,
    fontWeight: '700',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 6,
    gap: 8,
  },
  paginationMainInfo: {
    flex: 1,
    gap: 6,
  },
  paginationModeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modeButtonActive: {
    backgroundColor: 'rgba(77,200,90,0.18)',
    borderColor: THEME.leafLight,
  },
  modeButtonText: {
    color: THEME.offWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  paginationText: {
    color: THEME.offWhite,
    fontSize: 12,
    opacity: 0.9,
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageButtonText: {
    color: THEME.white,
    fontSize: 12,
    fontWeight: '700',
  },
  pageButtonTextDisabled: {
    color: 'rgba(255,255,255,0.55)',
  },
  pageSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
    borderColor: THEME.leafLight,
  },
  pageSizeText: {
    color: THEME.white,
    fontSize: 12,
    fontWeight: '700',
  },
  pageSizeTextActive: {
    color: THEME.white,
  },
  pageNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 10,
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
  pageNavButtonDisabled: {
    opacity: 0.4,
  },
  pageNavText: {
    color: THEME.white,
    fontSize: 12,
    fontWeight: '700',
  },
  pageNavTextDisabled: {
    color: 'rgba(255,255,255,0.55)',
  },
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
    borderColor: THEME.leafLight,
  },
  pageNumberText: {
    color: THEME.white,
    fontSize: 12,
    fontWeight: '700',
  },
  pageNumberTextActive: {
    color: THEME.white,
  },
  pageDots: {
    color: THEME.offWhite,
    fontSize: 14,
    paddingHorizontal: 6,
  },
  propertiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  emptyProperties: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
  },
  emptyPropertiesText: { color: THEME.textMuted, fontSize: 13, lineHeight: 18 },
  propertyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  propertyIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,200,66,0.16)',
  },
  propertyCopy: { flex: 1 },
  propertyName: { color: THEME.white, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  propertyMeta: { color: THEME.offWhite, fontSize: 12, marginBottom: 4 },
  propertyProject: { color: THEME.textMuted, fontSize: 12 },
});
