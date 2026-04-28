import React, { useEffect, useMemo } from 'react';
import { Image } from 'expo-image';
import {
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

import { EmptyStateCard } from '@/features/instrutor/components/EmptyStateCard';
import { FeedbackCard } from '@/features/instrutor/components/FeedbackCard';
import { LoadingState } from '@/features/instrutor/components/LoadingState';
import { SectionCard } from '@/features/instrutor/components/SectionCard';
import { StatCard } from '@/features/instrutor/components/StatCard';
import { useInstructorVisits } from '@/features/instrutor/hooks/useInstructorVisits';
import type { VisitHistoryItem } from '@/features/instrutor/types/visitas';
import { calculateDistanceInMeters } from '@/features/instrutor/utils/visitFormatting';
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

function getHistoryStatusStyle(status: VisitHistoryItem['status']) {
  switch (status) {
    case 'Concluída':
      return { bg: 'rgba(89,210,124,0.14)', text: THEME.leafLight };
    default:
      return { bg: 'rgba(103,184,255,0.14)', text: '#3d8fcb' };
  }
}

export default function VisitasScreen() {
  const {
    errorMessage,
    handleClearSelectedPhoto,
    handleCreateVisit,
    handlePickImage,
    handleRefresh,
    history,
    isLoading,
    isOfflineMode,
    isSubmittingVisit,
    isSyncingQueue,
    handleSyncNow,
    properties,
    queuedVisitsCount,
    refreshing,
    selectedPhoto,
    selectedProperty,
    selectedPropertyId,
    setSelectedPropertyId,
  } = useInstructorVisits();

  const metadataItems = useMemo(
    () => [
      {
        label: 'Latitude',
        value: !selectedPhoto
          ? 'Aguardando foto'
          : selectedPhoto.latitudeValue != null
            ? selectedPhoto.latitude
            : 'Sem GPS na foto',
      },
      {
        label: 'Longitude',
        value: !selectedPhoto
          ? 'Aguardando foto'
          : selectedPhoto.longitudeValue != null
            ? selectedPhoto.longitude
            : 'Sem GPS na foto',
      },
      {
        label: 'Altitude',
        value: !selectedPhoto
          ? 'Aguardando foto'
          : selectedPhoto.altitudeValue != null
            ? selectedPhoto.altitude
            : 'Sem altitude no EXIF',
      },
    ],
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
            <StatCard
              icon="business-outline"
              iconColor={THEME.leafLight}
              value={pendingPropertiesCount}
              label="Disponíveis"
              containerStyle={styles.heroStatCard}
              iconWrapStyle={styles.heroStatIcon}
              valueStyle={styles.heroStatValue}
              labelStyle={styles.heroStatLabel}
            />

            <StatCard
              icon="images-outline"
              iconColor={THEME.cornYellow}
              value={selectedPhoto ? '1' : '0'}
              label="Foto pronta"
              containerStyle={styles.heroStatCard}
              iconWrapStyle={styles.heroStatIcon}
              valueStyle={styles.heroStatValue}
              labelStyle={styles.heroStatLabel}
            />

            <StatCard
              icon="checkmark-done-outline"
              iconColor={THEME.link}
              value={completedVisitsCount}
              label="Realizadas"
              containerStyle={styles.heroStatCard}
              iconWrapStyle={styles.heroStatIcon}
              valueStyle={styles.heroStatValue}
              labelStyle={styles.heroStatLabel}
            />
          </View>
        </View>

        {errorMessage ? (
          <FeedbackCard
            text={errorMessage}
            icon={isOfflineMode ? 'cloud-offline-outline' : 'alert-circle-outline'}
            iconColor={THEME.cornYellow}
            containerStyle={[styles.feedbackCard, isOfflineMode && styles.feedbackCardOffline]}
            textStyle={styles.feedbackText}
          />
        ) : null}

        {queuedVisitsCount > 0 ? (
          <View style={styles.syncCard}>
            <View style={styles.syncCardCopy}>
              <View style={styles.syncBadge}>
                <Ionicons name="cloud-offline-outline" size={14} color={THEME.cornYellow} />
                <Text style={styles.syncBadgeText}>
                  {queuedVisitsCount} pendente{queuedVisitsCount > 1 ? 's' : ''}
                </Text>
              </View>
              <Text style={styles.syncTitle}>Visitas salvas no aparelho</Text>
              <Text style={styles.syncText}>
                Mesmo sem internet, você pode continuar registrando visitas. Quando a conexão voltar, sincronize daqui.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
              style={[styles.syncButton, isSyncingQueue && styles.syncButtonDisabled]}
              onPress={handleSyncNow}
              disabled={isSyncingQueue}>
              <Text style={styles.syncButtonText}>
                {isSyncingQueue ? 'Sincronizando...' : 'Sincronizar agora'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <SectionCard containerStyle={styles.section} title="NOVA EVIDÊNCIA" titleStyle={styles.sectionTitle}>
          <Text style={styles.helperText}>
            Escolha a propriedade para vincular a foto da visita realizada.
          </Text>

          {isLoading ? (
            <LoadingState
              color={THEME.leafLight}
              size="large"
              text="Carregando propriedades atribuídas..."
              containerStyle={styles.loadingWrap}
              textStyle={styles.loadingText}
            />
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
            <EmptyStateCard
              icon="business-outline"
              iconColor={THEME.textGray}
              title="Nenhuma propriedade atribuída"
              description="Quando uma fazenda for vinculada ao seu usuário, ela aparecerá aqui para envio de evidências."
              containerStyle={styles.emptyBox}
              titleStyle={styles.emptyTitle}
              descriptionStyle={styles.emptyText}
              showIconWrap={false}
            />
          )}
        </SectionCard>

        <SectionCard containerStyle={styles.section} title="UPLOAD DE FOTO" titleStyle={styles.sectionTitle}>
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
        </SectionCard>

        <SectionCard containerStyle={styles.section}>
          <View style={styles.geoHeader}>
            <View>
              <Text style={styles.geoTitle}>Localização extraída</Text>
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
                {!selectedPhoto ? 'Aguardando foto' : selectedPhoto.hasGps ? selectedPhoto.locationSourceLabel : 'Sem GPS'}
              </Text>
            </View>
          </View>

          <View style={styles.metadataRow}>
            {metadataItems.map((item) => (
              <View key={item.label} style={styles.metadataCard}>
                <Text style={styles.metadataLabel}>{item.label}</Text>
                <Text style={styles.metadataValue}>{item.value}</Text>
              </View>
            ))}
          </View>

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
                <Text style={styles.comparisonLabel}>Validação da foto</Text>
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
        </SectionCard>

        <SectionCard containerStyle={styles.section} title="VISITAS REALIZADAS" titleStyle={styles.sectionTitle}>

          {isLoading ? (
            <LoadingState
              color={THEME.leafLight}
              text="Carregando histórico..."
              containerStyle={styles.loadingWrap}
              textStyle={styles.loadingText}
            />
          ) : history.length === 0 ? (
            <EmptyStateCard
              icon="clipboard-outline"
              iconColor={THEME.textGray}
              title="Nenhuma visita registrada"
              description="Assim que você concluir visitas, elas vão aparecer aqui."
              containerStyle={styles.emptyBox}
              titleStyle={styles.emptyTitle}
              descriptionStyle={styles.emptyText}
              showIconWrap={false}
            />
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
        </SectionCard>
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
  feedbackCardOffline: {
    backgroundColor: 'rgba(242,201,76,0.1)',
  },
  syncCard: {
    marginHorizontal: 18,
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(242,201,76,0.18)',
    backgroundColor: 'rgba(242,201,76,0.08)',
    padding: 14,
    gap: 12,
  },
  syncCardCopy: {
    gap: 8,
  },
  syncBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(242,201,76,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  syncBadgeText: {
    color: THEME.cornYellow,
    fontSize: 12,
    fontWeight: '700',
  },
  syncTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  syncText: {
    color: THEME.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  syncButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: THEME.cornYellow,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  syncButtonDisabled: {
    opacity: 0.55,
  },
  syncButtonText: {
    color: THEME.skyTop,
    fontSize: 13,
    fontWeight: '800',
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
  uploadTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 6 },
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
  metadataRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  metadataCard: {
    minWidth: '31%',
    flexGrow: 1,
    backgroundColor: THEME.panelSoft,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.12)',
  },
  metadataLabel: { color: THEME.skyMid, fontSize: 11, marginBottom: 4 },
  metadataValue: { color: '#fff', fontSize: 16, lineHeight: 20, fontWeight: '800' },
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
