import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
  ativo: boolean;
};

const ROLE_LABELS: Record<UsuarioRow['perfil'], string> = {
  admin: 'Gestor Institucional',
  instrutor: 'Tecnico de Campo',
  proprietario: 'Proprietario Rural',
};

function getInitials(name: string | null, email: string | null) {
  const source = (name ?? email ?? 'Usuario').trim();
  return source
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function UsuariosGestaoScreen() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UsuarioRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [linkedProperties, setLinkedProperties] = useState<Record<string, PropriedadeVinculada[]>>({});
  const [loadingPropertiesFor, setLoadingPropertiesFor] = useState<string | null>(null);
  const [form, setForm] = useState<EditFormState>({
    nomeCompleto: '',
    telefone: '',
    ativo: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;
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

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome_completo, email, perfil, telefone, ativo')
      .order('nome_completo', { ascending: true });

    if (error) {
      throw error;
    }

    setUsers((data ?? []) as UsuarioRow[]);
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

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, users]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

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
      ativo: selectedUser.ativo,
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

    setIsSaving(true);
    setFeedback(null);

    const { error } = await supabase
      .from('usuarios')
      .update({
        nome_completo: form.nomeCompleto.trim(),
        telefone: form.telefone.trim() || null,
        ativo: form.ativo,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', selectedUser.id);

    setIsSaving(false);

    if (error) {
      console.error('Erro ao atualizar usuario:', error);
      setFeedback({ type: 'error', message: 'Não foi possivel salvar as alteracoes do usuario.' });
      return;
    }

    setUsers((current) =>
      current.map((item) =>
        item.id === selectedUser.id
          ? {
              ...item,
              nome_completo: form.nomeCompleto.trim(),
              telefone: form.telefone.trim() || null,
              ativo: form.ativo,
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
      console.error('Erro ao enviar redefinicao de senha:', error);
      setFeedback({ type: 'error', message: 'Não foi possivel enviar o e-mail de redefinicao de senha.' });
      return;
    }

    setFeedback({ type: 'success', message: 'E-mail de redefinicao de senha enviado com sucesso.' });
  };

  const selectedProperties = selectedUser ? linkedProperties[selectedUser.id] ?? [] : [];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.paginationText}>
              Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, filteredUsers.length)} de {filteredUsers.length}
            </Text>
            <View style={styles.paginationButtons}>
              <TouchableOpacity
                style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                activeOpacity={0.8}
              >
                <Text style={[styles.pageButtonText, page === 1 && styles.pageButtonTextDisabled]}>Anterior</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
                onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                activeOpacity={0.8}
              >
                <Text style={[styles.pageButtonText, page === totalPages && styles.pageButtonTextDisabled]}>Próxima</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {paginatedUsers.map((userItem) => {
          const expanded = selectedUserId === userItem.id;
          return (
            <View key={userItem.id} style={styles.card}>
              <TouchableOpacity style={styles.cardHeader} activeOpacity={0.9} onPress={() => handleToggleUser(userItem)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(userItem.nome_completo, userItem.email)}</Text>
                </View>

                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle}>{userItem.nome_completo ?? 'Usuario sem nome'}</Text>
                  <Text style={styles.cardMeta}>{userItem.email ?? 'E-mail nao informado'}</Text>
                  <View style={styles.metaRow}>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>{ROLE_LABELS[userItem.perfil]}</Text>
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
                <View style={styles.detailBox}>
                  <Text style={styles.sectionTitle}>Edição</Text>

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

                  <View style={styles.switchRow}>
                    <View style={styles.switchCopy}>
                      <Text style={styles.switchTitle}>Usuario ativo</Text>
                      <Text style={styles.switchDescription}>
                        Desative o acesso logico do perfil sem perder o historico cadastrado.
                      </Text>
                    </View>
                    <Switch
                      value={form.ativo}
                      onValueChange={(value) => setForm((current) => ({ ...current, ativo: value }))}
                      thumbColor={form.ativo ? THEME.leafLight : '#d9d9d9'}
                      trackColor={{ false: 'rgba(255,255,255,0.16)', true: 'rgba(77,200,90,0.35)' }}
                    />
                  </View>

                  {feedback ? (
                    <View style={[styles.feedbackBox, feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
                      <Text style={styles.feedbackText}>{feedback.message}</Text>
                    </View>
                  ) : null}

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

                  {userItem.perfil === 'instrutor' ? (
                    <View style={styles.propertiesSection}>
                      <View style={styles.propertiesHeader}>
                        <Text style={styles.sectionTitle}>Propriedades vinculadas</Text>
                        {loadingPropertiesFor === userItem.id ? <ActivityIndicator size="small" color={THEME.leafLight} /> : null}
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
                              {[property.municipio_nome, property.uf].filter(Boolean).join(' - ') || 'Localizacao nao informada'}
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
  sectionTitle: { color: THEME.white, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  label: { color: THEME.offWhite, fontSize: 13, fontWeight: '700', marginTop: 4 },
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
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 6,
    gap: 8,
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
