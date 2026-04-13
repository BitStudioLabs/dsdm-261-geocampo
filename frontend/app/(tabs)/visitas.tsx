import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

const THEME = {
  skyTop: '#0a1f0d',
  skyMid: '#0f2e14',
  page: '#06180a',
  panel: '#0f2116',
  panelStrong: '#102719',
  panelSoft: '#132d1c',
  starColor: 'rgba(255,255,255,0.8)',
  leafLight: '#4dc85a',
  cornYellow: '#f5c842',
  cardBg: 'rgba(10,31,13,0.85)',
  cardBorder: 'rgba(77,200,90,0.2)',
  textGray: 'rgba(255,255,255,0.55)',
  textSoft: 'rgba(240,247,241,0.72)',
  link: '#7de88a',
};

type PropertyOption = {
  id: number;
  nome: string;
  meta: string;
  latitude: number | null;
  longitude: number | null;
};

type VisitHistoryItem = {
  id: string;
  propriedade: string;
  data: string;
  hora: string;
  status: 'Concluída' | 'Enviada' | 'Em análise' | 'Aprovada' | 'Rejeitada';
};

type VisitStatusDb =
  | 'pendente'
  | 'em_andamento'
  | 'finalizada'
  | 'em_analise'
  | 'aprovada'
  | 'rejeitada'
  | 'excluida'
  | null;

type AtribuicaoRow = {
  id: number;
  id_propriedade: number;
};

type VisitaRow = {
  id: number;
  id_propriedade: number | null;
  criado_em?: string | null;
  status_visita?: VisitStatusDb;
};

type PropertyLookup = Record<
  number,
  {
    id: number;
    nome: string | null;
    municipio_nome: string | null;
    uf: string | null;
    latitude: number | null;
    longitude: number | null;
  }
>;

type SelectedPhoto = {
  uri: string;
  fileName: string;
  extension: string;
  mimeType: string;
  fileSizeLabel: string;
  dimensions: string;
  cameraModel: string;
  latitude: string;
  longitude: string;
  altitude: string;
  capturedAt: string;
  latitudeValue: number | null;
  longitudeValue: number | null;
  altitudeValue: number | null;
  capturedAtIso: string | null;
  hasExif: boolean;
  hasGps: boolean;
  exifFieldCount: number;
};

const VISIT_EVIDENCE_BUCKET = 'evidencias-visitas';

const STARS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: Math.random() * 160,
  size: Math.random() * 2 + 0.8,
  opacity: Math.random() * 0.5 + 0.3,
  twinkleDelay: Math.random() * 3000,
}));

const FIREFLIES = Array.from({ length: 4 }, (_, i) => ({
  id: i,
  startX: SCREEN_W * (0.15 + Math.random() * 0.7),
  startY: 40 + Math.random() * 100,
  delay: i * 350,
  size: 3 + Math.random() * 2,
}));

function AnimatedStar({ star }: { star: (typeof STARS)[0] }) {
  const twinkle = useSharedValue(star.opacity);

  useEffect(() => {
    twinkle.value = withDelay(
      star.twinkleDelay,
      withRepeat(
        withSequence(
          withTiming(star.opacity * 0.3, { duration: 1500 }),
          withTiming(star.opacity, { duration: 1500 })
        ),
        -1,
        true
      )
    );
  }, [star.opacity, star.twinkleDelay, twinkle]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: twinkle.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: star.x,
          top: star.y,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: THEME.starColor,
        },
        animatedStyle,
      ]}
    />
  );
}

function Firefly({ startX, startY, delay, size }: { startX: number; startY: number; delay: number; size: number }) {
  const progress = useSharedValue(0);
  const blink = useSharedValue(0.3);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
    blink.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 900 }), withTiming(0.25, { duration: 1100 })),
        -1,
        true
      )
    );
  }, [blink, delay, progress]);

  const glowStyle = useAnimatedStyle(() => {
    const x = startX + Math.sin(progress.value * Math.PI * 2) * 15;
    const y = startY + Math.cos(progress.value * Math.PI * 2) * 10;
    const opacity = interpolate(blink.value, [0.25, 1], [0.2, 0.9]);

    return {
      position: 'absolute' as const,
      left: x,
      top: y,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: '#f7f29b',
      opacity,
      shadowColor: '#fff6a8',
      shadowOpacity: opacity,
      shadowRadius: 8,
      elevation: 6,
    };
  });

  return <Animated.View style={[glowStyle, { pointerEvents: 'none' }]} />;
}

function formatDate(value?: string | null) {
  if (!value) {
    return '--/--/----';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--/--/----';
  }

  return parsed.toLocaleDateString('pt-BR');
}

function formatTime(value?: string | null) {
  if (!value) {
    return '--:--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--:--';
  }

  return parsed.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) {
    return 'Tamanho não informado';
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toDecimalCoordinate(value: unknown, ref?: string) {
  if (typeof value === 'number') {
    if (ref === 'S' || ref === 'W') {
      return value * -1;
    }

    return value;
  }

  if (!Array.isArray(value) || value.length < 3) {
    return null;
  }

  const [degrees, minutes, seconds] = value;

  if (
    typeof degrees !== 'number' ||
    typeof minutes !== 'number' ||
    typeof seconds !== 'number'
  ) {
    return null;
  }

  const signal = ref === 'S' || ref === 'W' ? -1 : 1;
  return signal * (degrees + minutes / 60 + seconds / 3600);
}

function formatCoordinate(value: number | null, suffix = '') {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Não disponível';
  }

  return `${value.toFixed(5)}${suffix}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'Erro desconhecido.';
}

function base64ToArrayBuffer(base64: string) {
  const binaryString = globalThis.atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

function parseExifDate(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function buildSelectedPhoto(asset: ImagePicker.ImagePickerAsset): SelectedPhoto {
  const exif = (asset.exif ?? {}) as Record<string, unknown>;
  const exifFieldCount = Object.keys(exif).length;
  const parsedLatitude = typeof exif.latitude === 'number' ? exif.latitude : null;
  const parsedLongitude = typeof exif.longitude === 'number' ? exif.longitude : null;
  const latitude =
    parsedLatitude ??
    toDecimalCoordinate(exif.GPSLatitude, typeof exif.GPSLatitudeRef === 'string' ? exif.GPSLatitudeRef : undefined) ??
    null;
  const longitude =
    parsedLongitude ??
    toDecimalCoordinate(
      exif.GPSLongitude,
      typeof exif.GPSLongitudeRef === 'string' ? exif.GPSLongitudeRef : undefined
    ) ?? null;
  const altitude =
    typeof exif.altitude === 'number'
      ? `${Math.round(exif.altitude)}m`
      : typeof exif.GPSAltitude === 'number'
      ? `${Math.round(exif.GPSAltitude)}m`
      : 'Não disponível';
  const rawDate =
    (typeof exif.DateTimeOriginal === 'string' && exif.DateTimeOriginal) ||
    (typeof exif.DateTimeDigitized === 'string' && exif.DateTimeDigitized) ||
    (typeof exif.CreateDate === 'string' && exif.CreateDate) ||
    null;
  const extension = asset.fileName?.split('.').pop()?.toLowerCase() || asset.mimeType?.split('/').pop() || 'jpg';
  const altitudeValue =
    typeof exif.altitude === 'number' ? exif.altitude : typeof exif.GPSAltitude === 'number' ? exif.GPSAltitude : null;
  const cameraModel =
    (typeof exif.Model === 'string' && exif.Model) ||
    (typeof exif.model === 'string' && exif.model) ||
    (typeof exif.make === 'string' && exif.make) ||
    'Não identificado';

  const capturedAt = rawDate
    ? rawDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$3/$2/$1').replace(' ', ' - ')
    : 'Não disponível';

  return {
    uri: asset.uri,
    fileName: asset.fileName || 'foto-visita',
    extension,
    mimeType: asset.mimeType || 'image/jpeg',
    fileSizeLabel: formatFileSize(asset.fileSize),
    dimensions: `${asset.width} x ${asset.height}`,
    cameraModel,
    latitude: formatCoordinate(latitude),
    longitude: formatCoordinate(longitude),
    altitude,
    capturedAt,
    latitudeValue: latitude,
    longitudeValue: longitude,
    altitudeValue,
    capturedAtIso: parseExifDate(rawDate),
    hasExif: exifFieldCount > 0,
    hasGps: latitude != null && longitude != null,
    exifFieldCount,
  };
}

function mapVisitStatusToHistoryLabel(status?: VisitStatusDb): VisitHistoryItem['status'] {
  if (status === 'aprovada') {
    return 'Aprovada';
  }

  if (status === 'rejeitada') {
    return 'Rejeitada';
  }

  if (status === 'em_analise') {
    return 'Em análise';
  }

  if (status === 'finalizada') {
    return 'Concluída';
  }

  return 'Enviada';
}

function getHistoryStatusStyle(status: VisitHistoryItem['status']) {
  switch (status) {
    case 'Aprovada':
      return { bg: 'rgba(56,211,159,0.14)', text: '#2aa774' };
    case 'Rejeitada':
      return { bg: 'rgba(255,125,125,0.14)', text: '#d85a5a' };
    case 'Em análise':
      return { bg: 'rgba(242,201,76,0.14)', text: '#b88718' };
    case 'Concluída':
      return { bg: 'rgba(89,210,124,0.14)', text: THEME.leafLight };
    default:
      return { bg: 'rgba(103,184,255,0.14)', text: '#3d8fcb' };
  }
}

function calculateDistanceInMeters(
  originLat: number,
  originLon: number,
  targetLat: number,
  targetLon: number
) {
  const earthRadius = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(targetLat - originLat);
  const deltaLon = toRadians(targetLon - originLon);
  const lat1 = toRadians(originLat);
  const lat2 = toRadians(targetLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadius * c);
}

export default function VisitasScreen() {
  const { profile, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [history, setHistory] = useState<VisitHistoryItem[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null);

  const loadVisitasData = useCallback(async () => {
    const currentUserId = profile?.id ?? user?.id;

    if (!currentUserId) {
      setProperties([]);
      setHistory([]);
      setSelectedPropertyId(null);
      setIsLoading(false);
      return;
    }

    setErrorMessage('');

    const [atribuicoesRes, visitasRes] = await Promise.all([
      supabase
        .from('atribuicoes')
        .select('id, id_propriedade')
        .eq('id_instrutor', currentUserId)
        .eq('ativa', true)
        .order('atualizado_em', { ascending: false }),
      supabase
        .from('visitas')
        .select('id, id_propriedade, criado_em, status_visita')
        .eq('id_instrutor', currentUserId)
        .order('criado_em', { ascending: false })
        .limit(20),
    ]);

    if (atribuicoesRes.error) {
      throw atribuicoesRes.error;
    }

    if (visitasRes.error) {
      throw visitasRes.error;
    }

    const atribuicoes = (atribuicoesRes.data ?? []) as AtribuicaoRow[];
    const visitas = (visitasRes.data ?? []) as VisitaRow[];
    const latestVisitByProperty = visitas.reduce<Record<number, VisitaRow>>((acc, visit) => {
      if (visit.id_propriedade == null) {
        return acc;
      }

      if (!acc[visit.id_propriedade]) {
        acc[visit.id_propriedade] = visit;
      }

      return acc;
    }, {});
    const propertyIds = Array.from(
      new Set(
        [...atribuicoes.map((item) => item.id_propriedade), ...visitas.map((item) => item.id_propriedade)].filter(
          (value): value is number => typeof value === 'number'
        )
      )
    );

    let propertyLookup: PropertyLookup = {};

    if (propertyIds.length > 0) {
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('propriedades')
        .select('id, nome, municipio_nome, uf, latitude, longitude')
        .in('id', propertyIds)
        .order('nome', { ascending: true });

      if (propertiesError) {
        throw propertiesError;
      }

      propertyLookup = (propertiesData ?? []).reduce<PropertyLookup>((acc, property) => {
        acc[property.id] = property;
        return acc;
      }, {});
    }

    const nextProperties = atribuicoes
      .filter((item) => !latestVisitByProperty[item.id_propriedade])
      .map((item) => {
        const property = propertyLookup[item.id_propriedade];

        return {
          id: item.id_propriedade,
          nome: property?.nome ?? 'Propriedade sem nome',
          meta:
            [property?.municipio_nome, property?.uf].filter(Boolean).join(', ') ||
            'Localização não informada',
          latitude: property?.latitude ?? null,
          longitude: property?.longitude ?? null,
        };
      });

    const nextHistory = visitas.map((item, index) => {
      const property = item.id_propriedade ? propertyLookup[item.id_propriedade] ?? null : null;

      return {
        id: String(item.id),
        propriedade: property?.nome ?? `Visita ${index + 1}`,
        data: formatDate(item.criado_em),
        hora: formatTime(item.criado_em),
        status: mapVisitStatusToHistoryLabel(item.status_visita),
      } as VisitHistoryItem;
    });

    setProperties(nextProperties);
    setHistory(nextHistory);
    setSelectedPropertyId((current) => current ?? nextProperties[0]?.id ?? null);
  }, [profile?.id, user?.id]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setIsLoading(true);
      try {
        await loadVisitasData();
      } catch (error) {
        console.error('Erro ao carregar tela de visitas:', error);
        if (mounted) {
          setErrorMessage('Não foi possível carregar suas visitas agora.');
          setProperties([]);
          setHistory([]);
          setSelectedPropertyId(null);
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
  }, [loadVisitasData]);

  const selectedProperty = useMemo(
    () => properties.find((item) => item.id === selectedPropertyId) ?? properties[0] ?? null,
    [properties, selectedPropertyId]
  );

  const metadataItems = useMemo(
    () => {
      if (!selectedPhoto) {
        return [];
      }

      return [
        {
          label: 'Latitude',
          value: selectedPhoto.latitudeValue != null ? selectedPhoto.latitude : 'Sem GPS na foto',
        },
        {
          label: 'Longitude',
          value: selectedPhoto.longitudeValue != null ? selectedPhoto.longitude : 'Sem GPS na foto',
        },
        {
          label: 'Altitude',
          value: selectedPhoto.altitudeValue != null ? selectedPhoto.altitude : 'Sem altitude no EXIF',
        },
      ];
    },
    [selectedPhoto]
  );

  const metadataDetails = useMemo(
    () => [
      { label: 'Arquivo', value: selectedPhoto?.fileName ?? 'Nenhuma foto selecionada' },
      { label: 'Formato', value: selectedPhoto?.mimeType ?? 'Não disponível' },
      { label: 'Tamanho', value: selectedPhoto?.fileSizeLabel ?? 'Não disponível' },
      { label: 'Resolução', value: selectedPhoto?.dimensions ?? 'Não disponível' },
      { label: 'Capturada em', value: selectedPhoto?.capturedAt ?? 'Não disponível' },
      { label: 'Câmera', value: selectedPhoto?.cameraModel ?? 'Não identificado' },
    ],
    [selectedPhoto]
  );

  const metadataAlert = useMemo(() => {
    if (!selectedPhoto) {
      return {
        icon: 'time-outline' as const,
        text: 'Selecione uma foto para visualizar os metadados reais dela.',
      };
    }

    if (!selectedPhoto.hasExif) {
      return {
        icon: 'alert-circle-outline' as const,
        text: 'Esta imagem não trouxe EXIF. Isso costuma acontecer com screenshots, fotos editadas ou arquivos reenviados por aplicativos.',
      };
    }

    if (!selectedPhoto.hasGps) {
      return {
        icon: 'warning-outline' as const,
        text: 'A imagem tem EXIF, mas não trouxe coordenadas GPS. Para validar a localização, use uma foto original da câmera com localização ativa.',
      };
    }

    return {
      icon: 'checkmark-circle-outline' as const,
      text: `Metadados detectados com sucesso. ${selectedPhoto.exifFieldCount} campos EXIF foram lidos nessa imagem.`,
    };
  }, [selectedPhoto]);

  const propertyCoordinatesLabel = useMemo(() => {
    if (selectedProperty?.latitude == null || selectedProperty.longitude == null) {
      return 'Coordenadas da propriedade não informadas';
    }

    return `${selectedProperty.latitude.toFixed(5)}, ${selectedProperty.longitude.toFixed(5)}`;
  }, [selectedProperty]);

  const photoCoordinatesStatus = useMemo(() => {
    if (!selectedPhoto) {
      return 'Selecione uma foto para verificar a localização.';
    }

    if (selectedPhoto.latitudeValue == null || selectedPhoto.longitudeValue == null) {
      return 'Foto sem metadados GPS. Use uma imagem original da câmera com localização ativa.';
    }

    if (selectedProperty?.latitude == null || selectedProperty.longitude == null) {
      return 'A propriedade selecionada ainda não tem coordenadas cadastradas.';
    }

    const distance = calculateDistanceInMeters(
      selectedPhoto.latitudeValue,
      selectedPhoto.longitudeValue,
      selectedProperty.latitude,
      selectedProperty.longitude
    );

    if (distance < 1000) {
      return `Foto registrada a ${distance} m da propriedade.`;
    }

    return `Foto registrada a ${(distance / 1000).toFixed(2)} km da propriedade.`;
  }, [selectedPhoto, selectedProperty]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadVisitasData();
    } catch (error) {
      console.error('Erro ao atualizar tela de visitas:', error);
      setErrorMessage('Não foi possível atualizar suas visitas agora.');
    } finally {
      setRefreshing(false);
    }
  };

  const handlePickImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Autorize o acesso à galeria para selecionar a foto da visita.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        exif: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setSelectedPhoto(buildSelectedPhoto(result.assets[0]));
    } catch (error) {
      console.error('Erro ao selecionar foto da visita:', error);
      Alert.alert('Erro ao selecionar foto', 'Não foi possível abrir sua galeria agora.');
    }
  }, []);

  const handleClearSelectedPhoto = useCallback(() => {
    setSelectedPhoto(null);
  }, []);

  const handleCreateVisit = useCallback(async () => {
    const currentUserId = profile?.id ?? user?.id;

    if (!currentUserId || !selectedProperty) {
      Alert.alert('Visita indisponível', 'Selecione uma propriedade antes de continuar.');
      return;
    }

    if (!selectedPhoto) {
      Alert.alert('Foto obrigatória', 'Selecione a foto da visita antes de enviar para análise.');
      return;
    }

    try {
      setIsSubmittingVisit(true);
      setErrorMessage('');

      const { data, error } = await supabase
        .from('visitas')
        .insert({
          id_instrutor: currentUserId,
          id_propriedade: selectedProperty.id,
          criado_em: new Date().toISOString(),
          status_visita: 'pendente',
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      const visitId = data?.id;

      if (visitId) {
        const base64File = await FileSystem.readAsStringAsync(selectedPhoto.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const fileBuffer = base64ToArrayBuffer(base64File);
        const filePath = `${currentUserId}/${visitId}/evidencia-${Date.now()}.${selectedPhoto.extension}`;

        const { error: uploadError } = await supabase.storage
          .from(VISIT_EVIDENCE_BUCKET)
          .upload(filePath, fileBuffer, {
            upsert: true,
            contentType: selectedPhoto.mimeType,
          });

        if (uploadError) {
          throw uploadError;
        }

        const publicUrl = supabase.storage.from(VISIT_EVIDENCE_BUCKET).getPublicUrl(filePath).data.publicUrl;
        const { error: updateError } = await supabase
          .from('visitas')
          .update({
            foto_url: publicUrl,
            foto_path: filePath,
            latitude: selectedPhoto.latitudeValue,
            longitude: selectedPhoto.longitudeValue,
            altitude: selectedPhoto.altitudeValue,
            capturado_em: selectedPhoto.capturedAtIso,
            status_visita: 'em_andamento',
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', visitId);

        if (updateError) {
          console.warn('Visita salva, mas não foi possível gravar a referência da foto:', updateError);
        }
      }

      await loadVisitasData();
      setSelectedPhoto(null);
      router.push({
        pathname: '/avaliador',
        params: data?.id ? { visitId: String(data.id), propertyId: String(selectedProperty.id) } : undefined,
      } as any);
    } catch (error) {
      console.error('Erro ao registrar visita do instrutor:', error);
      Alert.alert('Erro ao registrar', getErrorMessage(error));
    } finally {
      setIsSubmittingVisit(false);
    }
  }, [loadVisitasData, profile?.id, selectedPhoto, selectedProperty, user?.id]);

  const pendingPropertiesCount = properties.length;
  const completedVisitsCount = history.length;
  const uploadStatusLabel = selectedPhoto ? 'Foto pronta para envio' : 'Aguardando evidência';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.skyTop} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={THEME.leafLight} />
        }>
        <View style={styles.heroSection}>
          <View style={styles.skyBg} />

          {STARS.map((star) => (
            <AnimatedStar key={star.id} star={star} />
          ))}

          {FIREFLIES.map((firefly) => (
            <Firefly key={firefly.id} {...firefly} />
          ))}

          <View style={styles.moonContainer}>
            <View style={styles.moon}>
              <View style={styles.moonInner}>
                <View style={[styles.crater, { top: 5, left: 6, width: 5, height: 5 }]} />
                <View style={[styles.crater, { top: 12, left: 14, width: 3, height: 3 }]} />
                <View style={[styles.crater, { top: 16, left: 7, width: 4, height: 4 }]} />
              </View>
            </View>
          </View>

          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Visitas</Text>
              <Text style={styles.subtitle}>
                Histórico das visitas realizadas e novo envio de evidências
              </Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={18} color={THEME.link} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <View style={styles.heroStatIcon}>
                <Ionicons name="business-outline" size={16} color={THEME.leafLight} />
              </View>
              <Text style={styles.heroStatValue}>{pendingPropertiesCount}</Text>
              <Text style={styles.heroStatLabel}>Disponíveis</Text>
            </View>

            <View style={styles.heroStatCard}>
              <View style={styles.heroStatIcon}>
                <Ionicons name="images-outline" size={16} color={THEME.cornYellow} />
              </View>
              <Text style={styles.heroStatValue}>{selectedPhoto ? '1' : '0'}</Text>
              <Text style={styles.heroStatLabel}>Foto pronta</Text>
            </View>

            <View style={styles.heroStatCard}>
              <View style={styles.heroStatIcon}>
                <Ionicons name="checkmark-done-outline" size={16} color={THEME.link} />
              </View>
              <Text style={styles.heroStatValue}>{completedVisitsCount}</Text>
              <Text style={styles.heroStatLabel}>Realizadas</Text>
            </View>
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.feedbackCard}>
            <Ionicons name="alert-circle-outline" size={18} color={THEME.cornYellow} />
            <Text style={styles.feedbackText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOVA EVIDÊNCIA</Text>
          <Text style={styles.helperText}>
            Escolha a propriedade para vincular a foto da visita realizada.
          </Text>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={THEME.leafLight} size="large" />
              <Text style={styles.loadingText}>Carregando propriedades atribuídas...</Text>
            </View>
          ) : selectedProperty ? (
            <View style={styles.selectionCard}>
              <View style={styles.selectionTop}>
                <View style={styles.selectionIcon}>
                  <Ionicons name="business-outline" size={22} color={THEME.leafLight} />
                </View>
                <View style={styles.selectionCopy}>
                  <Text style={styles.selectionLabel}>Propriedade selecionada</Text>
                  <Text style={styles.selectionTitle}>{selectedProperty.nome}</Text>
                  <Text style={styles.selectionMeta}>{selectedProperty.meta}</Text>
                </View>
                <View style={styles.selectionBadge}>
                  <Text style={styles.selectionBadgeText}>Ativa</Text>
                </View>
              </View>

              <View style={styles.chipsRow}>
                {properties.map((item) => {
                  const isActive = item.id === selectedPropertyId;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.9}
                      onPress={() => setSelectedPropertyId(item.id)}
                      style={[styles.propertyChip, isActive && styles.propertyChipActive]}>
                      <Text
                        style={[styles.propertyChipText, isActive && styles.propertyChipTextActive]}>
                        {item.nome}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="business-outline" size={26} color={THEME.textGray} />
              <Text style={styles.emptyTitle}>Nenhuma propriedade atribuida</Text>
              <Text style={styles.emptyText}>
                Quando uma fazenda for vinculada ao seu usuário, ela aparecerá aqui para envio de evidências.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UPLOAD DE FOTO</Text>
          <View style={styles.uploadStatusRow}>
            <View style={styles.uploadStatusBadge}>
              <Ionicons
                name={selectedPhoto ? 'checkmark-circle-outline' : 'time-outline'}
                size={15}
                color={selectedPhoto ? THEME.leafLight : THEME.cornYellow}
              />
              <Text style={styles.uploadStatusText}>{uploadStatusLabel}</Text>
            </View>
          </View>
          <View style={styles.uploadCard}>
            {selectedPhoto ? (
              <>
                <Image source={{ uri: selectedPhoto.uri }} style={styles.photoPreview} contentFit="cover" />
                <Text style={styles.uploadTitle}>Foto selecionada</Text>
                <Text style={styles.uploadSubtitle}>
                  {selectedPhoto.fileName} - {selectedPhoto.fileSizeLabel}
                </Text>
                <View style={styles.photoDetailsRow}>
                  <View style={styles.photoInfoPill}>
                    <Ionicons name="image-outline" size={14} color={THEME.leafLight} />
                    <Text style={styles.photoInfoText}>{selectedPhoto.mimeType}</Text>
                  </View>
                  <View style={styles.photoInfoPill}>
                    <Ionicons name="time-outline" size={14} color={THEME.leafLight} />
                    <Text style={styles.photoInfoText}>{selectedPhoto.capturedAt}</Text>
                  </View>
                </View>
                <View style={styles.uploadActionsRow}>
                  <TouchableOpacity activeOpacity={0.9} style={styles.uploadButton} onPress={handlePickImage}>
                    <Text style={styles.uploadButtonText}>Trocar Foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.cancelPhotoButton}
                    onPress={handleClearSelectedPhoto}>
                    <Text style={styles.cancelPhotoButtonText}>Cancelar Foto</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.uploadIconWrap}>
                  <Ionicons name="folder-open-outline" size={34} color={THEME.cornYellow} />
                </View>
                <Text style={styles.uploadTitle}>Selecionar Foto</Text>
                <Text style={styles.uploadSubtitle}>
                  JPEG, PNG, HEIC. Se houver GPS e EXIF, eles serão lidos automaticamente.
                </Text>
                <TouchableOpacity activeOpacity={0.9} style={styles.uploadButton} onPress={handlePickImage}>
                  <Text style={styles.uploadButtonText}>Escolher Arquivo</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.geoHeader}>
            <View>
              <Text style={styles.geoTitle}>Geolocalização extraída</Text>
              <Text style={styles.geoSubtitle}>
                Metadados da foto selecionada para {selectedProperty?.nome ?? 'a propriedade escolhida'}
              </Text>
            </View>
            <View style={styles.geoBadge}>
              <Ionicons
                name={
                  !selectedPhoto
                    ? 'time-outline'
                    : selectedPhoto.hasGps
                      ? 'checkmark-circle'
                      : 'warning-outline'
                }
                size={16}
                color={THEME.leafLight}
              />
              <Text style={styles.geoBadgeText}>
                {!selectedPhoto ? 'Aguardando foto' : selectedPhoto.hasGps ? 'GPS detectado' : 'Sem GPS'}
              </Text>
            </View>
          </View>

          {metadataItems.length > 0 ? (
            <View style={styles.metadataRow}>
              {metadataItems.map((item) => (
                <View key={item.label} style={styles.metadataCard}>
                  <Text style={styles.metadataLabel}>{item.label}</Text>
                  <Text style={styles.metadataValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.metadataAlertCard}>
            <Ionicons name={metadataAlert.icon} size={18} color={THEME.skyMid} />
            <Text style={styles.metadataAlertText}>{metadataAlert.text}</Text>
          </View>

          <View style={styles.metadataDetailsGrid}>
            {metadataDetails.map((item) => (
              <View key={item.label} style={styles.metadataDetailCard}>
                <Text style={styles.metadataDetailLabel}>{item.label}</Text>
                <Text style={styles.metadataDetailValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.comparisonCard}>
            <View style={styles.comparisonRow}>
              <Ionicons name="location-outline" size={16} color={THEME.skyMid} />
              <View style={styles.comparisonCopy}>
                <Text style={styles.comparisonLabel}>Coordenadas da propriedade</Text>
                <Text style={styles.comparisonValue}>{propertyCoordinatesLabel}</Text>
              </View>
            </View>

            <View style={styles.comparisonDivider} />

            <View style={styles.comparisonRow}>
              <Ionicons
                name={
                  selectedPhoto?.latitudeValue != null && selectedPhoto?.longitudeValue != null
                    ? 'navigate-circle-outline'
                    : 'alert-circle-outline'
                }
                size={16}
                color={THEME.skyMid}
              />
              <View style={styles.comparisonCopy}>
                <Text style={styles.comparisonLabel}>Validação da foto</Text>
                <Text style={styles.comparisonValue}>{photoCoordinatesStatus}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.92}
            style={[
              styles.primaryButton,
              (!selectedProperty || !selectedPhoto || isSubmittingVisit) && styles.primaryButtonDisabled,
            ]}
            onPress={handleCreateVisit}
            disabled={!selectedProperty || !selectedPhoto || isSubmittingVisit}>
            <Text style={styles.primaryButtonText}>
              {isSubmittingVisit ? 'Salvando visita...' : 'Enviar para análise'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VISITAS REALIZADAS</Text>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={THEME.leafLight} size="small" />
              <Text style={styles.loadingText}>Carregando histórico...</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="clipboard-outline" size={26} color={THEME.textGray} />
              <Text style={styles.emptyTitle}>Nenhuma visita registrada</Text>
              <Text style={styles.emptyText}>
                Assim que você concluir visitas, elas vão aparecer aqui.
              </Text>
            </View>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.historyRow}>
                <View style={styles.historyIcon}>
                  <Ionicons name="clipboard-outline" size={20} color={THEME.leafLight} />
                </View>
                <View style={styles.historyCopy}>
                  <Text style={styles.historyTitle}>{item.propriedade}</Text>
                  <Text style={styles.historyMeta}>
                    {item.data} - {item.hora}
                  </Text>
                </View>
                <View style={[styles.historyBadge, { backgroundColor: getHistoryStatusStyle(item.status).bg }]}>
                  <Text style={[styles.historyBadgeText, { color: getHistoryStatusStyle(item.status).text }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.page },
  content: { paddingBottom: 110 },
  heroSection: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  skyBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: THEME.skyTop,
  },
  moonContainer: {
    position: 'absolute',
    top: 18,
    right: 50,
  },
  moon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fffbe0',
    shadowColor: '#fffbe0',
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  moonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 13,
    backgroundColor: '#fffbe0',
    overflow: 'hidden',
  },
  crater: {
    position: 'absolute',
    backgroundColor: 'rgba(200,190,150,0.4)',
    borderRadius: 50,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', zIndex: 10 },
  headerCopy: { flex: 1 },
  title: {
    color: '#fff',
    fontSize: 29,
    fontWeight: '800',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: { color: THEME.textSoft, fontSize: 13, lineHeight: 18, maxWidth: 270 },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    zIndex: 10,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: THEME.cardBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  heroStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(77,200,90,0.12)',
    marginBottom: 12,
  },
  heroStatValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroStatLabel: {
    color: THEME.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  moreButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: THEME.panel,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    marginHorizontal: 18,
    shadowColor: '#08130b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.14)',
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245,200,66,0.12)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    marginHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.18)',
  },
  feedbackText: {
    flex: 1,
    color: '#f2dfaa',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    color: THEME.link,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  helperText: { color: THEME.textSoft, fontSize: 13, lineHeight: 18, marginBottom: 14 },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 26,
  },
  loadingText: {
    color: THEME.textSoft,
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 26,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: THEME.panelSoft,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.12)',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyText: {
    color: THEME.textSoft,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  selectionCard: {
    backgroundColor: THEME.panelSoft,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.18)',
  },
  selectionTop: { flexDirection: 'row', marginBottom: 14 },
  selectionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(77,200,90,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectionCopy: { flex: 1 },
  selectionBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(77,200,90,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.2)',
  },
  selectionBadgeText: {
    color: THEME.leafLight,
    fontSize: 11,
    fontWeight: '800',
  },
  selectionLabel: { color: THEME.skyMid, fontSize: 11, marginBottom: 4 },
  selectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  selectionMeta: { color: THEME.textSoft, fontSize: 12 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  propertyChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.12)',
  },
  propertyChipActive: { backgroundColor: THEME.skyMid, borderColor: THEME.skyMid },
  propertyChipText: { color: THEME.textSoft, fontSize: 12, fontWeight: '700' },
  propertyChipTextActive: { color: '#fff' },
  uploadCard: {
    borderWidth: 2,
    borderColor: THEME.leafLight,
    borderStyle: 'dashed',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    backgroundColor: THEME.panelSoft,
  },
  uploadStatusRow: {
    marginBottom: 12,
  },
  uploadStatusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(77,200,90,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.14)',
  },
  uploadStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  uploadIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(245,200,66,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.25)',
  },
  uploadTitle: { color: colors.textDark, fontSize: 24, fontWeight: '800', marginBottom: 6 },
  uploadSubtitle: {
    color: THEME.textSoft,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  photoDetailsRow: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  uploadActionsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  photoInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(77,200,90,0.1)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.16)',
  },
  photoInfoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  uploadButton: {
    borderRadius: 999,
    backgroundColor: THEME.leafLight,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: THEME.leafLight,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  uploadButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cancelPhotoButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.18)',
  },
  cancelPhotoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  geoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  geoTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  geoSubtitle: { color: THEME.textSoft, fontSize: 12, maxWidth: 220 },
  geoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(77,200,90,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.2)',
  },
  geoBadgeText: { color: THEME.leafLight, fontSize: 12, fontWeight: '700' },
  metadataRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metadataCard: {
    flex: 1,
    backgroundColor: THEME.panelSoft,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.12)',
  },
  metadataLabel: { color: THEME.skyMid, fontSize: 11, marginBottom: 4 },
  metadataValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  metadataAlertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(77,200,90,0.08)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.12)',
  },
  metadataAlertText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  metadataDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metadataDetailCard: {
    width: '48.8%',
    backgroundColor: THEME.panelSoft,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.12)',
  },
  metadataDetailLabel: {
    color: THEME.skyMid,
    fontSize: 11,
    marginBottom: 4,
  },
  metadataDetailValue: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  comparisonCard: {
    backgroundColor: THEME.panelSoft,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.12)',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  comparisonCopy: {
    flex: 1,
  },
  comparisonLabel: {
    color: THEME.skyMid,
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '700',
  },
  comparisonValue: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  comparisonDivider: {
    height: 1,
    backgroundColor: 'rgba(77,200,90,0.14)',
    marginVertical: 12,
  },
  primaryButton: {
    backgroundColor: THEME.skyMid,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: THEME.leafLight,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.25)',
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(77,200,90,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.1)',
    marginBottom: 10,
  },
  historyIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(77,200,90,0.12)',
    marginRight: 12,
  },
  historyCopy: { flex: 1 },
  historyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  historyMeta: { color: THEME.textSoft, fontSize: 12 },
  historyBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyBadgeText: { fontSize: 12, fontWeight: '700' },
});
