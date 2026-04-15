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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { FeedbackPickup } from '@/features/cadastro-usuario/components/FeedbackPickup';
import { INSTRUTORES_THEME as THEME, PAGE_SIZE_OPTIONS, ROLE_EDIT_OPTIONS, ROLE_LABELS } from '@/features/instrutores/constants';
import { getInitials, getRegionalLabel } from '@/features/instrutores/helpers';
import { styles } from '@/features/instrutores/styles';
import type { EditFormState, FeedbackState, PropriedadeVinculada, RegionalOption, UsuarioRow } from '@/features/instrutores/types';
import { supabase } from '@/src/lib/supabase';
/*

  { value: 'admin', label: 'Gestor Institucional', hint: 'Gerencia usuarios, auditoria e operação.' },
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

*/
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
          if ((PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)) {
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
