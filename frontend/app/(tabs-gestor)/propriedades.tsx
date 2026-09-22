import { FontAwesome6 } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedbackPickup } from '@/features/cadastro-usuario/components/FeedbackPickup';
import PropertyMap from '@/features/propriedades/components/PropertyMap';
import { PAGE_SIZE_OPTIONS, THEME } from '@/features/propriedades/constants';
import {
  getStatusMeta as getPropertyStatusMeta,
  isValidEmail as isValidOwnerEmail,
  normalizeProperty as normalizePropertyRow,
} from '@/features/propriedades/helpers';
import { styles } from '@/features/propriedades/styles';
import type { CoordinateKind, FilterValue, OwnerForm, PropertyRow, PropertyStatus, ProprietarioOption, RawPropertyRow } from '@/features/propriedades/types';
import { supabase } from '@/src/lib/supabase';

function getArrangementLabel(value: string | null) {
  if (value === 'nao_arrendada') return 'Não arrendada';
  if (value === 'arrendada') return 'Arrendada';
  if (value === 'parcialmente_arrendada') return 'Arrendamento parcial';
  return 'Não informado';
}

function withinBrazilRange(kind: CoordinateKind, value: number) {
  if (kind === 'latitude') {
    return value >= -35 && value <= 6;
  }

  return value >= -75 && value <= -30;
}

function buildCoordinateCandidate(digits: string, sign: number, integerDigits: number) {
  if (digits.length <= integerDigits) {
    return null;
  }

  const integerPart = digits.slice(0, integerDigits);
  const decimalPart = digits.slice(integerDigits);

  return sign * Number(`${integerPart}.${decimalPart}`);
}

function normalizeCoordinate(value: unknown, kind: CoordinateKind) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Math.abs(value) <= (kind === 'latitude' ? 90 : 180)) {
      return value;
    }

    const digits = String(Math.trunc(Math.abs(value)));
    const options = kind === 'latitude' ? [1, 2] : [2, 3];

    for (const integerDigits of options) {
      const candidate = buildCoordinateCandidate(digits, value < 0 ? -1 : 1, integerDigits);
      if (candidate != null && withinBrazilRange(kind, candidate)) {
        return candidate;
      }
    }

    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/\s+/g, '').replace(',', '.');
  const direct = Number(normalized);
  if (Number.isFinite(direct) && Math.abs(direct) <= (kind === 'latitude' ? 90 : 180)) {
    return direct;
  }

  const sign = normalized.startsWith('-') ? -1 : 1;
  const digits = normalized.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  const options = kind === 'latitude' ? [1, 2] : [2, 3];
  for (const integerDigits of options) {
    const candidate = buildCoordinateCandidate(digits, sign, integerDigits);
    if (candidate != null && withinBrazilRange(kind, candidate)) {
      return candidate;
    }
  }

  return null;
}

function normalizeProperty(property: RawPropertyRow): PropertyRow {
  return {
    ...property,
    latitude: normalizeCoordinate(property.latitude, 'latitude'),
    longitude: normalizeCoordinate(property.longitude, 'longitude'),
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <FontAwesome6 name={icon} size={11} color={THEME.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function FilterChip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && { borderColor: color, backgroundColor: `${color}1F` }]}
      onPress={onPress}
      activeOpacity={0.85}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function PropriedadesScreen() {
  const insets = useSafeAreaInsets();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownerCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [mapDataset, setMapDataset] = useState<PropertyRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterValue>('todos');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [totalProperties, setTotalProperties] = useState(0);
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ownerFormOpen, setOwnerFormOpen] = useState(false);
  const [ownerExists, setOwnerExists] = useState<boolean | null>(null);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerOptions, setOwnerOptions] = useState<ProprietarioOption[]>([]);
  const [ownerSearchLoading, setOwnerSearchLoading] = useState(false);
  const [savingOwner, setSavingOwner] = useState(false);
  const [ownerFeedback, setOwnerFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [ownerErrors, setOwnerErrors] = useState<Partial<Record<keyof OwnerForm, string>>>({});
  const [ownerForm, setOwnerForm] = useState<OwnerForm>({
    nome: '',
    email: '',
    telefone: '',
    cpfCnpj: '',
    senha: '',
  });

  const signupClient = useMemo(
    () =>
      createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }),
    []
  );

  useEffect(() => {
    const loadStoredPageSize = async () => {
      try {
        const stored = await AsyncStorage.getItem('@propriedades_pageSize');
        if (stored) {
          const size = parseInt(stored, 10);
          if (PAGE_SIZE_OPTIONS.includes(size)) {
            setPageSize(size);
          }
        }
      } catch (error) {
        console.warn('Não foi possivel ler pageSize do storage', error);
      }
    };

    loadStoredPageSize();
  }, []);

  useEffect(() => {
    const storePageSize = async () => {
      try {
        await AsyncStorage.setItem('@propriedades_pageSize', String(pageSize));
      } catch (error) {
        console.warn('Não foi possivel armazenar pageSize', error);
      }
    };

    storePageSize();
  }, [pageSize]);

  useEffect(() => {
    setPage(1);
    if (useInfiniteScroll) {
      setProperties([]);
    }
  }, [filter, query, pageSize, useInfiniteScroll]);

  const loadProperties = useCallback(async () => {
    const searchValue = query.trim();
    let queryBuilder = supabase
      .from('propriedades')
      .select(
        'id, nome, municipio_nome, uf, bairro, referencia, como_chegar, telefone, latitude, longitude, area_total, car, status_propriedade, status_arrendamento, produtores(nome, telefone, email, cpf_cnpj)',
        { count: 'exact' }
      )
      .order('nome', { ascending: true });

    if (filter !== 'todos') {
      queryBuilder = queryBuilder.eq('status_propriedade', filter);
    }

    if (searchValue) {
      const safeValue = searchValue.replace(/%/g, '\\%').replace(/_/g, '\\_');
      queryBuilder = queryBuilder.or(
        `nome.ilike.%${safeValue}%,municipio_nome.ilike.%${safeValue}%,bairro.ilike.%${safeValue}%`
      );
    }

    queryBuilder = queryBuilder.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw error;
    }

    const rows = ((data ?? []) as unknown as RawPropertyRow[]).map(normalizePropertyRow);

    if (useInfiniteScroll && page > 1) {
      setProperties((current) => [...current, ...rows]);
    } else {
      setProperties(rows);
    }

    setTotalProperties(count ?? (useInfiniteScroll ? (page - 1) * pageSize + rows.length : rows.length));

    setSelectedId((current) =>
      current ?? rows.find((item) => item.latitude != null && item.longitude != null)?.id ?? rows[0]?.id ?? null
    );
  }, [filter, page, pageSize, query, useInfiniteScroll]);

  const loadMapDataset = useCallback(async () => {
    const searchValue = query.trim();
    let queryBuilder = supabase
      .from('propriedades')
      .select('id, nome, municipio_nome, uf, latitude, longitude, status_propriedade')
      .order('nome', { ascending: true });

    if (filter !== 'todos') {
      queryBuilder = queryBuilder.eq('status_propriedade', filter);
    }

    if (searchValue) {
      const safeValue = searchValue.replace(/%/g, '\\%').replace(/_/g, '\\_');
      queryBuilder = queryBuilder.or(
        `nome.ilike.%${safeValue}%,municipio_nome.ilike.%${safeValue}%,bairro.ilike.%${safeValue}%`
      );
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw error;
    }

    setMapDataset(((data ?? []) as unknown as RawPropertyRow[]).map(normalizePropertyRow));
  }, [filter, query]);

  useEffect(() => {
    let mounted = true;
    const isLoadFirstPage = page === 1;

    if (isLoadFirstPage) {
      setIsLoading(true);
    } else if (useInfiniteScroll) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    Promise.all([loadProperties(), loadMapDataset()])
      .catch((error) => {
        console.error('Erro ao carregar propriedades:', error);
      })
      .finally(() => {
        if (!mounted) return;

        if (isLoadFirstPage) {
          setIsLoading(false);
        } else if (useInfiniteScroll) {
          setIsLoadingMore(false);
        } else {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
      if (ownerCheckTimer.current) {
        clearTimeout(ownerCheckTimer.current);
      }
      if (ownerSearchTimer.current) {
        clearTimeout(ownerSearchTimer.current);
      }
    };
  }, [filter, loadMapDataset, loadProperties, page, pageSize, query, useInfiniteScroll]);

  useEffect(() => {
    setPage(1);
  }, [filter, query, pageSize]);

  useEffect(() => {
    if (!ownerFeedback) {
      return;
    }

    const timeout = setTimeout(() => {
      setOwnerFeedback(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [ownerFeedback]);

  const filteredProperties = useMemo(() => properties, [properties]);

  const mapProperties = useMemo(
    () => mapDataset.filter((property) => property.latitude != null && property.longitude != null),
    [mapDataset]
  );

  const selectedProperty = useMemo(
    () => filteredProperties.find((property) => property.id === selectedId) ?? filteredProperties[0] ?? null,
    [filteredProperties, selectedId]
  );

  const totalPages = Math.max(1, Math.ceil(totalProperties / pageSize));

  const pageLinks = useMemo(() => {
    const pages: (number | '...')[] = [];
    for (let i = 1; i <= totalPages; i += 1) {
      if (
        totalPages <= 9 ||
        i <= 2 ||
        i > totalPages - 2 ||
        (i >= page - 1 && i <= page + 1)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  }, [page, totalPages]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const initialRegion = useMemo(() => {
    const source =
      selectedProperty && selectedProperty.latitude != null && selectedProperty.longitude != null
        ? selectedProperty
        : mapProperties[0];

    if (!source?.latitude || !source?.longitude) {
      return null;
    }

    return {
      latitude: source.latitude,
      longitude: source.longitude,
      latitudeDelta: 0.12,
      longitudeDelta: 0.12,
    };
  }, [mapProperties, selectedProperty]);

  const selectedStatus = getPropertyStatusMeta(selectedProperty?.status_propriedade ?? null);
  const selectedPropertyHasOwner = !!selectedProperty?.produtores?.nome;

  const resetOwnerState = useCallback(() => {
    setOwnerFormOpen(false);
    setOwnerExists(null);
    setOwnerSearch('');
    setOwnerOptions([]);
    setOwnerFeedback(null);
    setOwnerErrors({});
    setOwnerForm({ nome: '', email: '', telefone: '', cpfCnpj: '', senha: '' });
  }, []);

  useEffect(() => {
    resetOwnerState();
  }, [resetOwnerState, selectedId]);

  useEffect(() => {
    if (!ownerFormOpen) {
      return;
    }

    const queryValue = ownerSearch.trim();
    if (queryValue.length < 2) {
      setOwnerOptions([]);
      setOwnerSearchLoading(false);
      return;
    }

    if (ownerSearchTimer.current) {
      clearTimeout(ownerSearchTimer.current);
    }

    ownerSearchTimer.current = setTimeout(async () => {
      setOwnerSearchLoading(true);
      const { data } = await supabase
        .from('usuarios')
        .select('id, nome_completo, email, telefone')
        .eq('perfil', 'proprietario')
        .or(`nome_completo.ilike.%${queryValue}%,email.ilike.%${queryValue}%`)
        .order('nome_completo')
        .limit(6);

      setOwnerOptions((data as ProprietarioOption[]) ?? []);
      setOwnerSearchLoading(false);
    }, 300);
  }, [ownerFormOpen, ownerSearch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadProperties(), loadMapDataset()]);
    } catch (error) {
      console.error('Erro ao atualizar propriedades:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    searchTimer.current = setTimeout(() => setQuery(value), 250);
  };

  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!useInfiniteScroll || isLoading || isLoadingMore || page >= totalPages) {
      return;
    }

    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 120;

    if (isNearBottom) {
      setPage((current) => Math.min(totalPages, current + 1));
    }
  };

  const handleOwnerField = (field: keyof OwnerForm, value: string) => {
    setOwnerForm((current) => ({ ...current, [field]: value }));
    setOwnerErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleOwnerEmail = (value: string) => {
    handleOwnerField('email', value);
    setOwnerFeedback(null);

    if (ownerCheckTimer.current) {
      clearTimeout(ownerCheckTimer.current);
    }

    ownerCheckTimer.current = setTimeout(async () => {
      if (!isValidOwnerEmail(value)) {
        setOwnerExists(null);
        return;
      }

      const { data } = await supabase.from('usuarios').select('id, perfil').eq('email', value.trim().toLowerCase()).maybeSingle();
      setOwnerExists(!!data);
    }, 450);
  };

  const selectExistingOwner = (owner: ProprietarioOption) => {
    setOwnerForm({
      nome: owner.nome_completo ?? '',
      email: owner.email ?? '',
      telefone: owner.telefone ?? '',
      cpfCnpj: '',
      senha: '',
    });
    setOwnerSearch(`${owner.nome_completo} - ${owner.email}`);
    setOwnerOptions([]);
    setOwnerExists(true);
    setOwnerFeedback(null);
    setOwnerErrors({});
  };

  const validateOwnerForm = () => {
    const nextErrors: Partial<Record<keyof OwnerForm, string>> = {};

    if (!ownerForm.nome.trim()) {
      nextErrors.nome = 'Nome do proprietario e obrigatorio.';
    }
    if (!isValidOwnerEmail(ownerForm.email)) {
      nextErrors.email = 'Informe um e-mail valido.';
    }
    if (!ownerExists && !ownerForm.senha.trim()) {
      nextErrors.senha = 'Informe uma senha para criar o acesso.';
    } else if (!ownerExists && ownerForm.senha.trim().length < 8) {
      nextErrors.senha = 'A senha precisa ter pelo menos 8 caracteres.';
    }

    setOwnerErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleAttachOwner = async () => {
    if (!selectedProperty || !validateOwnerForm()) {
      return;
    }

    setSavingOwner(true);
    setOwnerFeedback(null);

    try {
      const ownerEmail = ownerForm.email.trim().toLowerCase();
      let ownerUserId: string;

      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id, perfil')
        .eq('email', ownerEmail)
        .maybeSingle();

      if (existingUser) {
        if (existingUser.perfil !== 'proprietario') {
          throw new Error('Ja existe um usuario com esse e-mail, mas ele não tem perfil de proprietario.');
        }

        ownerUserId = existingUser.id;
        const { error: updateUserError } = await supabase
          .from('usuarios')
          .update({
            nome_completo: ownerForm.nome.trim(),
            telefone: ownerForm.telefone.trim() || null,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', ownerUserId);

        if (updateUserError) {
          throw updateUserError;
        }
      } else {
        const { data: authData, error: authError } = await signupClient.auth.signUp({
          email: ownerEmail,
          password: ownerForm.senha,
          options: { data: { nome_completo: ownerForm.nome.trim(), perfil: 'proprietario' } },
        });

        if (authError || !authData.user) {
          throw new Error(authError?.message ?? 'Erro ao criar o login do proprietario.');
        }

        ownerUserId = authData.user.id;
        const { error: insertUserError } = await supabase.from('usuarios').insert({
          id: ownerUserId,
          email: ownerEmail,
          perfil: 'proprietario',
          nome_completo: ownerForm.nome.trim(),
          telefone: ownerForm.telefone.trim() || null,
          ativo: true,
        });

        if (insertUserError) {
          throw insertUserError;
        }
      }

      const { data: existingProducer } = await supabase.from('produtores').select('id').eq('usuario_id', ownerUserId).maybeSingle();

      const producerPayload = {
        nome: ownerForm.nome.trim(),
        cpf_cnpj: ownerForm.cpfCnpj.trim() || null,
        telefone: ownerForm.telefone.trim() || null,
        email: ownerEmail,
        usuario_id: ownerUserId,
        atualizado_em: new Date().toISOString(),
      };

      let producerId: number;
      if (existingProducer) {
        const { error: updateProducerError } = await supabase
          .from('produtores')
          .update(producerPayload)
          .eq('id', existingProducer.id);

        if (updateProducerError) {
          throw updateProducerError;
        }

        producerId = existingProducer.id;
      } else {
        const { data: newProducer, error: insertProducerError } = await supabase
          .from('produtores')
          .insert(producerPayload)
          .select('id')
          .single();

        if (insertProducerError || !newProducer) {
          throw insertProducerError ?? new Error('Erro ao criar produtor.');
        }

        producerId = newProducer.id;
      }

      const { error: propertyError } = await supabase
        .from('propriedades')
        .update({ id_produtor: producerId, atualizado_em: new Date().toISOString() })
        .eq('id', selectedProperty.id);

      if (propertyError) {
        throw propertyError;
      }

      await Promise.all([loadProperties(), loadMapDataset()]);
      setSelectedId(selectedProperty.id);
      setOwnerFeedback({ type: 'success', message: 'Proprietario vinculado com sucesso a esta propriedade.' });
      setOwnerFormOpen(false);
    } catch (error: any) {
      setOwnerFeedback({ type: 'error', message: error?.message ?? 'Não foi possivel vincular o proprietario.' });
    } finally {
      setSavingOwner(false);
    }
  };

  const handleSelectProperty = (property: PropertyRow) => {
    setSelectedId(property.id);
  };

  return (
    <View style={styles.root}>
      <FeedbackPickup feedback={ownerFeedback} />
      <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.85}>
          <FontAwesome6 name="arrow-left" size={14} color={THEME.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Propriedades</Text>
          <Text style={styles.subtitle}>
            {isLoading ? 'Carregando...' : `${properties.length} cadastradas · ${mapProperties.length} com coordenadas`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.headerButton, styles.addButton]}
          onPress={() => router.push('/(tabs-gestor)/cadastro-propriedade' as any)}
          activeOpacity={0.85}>
          <FontAwesome6 name="plus" size={13} color={THEME.bg} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={THEME.green} />}>
        <View style={styles.heroCard}>
          <View style={styles.searchBox}>
            <FontAwesome6 name="magnifying-glass" size={12} color={THEME.muted} />
            <TextInput
              style={styles.searchInput}
              value={searchInput}
              onChangeText={handleSearchChange}
              placeholder="Buscar por nome, municipio ou proprietario..."
              placeholderTextColor={THEME.hint}
            />
            {searchInput ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchInput('');
                  setQuery('');
                }}
                activeOpacity={0.8}>
                <FontAwesome6 name="xmark" size={12} color={THEME.muted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <FilterChip label="Todas" active={filter === 'todos'} color={THEME.green} onPress={() => setFilter('todos')} />
            <FilterChip label="Ativas" active={filter === 'ativo'} color={THEME.green} onPress={() => setFilter('ativo')} />
            <FilterChip label="Em analise" active={filter === 'em_analise'} color={THEME.amber} onPress={() => setFilter('em_analise')} />
            <FilterChip label="Inativas" active={filter === 'inativo'} color={THEME.red} onPress={() => setFilter('inativo')} />
          </ScrollView>

          <PropertyMap
            isLoading={isLoading}
            initialRegion={initialRegion}
            properties={mapProperties}
            selectedProperty={selectedProperty}
            onSelectProperty={handleSelectProperty}
            theme={THEME}
            styles={{
              mapFrame: styles.mapFrame,
              map: styles.map,
              centerButton: styles.centerButton,
              mapFallback: styles.mapFallback,
              mapFallbackTitle: styles.mapFallbackTitle,
              mapFallbackText: styles.mapFallbackText,
            }}
          />
        </View>

        {selectedProperty ? (
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailsTitle}>{selectedProperty.nome ?? 'Propriedade sem nome'}</Text>
                <Text style={styles.detailsSubtitle}>
                  {[selectedProperty.municipio_nome, selectedProperty.uf].filter(Boolean).join(' - ') || 'Localização não informada'}
                </Text>
              </View>
              <View style={styles.detailsHeaderActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs-gestor)/cadastro-propriedade',
                      params: { id: String(selectedProperty.id) },
                    } as any)
                  }
                  activeOpacity={0.85}>
                  <FontAwesome6 name="pen" size={11} color={THEME.bg} />
                  <Text style={styles.editButtonText}>Editar</Text>
                </TouchableOpacity>
                <View style={[styles.statusBadge, { backgroundColor: selectedStatus.bg }]}>
                  <Text style={[styles.statusText, { color: selectedStatus.color }]}>{selectedStatus.label}</Text>
                </View>
              </View>
            </View>

            <InfoRow icon="user" label="Proprietario" value={selectedProperty.produtores?.nome ?? 'Não informado'} />
            <InfoRow
              icon="phone"
              label="Telefone"
              value={selectedProperty.telefone ?? selectedProperty.produtores?.telefone ?? 'Não informado'}
            />
            <InfoRow icon="envelope" label="E-mail" value={selectedProperty.produtores?.email ?? 'Não informado'} />
            <InfoRow icon="ruler-combined" label="Area total" value={selectedProperty.area_total != null ? `${selectedProperty.area_total} ha` : 'Não informada'} />
            <InfoRow icon="leaf" label="CAR" value={selectedProperty.car ?? 'Não informado'} />
            <InfoRow icon="handshake" label="Arrendamento" value={getArrangementLabel(selectedProperty.status_arrendamento)} />
            <InfoRow icon="flag" label="Referencia" value={selectedProperty.referencia ?? 'Não informada'} />
            <InfoRow icon="route" label="Como chegar" value={selectedProperty.como_chegar ?? 'Não informado'} />

            {selectedProperty ? (
              <View style={styles.ownerCtaCard}>
                <View style={styles.ownerCtaHeader}>
                  <View style={styles.ownerCtaIcon}>
                    <FontAwesome6 name="user-plus" size={12} color={THEME.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ownerCtaTitle}>
                      {selectedPropertyHasOwner ? 'Alterar proprietario rural' : 'Adicionar proprietario rural'}
                    </Text>
                    <Text style={styles.ownerCtaText}>
                      {selectedPropertyHasOwner
                        ? 'Voce pode substituir o proprietario atual vinculando um usuario proprietario rural ja cadastrado ou criando um novo acesso.'
                        : 'Voce pode vincular um proprietario ja cadastrado ou criar um novo login com perfil de proprietario.'}
                    </Text>
                  </View>
                </View>

                {!ownerFormOpen ? (
                  <TouchableOpacity style={styles.ownerPrimaryButton} onPress={() => setOwnerFormOpen(true)} activeOpacity={0.85}>
                    <FontAwesome6 name="user-plus" size={12} color={THEME.bg} />
                    <Text style={styles.ownerPrimaryButtonText}>
                      {selectedPropertyHasOwner ? 'Trocar proprietario rural' : 'Adicionar proprietario rural'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.ownerForm}>
                    <View style={styles.inlineField}>
                      <Text style={styles.inlineLabel}>Buscar proprietario ja cadastrado</Text>
                      <View style={styles.inlineInputBox}>
                        <TextInput
                          style={styles.inlineInput}
                          value={ownerSearch}
                          onChangeText={setOwnerSearch}
                          placeholder="Digite nome ou e-mail"
                          placeholderTextColor={THEME.hint}
                        />
                      </View>
                    </View>

                    {ownerSearchLoading ? <Text style={styles.ownerSearchText}>Buscando proprietarios...</Text> : null}

                    {ownerOptions.length > 0 ? (
                      <View style={styles.ownerOptionsCard}>
                        {ownerOptions.map((owner) => (
                          <TouchableOpacity key={owner.id} style={styles.ownerOptionItem} onPress={() => selectExistingOwner(owner)} activeOpacity={0.85}>
                            <View style={styles.ownerOptionIcon}>
                              <FontAwesome6 name="user-check" size={11} color={THEME.green} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.ownerOptionName}>{owner.nome_completo}</Text>
                              <Text style={styles.ownerOptionMeta}>{owner.email}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}

                    <View style={styles.inlineField}>
                      <Text style={styles.inlineLabel}>Nome do proprietario</Text>
                      <View style={[styles.inlineInputBox, ownerErrors.nome && styles.inlineInputError]}>
                        <TextInput
                          style={styles.inlineInput}
                          value={ownerForm.nome}
                          onChangeText={(value) => handleOwnerField('nome', value)}
                          placeholder="Nome completo"
                          placeholderTextColor={THEME.hint}
                        />
                      </View>
                      {ownerErrors.nome ? <Text style={styles.inlineErrorText}>{ownerErrors.nome}</Text> : null}
                    </View>

                    <View style={styles.inlineField}>
                      <Text style={styles.inlineLabel}>E-mail</Text>
                      <View style={[styles.inlineInputBox, ownerErrors.email && styles.inlineInputError]}>
                        <TextInput
                          style={styles.inlineInput}
                          value={ownerForm.email}
                          onChangeText={handleOwnerEmail}
                          placeholder="proprietario@email.com"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          placeholderTextColor={THEME.hint}
                        />
                      </View>
                      {ownerErrors.email ? <Text style={styles.inlineErrorText}>{ownerErrors.email}</Text> : null}
                      {ownerExists !== null && isValidOwnerEmail(ownerForm.email) ? (
                        <Text style={[styles.ownerEmailStatus, { color: ownerExists ? THEME.green : THEME.gold }]}>
                          {ownerExists ? 'Usuario existente: os dados serao atualizados.' : 'Novo usuario: sera criado um login proprietario.'}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.inlineField}>
                      <Text style={styles.inlineLabel}>Telefone</Text>
                      <View style={styles.inlineInputBox}>
                        <TextInput
                          style={styles.inlineInput}
                          value={ownerForm.telefone}
                          onChangeText={(value) => handleOwnerField('telefone', value)}
                          placeholder="(63) 99999-9999"
                          keyboardType="phone-pad"
                          placeholderTextColor={THEME.hint}
                        />
                      </View>
                    </View>

                    <View style={styles.inlineField}>
                      <Text style={styles.inlineLabel}>CPF/CNPJ</Text>
                      <View style={styles.inlineInputBox}>
                        <TextInput
                          style={styles.inlineInput}
                          value={ownerForm.cpfCnpj}
                          onChangeText={(value) => handleOwnerField('cpfCnpj', value)}
                          placeholder="Opcional"
                          placeholderTextColor={THEME.hint}
                        />
                      </View>
                    </View>

                    {!ownerExists ? (
                      <View style={styles.inlineField}>
                        <Text style={styles.inlineLabel}>Senha inicial</Text>
                        <View style={[styles.inlineInputBox, ownerErrors.senha && styles.inlineInputError]}>
                          <TextInput
                            style={styles.inlineInput}
                            value={ownerForm.senha}
                            onChangeText={(value) => handleOwnerField('senha', value)}
                            placeholder="Minimo de 8 caracteres"
                            secureTextEntry
                            placeholderTextColor={THEME.hint}
                          />
                        </View>
                        {ownerErrors.senha ? <Text style={styles.inlineErrorText}>{ownerErrors.senha}</Text> : null}
                      </View>
                    ) : null}

                    <View style={styles.ownerActions}>
                      <TouchableOpacity style={styles.ownerGhostButton} onPress={resetOwnerState} activeOpacity={0.85}>
                        <Text style={styles.ownerGhostButtonText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.ownerPrimaryButton} onPress={handleAttachOwner} activeOpacity={0.85} disabled={savingOwner}>
                        {savingOwner ? (
                          <ActivityIndicator size="small" color={THEME.bg} />
                        ) : (
                          <>
                            <FontAwesome6 name="link" size={12} color={THEME.bg} />
                            <Text style={styles.ownerPrimaryButtonText}>Salvar proprietario</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.listSection}>
          <Text style={styles.listTitle}>Lista de propriedades</Text>

          <View style={styles.paginationToolbar}>
            <View style={styles.paginationMainInfo}>
              <Text style={styles.paginationText}>
                {totalProperties === 0
                  ? 'Nenhuma propriedade para exibir'
                  : `Mostrando ${(page - 1) * pageSize + 1} a ${(page - 1) * pageSize + properties.length} de ${totalProperties}`}
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
                  onPress={() => {
                    setPageSize(size);
                  }}
                  activeOpacity={0.85}>
                  <Text
                    style={[
                      styles.pageSizeText,
                      pageSize === size && styles.pageSizeTextActive,
                    ]}>
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.pageNumberRow}>
            <TouchableOpacity
              style={[styles.pageNavButton, page === 1 && styles.pageNavButtonDisabled]}
              onPress={() => setPage(1)}
              disabled={page === 1}
              activeOpacity={0.85}>
              <Text style={[styles.pageNavText, page === 1 && styles.pageNavTextDisabled]}>1ª</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pageNavButton, page === 1 && styles.pageNavButtonDisabled]}
              onPress={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              activeOpacity={0.85}>
              <Text style={[styles.pageNavText, page === 1 && styles.pageNavTextDisabled]}>Anterior</Text>
            </TouchableOpacity>

            {pageLinks.map((pageNumber, index) =>
              pageNumber === '...' ? (
                <Text key={`dots-${index}`} style={styles.pageDots}>...</Text>
              ) : (
                <TouchableOpacity
                  key={pageNumber}
                  style={[
                    styles.pageNumberButton,
                    pageNumber === page && styles.pageNumberButtonActive,
                  ]}
                  onPress={() => setPage(pageNumber)}
                  activeOpacity={0.85}>
                  <Text
                    style={[
                      styles.pageNumberText,
                      pageNumber === page && styles.pageNumberTextActive,
                    ]}>
                    {pageNumber}
                  </Text>
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity
              style={[styles.pageNavButton, page === totalPages && styles.pageNavButtonDisabled]}
              onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              activeOpacity={0.85}>
              <Text style={[styles.pageNavText, page === totalPages && styles.pageNavTextDisabled]}>Próxima</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pageNavButton, page === totalPages && styles.pageNavButtonDisabled]}
              onPress={() => setPage(totalPages)}
              disabled={page === totalPages}
              activeOpacity={0.85}>
              <Text style={[styles.pageNavText, page === totalPages && styles.pageNavTextDisabled]}>Última</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={THEME.green} />
              <Text style={styles.centerText}>Carregando lista...</Text>
            </View>
          ) : null}

          {!isLoading && filteredProperties.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome6 name="house-circle-xmark" size={18} color={THEME.gold} />
              <Text style={styles.emptyText}>
                {properties.length === 0 ? 'Nenhuma propriedade cadastrada.' : 'Nenhuma propriedade encontrada com esse filtro.'}
              </Text>
            </View>
          ) : null}

          {!isLoading &&
            filteredProperties.map((property) => {
              const selected = property.id === selectedProperty?.id;
              const meta = getPropertyStatusMeta(property.status_propriedade);

              return (
                <TouchableOpacity
                  key={property.id}
                  style={[styles.propertyCard, selected && styles.propertyCardActive]}
                  onPress={() => handleSelectProperty(property)}
                  activeOpacity={0.85}>
                  <View style={styles.propertyIcon}>
                    <FontAwesome6 name="tractor" size={14} color={selected ? THEME.green : meta.color} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.propertyName}>{property.nome ?? 'Propriedade sem nome'}</Text>
                    <Text style={styles.propertyMeta}>
                      {[property.municipio_nome, property.uf].filter(Boolean).join(' - ') || 'Localização não informada'}
                    </Text>
                    <Text style={styles.propertyMeta}>
                      {property.produtores?.nome ? `Proprietario: ${property.produtores.nome}` : 'Proprietario não informado'}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <FontAwesome6 name={property.latitude != null && property.longitude != null ? 'location-dot' : 'location-crosshairs'} size={11} color={property.latitude != null && property.longitude != null ? THEME.green : THEME.muted} />
                  </View>
                </TouchableOpacity>
              );
            })}
        </View>
      </ScrollView>
    </View>
  );
}
