import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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

import { colors } from '@/src/theme/colors';
import { supabase } from '@/src/lib/supabase';

const { width: SCREEN_W } = Dimensions.get('window');

const THEME = {
  skyTop: '#0a1f0d',
  skyMid: '#0f2e14',
  skyBottom: '#1a4a20',
  starColor: 'rgba(255,255,255,0.8)',
  leafLight: '#4dc85a',
  cornYellow: '#f5c842',
  cardBg: 'rgba(10,31,13,0.85)',
  cardBorder: 'rgba(77,200,90,0.2)',
  textGray: 'rgba(255,255,255,0.55)',
  link: '#7de88a',
};

type VisitRow = {
  id: number;
  criado_em: string | null;
  capturado_em: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  id_propriedade: number | null;
  propriedades:
    | {
        id: number;
        nome: string | null;
        latitude: number | null;
        longitude: number | null;
      }
    | {
        id: number;
        nome: string | null;
        latitude: number | null;
        longitude: number | null;
      }[]
    | null;
};

type Criterion = {
  id: string;
  titulo: string;
  descricao: string;
  progresso: number;
  icon: keyof typeof Ionicons.glyphMap;
  cor: string;
  status: 'ok' | 'warning';
};

const STARS = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: Math.random() * 220,
  size: Math.random() * 2 + 0.8,
  opacity: Math.random() * 0.5 + 0.3,
  twinkleDelay: Math.random() * 3000,
}));

function AnimatedStar({ star }: { star: typeof STARS[0] }) {
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
        withSequence(
          withTiming(1, { duration: 900 }),
          withTiming(0.25, { duration: 1100 })
        ),
        -1,
        true
      )
    );
  }, [blink, delay, progress]);

  const glowStyle = useAnimatedStyle(() => {
    const x = startX + Math.sin(progress.value * Math.PI * 2) * 20;
    const y = startY + Math.cos(progress.value * Math.PI * 2) * 12;
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

const FIREFLIES = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  startX: SCREEN_W * (0.1 + Math.random() * 0.8),
  startY: 60 + Math.random() * 140,
  delay: i * 300,
  size: 3 + Math.random() * 2,
}));

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

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Nao disponivel';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Nao disponivel';
  }

  return parsed.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
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

function getPropertyRecord(property: VisitRow['propriedades']) {
  if (Array.isArray(property)) {
    return property[0] ?? null;
  }

  return property ?? null;
}

export default function AvaliadorScreen() {
  const params = useLocalSearchParams<{ visitId?: string; propertyId?: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [visit, setVisit] = useState<VisitRow | null>(null);
  const [analysisSaveError, setAnalysisSaveError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadVisit() {
      if (!params.visitId) {
        setErrorMessage('Visita nao encontrada para analise.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage('');

        const { data, error } = await supabase
          .from('visitas')
          .select(
            'id, criado_em, capturado_em, latitude, longitude, altitude, id_propriedade, propriedades(id, nome, latitude, longitude)'
          )
          .eq('id', Number(params.visitId))
          .single();

        if (error) {
          throw error;
        }

        if (mounted) {
          setVisit(data as VisitRow);
        }
      } catch (error) {
        console.error('Erro ao carregar avaliacao da visita:', error);
        if (mounted) {
          setErrorMessage('Nao foi possivel carregar os dados da visita.');
          setVisit(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadVisit();

    return () => {
      mounted = false;
    };
  }, [params.visitId]);

  const property = useMemo(() => getPropertyRecord(visit?.propriedades ?? null), [visit?.propriedades]);

  const distanceMeters = useMemo(() => {
    if (
      visit?.latitude == null ||
      visit.longitude == null ||
      property?.latitude == null ||
      property.longitude == null
    ) {
      return null;
    }

    return calculateDistanceInMeters(visit.latitude, visit.longitude, property.latitude, property.longitude);
  }, [property?.latitude, property?.longitude, visit?.latitude, visit?.longitude]);

  const timeDifferenceMinutes = useMemo(() => {
    if (!visit?.criado_em || !visit.capturado_em) {
      return null;
    }

    const createdAt = new Date(visit.criado_em).getTime();
    const capturedAt = new Date(visit.capturado_em).getTime();

    if (Number.isNaN(createdAt) || Number.isNaN(capturedAt)) {
      return null;
    }

    return Math.round(Math.abs(createdAt - capturedAt) / 60000);
  }, [visit?.capturado_em, visit?.criado_em]);

  const score = useMemo(() => {
    let nextScore = 100;

    if (distanceMeters == null) {
      nextScore -= 55;
    } else if (distanceMeters <= 200) {
      nextScore -= 0;
    } else if (distanceMeters <= 1000) {
      nextScore -= 25;
    } else if (distanceMeters <= 5000) {
      nextScore -= 45;
    } else {
      nextScore -= 65;
    }

    if (timeDifferenceMinutes == null) {
      nextScore -= 10;
    } else if (timeDifferenceMinutes <= 10) {
      nextScore -= 0;
    } else if (timeDifferenceMinutes <= 60) {
      nextScore -= 10;
    } else {
      nextScore -= 20;
    }

    return Math.max(0, Math.min(100, nextScore));
  }, [distanceMeters, timeDifferenceMinutes]);

  const reliability = useMemo(() => {
    if (score >= 80) {
      return {
        headline: 'Alta Confiabilidade',
        description: 'A visita esta coerente com a localizacao da propriedade e sem sinais fortes de divergencia.',
        badge: 'Localizacao valida',
        color: THEME.leafLight,
      };
    }

    if (score >= 50) {
      return {
        headline: 'Confiabilidade Moderada',
        description: 'A visita possui sinais de atencao e precisa de revisao antes de ser considerada valida.',
        badge: 'Revisao recomendada',
        color: colors.warning,
      };
    }

    return {
      headline: 'Baixa Confiabilidade',
      description: 'A evidencia esta distante da propriedade ou sem metadados suficientes para validar a presenca.',
      badge: 'Alta suspeita',
        color: colors.danger,
    };
  }, [score]);

  const scoreDistance = useMemo(() => {
    if (distanceMeters == null) {
      return 15;
    }

    if (distanceMeters <= 200) {
      return 100;
    }

    if (distanceMeters <= 1000) {
      return 75;
    }

    if (distanceMeters <= 5000) {
      return 45;
    }

    return 20;
  }, [distanceMeters]);

  const scoreExifTimestamp = useMemo(() => {
    if (timeDifferenceMinutes == null) {
      return 55;
    }

    if (timeDifferenceMinutes <= 10) {
      return 100;
    }

    if (timeDifferenceMinutes <= 60) {
      return 75;
    }

    return 45;
  }, [timeDifferenceMinutes]);

  const classification = useMemo<'valida' | 'suspeita' | 'alto_risco_vpn'>(() => {
    if (score >= 80) {
      return 'valida';
    }

    return 'suspeita';
  }, [score]);

  const criteria = useMemo<Criterion[]>(() => {
    const distanceDescription =
      distanceMeters == null
        ? 'Foto sem coordenadas GPS para comparar com a propriedade.'
        : distanceMeters <= 200
          ? `${distanceMeters} m da propriedade - dentro do raio permitido.`
          : distanceMeters < 1000
            ? `${distanceMeters} m da propriedade - fora do raio esperado.`
            : `${(distanceMeters / 1000).toFixed(2)} km da propriedade - muito distante.`;

    const distanceProgress =
      distanceMeters == null
        ? 0.12
        : distanceMeters <= 200
          ? 0.96
          : distanceMeters <= 1000
            ? 0.45
            : 0.12;

    const timeDescription =
      timeDifferenceMinutes == null
        ? 'Nao foi possivel comparar o horario da foto com o envio.'
        : `${formatDateTime(visit?.capturado_em)} - diferenca de ${timeDifferenceMinutes} min para o envio.`;

    const timeProgress =
      timeDifferenceMinutes == null
        ? 0.35
        : timeDifferenceMinutes <= 10
          ? 0.92
          : timeDifferenceMinutes <= 60
            ? 0.58
            : 0.3;

    const metadataDescription =
      visit?.latitude != null && visit.longitude != null
        ? `GPS extraido com sucesso (${visit.latitude.toFixed(5)}, ${visit.longitude.toFixed(5)}).`
        : 'A foto enviada nao trouxe latitude/longitude nos metadados.';

    return [
      {
        id: '1',
        titulo: 'Distancia da propriedade',
        descricao: distanceDescription,
        progresso: distanceProgress,
        icon: 'location',
        cor: distanceMeters != null && distanceMeters <= 200 ? THEME.leafLight : colors.warning,
        status: distanceMeters != null && distanceMeters <= 200 ? 'ok' : 'warning',
      },
      {
        id: '2',
        titulo: 'Metadados da foto',
        descricao: metadataDescription,
        progresso: visit?.latitude != null && visit.longitude != null ? 0.95 : 0.15,
        icon: 'image-outline',
        cor: visit?.latitude != null && visit.longitude != null ? colors.info : colors.warning,
        status: visit?.latitude != null && visit.longitude != null ? 'ok' : 'warning',
      },
      {
        id: '3',
        titulo: 'Data e hora da captura',
        descricao: timeDescription,
        progresso: timeProgress,
        icon: 'time-outline',
        cor: timeDifferenceMinutes != null && timeDifferenceMinutes <= 10 ? THEME.leafLight : colors.warning,
        status: timeDifferenceMinutes != null && timeDifferenceMinutes <= 10 ? 'ok' : 'warning',
      },
    ];
  }, [distanceMeters, timeDifferenceMinutes, visit?.capturado_em, visit?.latitude, visit?.longitude]);

  const infoText = useMemo(() => {
    if (distanceMeters == null) {
      return 'A foto nao trouxe GPS no EXIF. Para validar a presenca com mais seguranca, use uma foto original da camera com localizacao ativa.';
    }

    if (distanceMeters <= 200) {
      return 'A localizacao da foto esta dentro do raio esperado para a propriedade vinculada.';
    }

    return 'A foto foi capturada longe da propriedade vinculada. O score caiu para refletir essa divergencia.';
  }, [distanceMeters]);

  useEffect(() => {
    let mounted = true;

    async function persistAnalysis() {
      if (!visit?.id || isLoading || errorMessage) {
        return;
      }

      try {
        setAnalysisSaveError('');

        const details = {
          propriedade_nome: property?.nome ?? null,
          distancia_metros: distanceMeters,
          diferenca_tempo_minutos: timeDifferenceMinutes,
          possui_gps: visit.latitude != null && visit.longitude != null,
          capturado_em: visit.capturado_em,
          criado_em: visit.criado_em,
          resumo: infoText,
          criterios: criteria.map((item) => ({
            id: item.id,
            titulo: item.titulo,
            descricao: item.descricao,
            progresso: item.progresso,
            status: item.status,
          })),
        };

        const payload = {
          id_visita: visit.id,
          score_total: score,
          classificacao: classification,
          score_distancia: scoreDistance,
          score_exif_timestamp: scoreExifTimestamp,
          score_ip_regiao: 100,
          score_deslocamento: distanceMeters != null && distanceMeters <= 200 ? 100 : 55,
          score_vpn: 100,
          distancia_calculada_metros: distanceMeters,
          vpn_detectada: false,
          exif_consistente: visit.latitude != null && visit.longitude != null,
          detalhes: details,
          analisado_em: new Date().toISOString(),
        };

        const { data: existingAnalysis, error: existingError } = await supabase
          .from('analises_antifraude')
          .select('id')
          .eq('id_visita', visit.id)
          .maybeSingle();

        if (existingError) {
          throw existingError;
        }

        const query = existingAnalysis?.id
          ? supabase.from('analises_antifraude').update(payload).eq('id', existingAnalysis.id)
          : supabase.from('analises_antifraude').insert(payload);

        const { error: saveError } = await query;

        if (saveError) {
          throw saveError;
        }
      } catch (error) {
        console.error('Erro ao salvar analise antifraude:', error);
        if (mounted) {
          setAnalysisSaveError('A analise foi calculada, mas nao foi possivel salvar o resultado no banco.');
        }
      }
    }

    persistAnalysis();

    return () => {
      mounted = false;
    };
  }, [
    classification,
    criteria,
    distanceMeters,
    errorMessage,
    infoText,
    isLoading,
    property?.nome,
    score,
    scoreDistance,
    scoreExifTimestamp,
    timeDifferenceMinutes,
    visit?.capturado_em,
    visit?.criado_em,
    visit?.id,
    visit?.latitude,
    visit?.longitude,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.skyTop} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
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
                <View style={[styles.crater, { top: 6, left: 8, width: 6, height: 6 }]} />
                <View style={[styles.crater, { top: 16, left: 20, width: 4, height: 4 }]} />
                <View style={[styles.crater, { top: 22, left: 10, width: 5, height: 5 }]} />
              </View>
            </View>
          </View>

          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={18} color={THEME.link} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Analise de Autenticidade</Text>
              <Text style={styles.heroSubtitle}>
                {(property?.nome ?? 'Propriedade vinculada')} - {formatDate(visit?.criado_em)}
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreRing}>
              <View style={styles.scoreRingInner}>
                <Text style={styles.scoreValue}>{isLoading ? '--' : score}</Text>
              </View>
            </View>

            <View style={styles.scoreMeta}>
              <Text style={styles.scoreHeadline}>{isLoading ? 'Carregando analise' : reliability.headline}</Text>
              <Text style={styles.scoreDescription}>
                {isLoading ? 'Buscando os dados reais da visita e comparando com a propriedade.' : reliability.description}
              </Text>
              <View style={[styles.validBadge, { borderColor: `${reliability.color}55` }]}>
                <Ionicons
                  name={!isLoading && score >= 80 ? 'checkmark-circle' : 'warning-outline'}
                  size={16}
                  color={reliability.color}
                />
                <Text style={[styles.validBadgeText, { color: reliability.color }]}>
                  {isLoading ? 'Aguardando dados' : reliability.badge}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.sectionTitle}>CRITERIOS DE ANALISE</Text>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={THEME.leafLight} size="large" />
              <Text style={styles.loadingText}>Carregando dados reais da visita...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.infoCard}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
              <Text style={styles.infoText}>{errorMessage}</Text>
            </View>
          ) : (
            <>
              {criteria.map((criterio) => (
                <View key={criterio.id} style={styles.criteriaRow}>
                  <View style={[styles.criteriaIcon, { backgroundColor: `${criterio.cor}20` }]}>
                    <Ionicons name={criterio.icon} size={18} color={criterio.cor} />
                  </View>
                  <View style={styles.criteriaContent}>
                    <View style={styles.criteriaHeader}>
                      <Text style={styles.criteriaTitle}>{criterio.titulo}</Text>
                      <Ionicons
                        name={criterio.status === 'ok' ? 'checkmark' : 'warning-outline'}
                        size={16}
                        color={criterio.status === 'ok' ? THEME.leafLight : colors.warning}
                      />
                    </View>
                    <Text style={styles.criteriaDescription}>{criterio.descricao}</Text>
                    <View style={styles.track}>
                      <View
                        style={[styles.fill, { width: `${criterio.progresso * 100}%`, backgroundColor: criterio.cor }]}
                      />
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
                <Text style={styles.infoText}>{infoText}</Text>
              </View>

              {analysisSaveError ? (
                <View style={styles.infoCard}>
                  <Ionicons name="cloud-offline-outline" size={20} color={colors.warning} />
                  <Text style={styles.infoText}>{analysisSaveError}</Text>
                </View>
              ) : null}

              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryNumber}>{score}</Text>
                  <Text style={styles.summaryLabel}>Score final</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryNumber}>{criteria.filter((item) => item.status === 'ok').length}/{criteria.length}</Text>
                  <Text style={styles.summaryLabel}>Crit. verificados</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },
  hero: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 22, position: 'relative', overflow: 'hidden' },
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
    top: 20,
    right: 70,
  },
  moon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fffbe0',
    shadowColor: '#fffbe0',
    shadowOpacity: 0.8,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  moonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
    backgroundColor: '#fffbe0',
    overflow: 'hidden',
  },
  crater: {
    position: 'absolute',
    backgroundColor: 'rgba(200,190,150,0.4)',
    borderRadius: 50,
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, zIndex: 10 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.cardBg, borderWidth: 1, borderColor: THEME.cardBorder, alignItems: 'center', justifyContent: 'center' },
  moreButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.cardBg, borderWidth: 1, borderColor: THEME.cardBorder, alignItems: 'center', justifyContent: 'center' },
  heroHeader: { marginBottom: 24, zIndex: 10 },
  heroCopy: { gap: 4 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  heroSubtitle: { color: THEME.link, fontSize: 13 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 18, zIndex: 10 },
  scoreRing: { width: 92, height: 92, borderRadius: 46, borderWidth: 8, borderColor: THEME.leafLight, alignItems: 'center', justifyContent: 'center', shadowColor: THEME.leafLight, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 },
  scoreRingInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: THEME.cardBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: THEME.cardBorder },
  scoreValue: { color: '#fff', fontSize: 28, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  scoreMeta: { flex: 1 },
  scoreHeadline: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  scoreDescription: { color: THEME.textGray, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  validBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(77,200,90,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(77,200,90,0.25)' },
  validBadgeText: { color: THEME.link, fontSize: 12, fontWeight: '700' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, minHeight: 520 },
  sectionTitle: { color: THEME.skyMid, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  criteriaRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0B1E17',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.1)',
  },
  criteriaIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  criteriaContent: { flex: 1 },
  criteriaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  criteriaTitle: { color: colors.textDark, fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  criteriaDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  track: { height: 4, borderRadius: 999, backgroundColor: 'rgba(77,200,90,0.15)' },
  fill: { height: '100%', borderRadius: 999 },
  infoCard: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(245,200,66,0.12)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(245,200,66,0.25)', marginTop: 4, marginBottom: 14 },
  infoText: { flex: 1, color: '#8B7845', fontSize: 13, lineHeight: 18 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, backgroundColor: colors.card, borderRadius: 18, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(77,200,90,0.1)' },
  summaryNumber: { color: THEME.skyMid, fontSize: 28, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { color: colors.textMuted, fontSize: 12 },
});
