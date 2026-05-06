import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { createInstructorVisit, fetchInstructorVisitsData, syncQueuedInstructorVisits } from '@/features/instrutor/api/visitas';
import type { InstructorVisitsFeedback, PropertyOption, SelectedPhoto, VisitHistoryItem } from '@/features/instrutor/types/visitas';
import {
  applyDeviceLocationFallback,
  buildSelectedPhoto,
  enrichAssetWithMediaLibrary,
  getPhotoMetadataErrorMessage,
} from '@/features/instrutor/utils/photoMetadata';

export function useInstructorVisits() {
  const { profile, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [feedback, setFeedback] = useState<InstructorVisitsFeedback>(null);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [history, setHistory] = useState<VisitHistoryItem[]>([]);
  const [queuedVisitsCount, setQueuedVisitsCount] = useState(0);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null);
  const hasFocusedOnceRef = useRef(false);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = setTimeout(() => {
      setFeedback(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [feedback]);

  const loadVisitasData = useCallback(async () => {
    const currentUserId = profile?.id ?? user?.id;

    if (!currentUserId) {
      setErrorMessage('');
      setIsOfflineMode(false);
      setProperties([]);
      setHistory([]);
      setQueuedVisitsCount(0);
      setSelectedPropertyId(null);
      setIsLoading(false);
      return;
    }

    await syncQueuedInstructorVisits(currentUserId);

    const {
      properties: nextProperties,
      history: nextHistory,
      queuedVisitsCount: nextQueuedVisitsCount,
      isOfflineMode: nextIsOfflineMode,
    } = await fetchInstructorVisitsData(currentUserId);

    setProperties(nextProperties);
    setHistory(nextHistory);
    setQueuedVisitsCount(nextQueuedVisitsCount);
    setIsOfflineMode(nextIsOfflineMode);
    setErrorMessage(nextIsOfflineMode ? 'Você está offline. Exibindo as propriedades e visitas salvas no aparelho.' : '');
    setSelectedPropertyId((current) =>
      nextProperties.some((item) => item.id === current) ? current ?? null : nextProperties[0]?.id ?? null
    );
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
          setIsOfflineMode(false);
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

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      let active = true;

      setRefreshing(true);
      (async () => {
        try {
          await loadVisitasData();
        } catch (error) {
          console.error('Erro ao recarregar tela de visitas ao retomar foco:', error);
        } finally {
          if (active) {
            setRefreshing(false);
          }
        }
      })();

      return () => {
        active = false;
      };
    }, [loadVisitasData])
  );

  const selectedProperty = useMemo(
    () => properties.find((item) => item.id === selectedPropertyId) ?? properties[0] ?? null,
    [properties, selectedPropertyId]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadVisitasData();
    } catch (error) {
      console.error('Erro ao atualizar tela de visitas:', error);
      setIsOfflineMode(false);
      setErrorMessage('Não foi possível atualizar suas visitas agora.');
    } finally {
      setRefreshing(false);
    }
  }, [loadVisitasData]);

  const handleSyncNow = useCallback(async () => {
    const currentUserId = profile?.id ?? user?.id;

    if (!currentUserId || queuedVisitsCount === 0) {
      return;
    }

    try {
      setIsSyncingQueue(true);
      const result = await syncQueuedInstructorVisits(currentUserId);
      await loadVisitasData();

      if (result.syncedCount > 0 && result.remainingCount === 0) {
        setFeedback({ type: 'success', message: 'Todas as visitas offline foram enviadas com sucesso.' });
        return;
      }

      if (result.syncedCount > 0) {
        setFeedback({
          type: 'success',
          message: `${result.syncedCount} visita(s) foram sincronizadas. Ainda restam ${result.remainingCount} pendente(s).`,
        });
        return;
      }

      setFeedback({
        type: 'error',
        message: 'As visitas continuam salvas no aparelho e serao enviadas quando a internet voltar.',
      });
    } catch (error) {
      console.error('Erro ao sincronizar visitas offline:', error);
      setFeedback({ type: 'error', message: getPhotoMetadataErrorMessage(error) });
    } finally {
      setIsSyncingQueue(false);
    }
  }, [loadVisitasData, profile?.id, queuedVisitsCount, user?.id]);

  const handlePickImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setFeedback({ type: 'error', message: 'Autorize o acesso a galeria para selecionar a foto da visita.' });
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

      const enrichedAsset = await enrichAssetWithMediaLibrary(result.assets[0]);
      let nextPhoto = buildSelectedPhoto(enrichedAsset);

      if (!nextPhoto.hasGps) {
        try {
          const locationPermission = await Location.requestForegroundPermissionsAsync();

          if (locationPermission.granted) {
            const currentPosition = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });

            nextPhoto = applyDeviceLocationFallback(nextPhoto, currentPosition.coords);
          }
        } catch (locationError) {
          console.warn('Não foi possível usar a localização atual como fallback da visita:', locationError);
        }
      }

      setSelectedPhoto(nextPhoto);
      setFeedback(null);
    } catch (error) {
      console.error('Erro ao selecionar foto da visita:', error);
      setFeedback({ type: 'error', message: 'Nao foi possivel abrir sua galeria agora.' });
    }
  }, []);

  const handleClearSelectedPhoto = useCallback(() => {
    setSelectedPhoto(null);
  }, []);

  const handleCreateVisit = useCallback(async () => {
    const currentUserId = profile?.id ?? user?.id;

    if (!currentUserId || !selectedProperty) {
      setFeedback({ type: 'error', message: 'Selecione uma propriedade antes de continuar.' });
      return;
    }

    if (!selectedPhoto) {
      setFeedback({ type: 'error', message: 'Selecione a foto da visita antes de enviar para analise.' });
      return;
    }

    try {
      setIsSubmittingVisit(true);
      setErrorMessage('');
      setFeedback(null);

      const result = await createInstructorVisit({
        currentUserId,
        property: selectedProperty,
        selectedPhoto,
      });

      await loadVisitasData();
      setSelectedPhoto(null);

      if (result.queuedOffline || !result.visitId) {
        setFeedback({
          type: 'success',
          message: 'A foto foi guardada no aparelho e sera sincronizada automaticamente quando a conexao voltar.',
        });
        return;
      }

      router.push({
        pathname: '/avaliador',
        params: { visitId: String(result.visitId), propertyId: String(selectedProperty.id) },
      } as never);
    } catch (error) {
      console.error('Erro ao registrar visita do instrutor:', error);
      setFeedback({ type: 'error', message: getPhotoMetadataErrorMessage(error) });
    } finally {
      setIsSubmittingVisit(false);
    }
  }, [loadVisitasData, profile?.id, selectedPhoto, selectedProperty, user?.id]);

  return {
    errorMessage,
    feedback,
    handleClearSelectedPhoto,
    handleCreateVisit,
    handlePickImage,
    handleRefresh,
    handleSyncNow,
    history,
    isLoading,
    isOfflineMode,
    isSubmittingVisit,
    isSyncingQueue,
    properties,
    queuedVisitsCount,
    refreshing,
    selectedPhoto,
    selectedProperty,
    selectedPropertyId,
    setSelectedPropertyId,
  };
}
