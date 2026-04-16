import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { createInstructorVisit, fetchInstructorVisitsData } from '@/features/instrutor/api/visitas';
import type { PropertyOption, SelectedPhoto, VisitHistoryItem } from '@/features/instrutor/types/visitas';
import {
  buildSelectedPhoto,
  enrichAssetWithMediaLibrary,
  getPhotoMetadataErrorMessage,
} from '@/features/instrutor/utils/photoMetadata';

export function useInstructorVisits() {
  const { profile, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [history, setHistory] = useState<VisitHistoryItem[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null);
  const hasFocusedOnceRef = useRef(false);

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

    const { properties: nextProperties, history: nextHistory } = await fetchInstructorVisitsData(currentUserId);

    setProperties(nextProperties);
    setHistory(nextHistory);
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
      setErrorMessage('Não foi possível atualizar suas visitas agora.');
    } finally {
      setRefreshing(false);
    }
  }, [loadVisitasData]);

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

      const enrichedAsset = await enrichAssetWithMediaLibrary(result.assets[0]);
      setSelectedPhoto(buildSelectedPhoto(enrichedAsset));
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

      const result = await createInstructorVisit({
        currentUserId,
        propertyId: selectedProperty.id,
        selectedPhoto,
      });

      await loadVisitasData();
      setSelectedPhoto(null);
      router.push({
        pathname: '/avaliador',
        params: result.visitId ? { visitId: String(result.visitId), propertyId: String(selectedProperty.id) } : undefined,
      } as never);
    } catch (error) {
      console.error('Erro ao registrar visita do instrutor:', error);
      Alert.alert('Erro ao registrar', getPhotoMetadataErrorMessage(error));
    } finally {
      setIsSubmittingVisit(false);
    }
  }, [loadVisitasData, profile?.id, selectedPhoto, selectedProperty, user?.id]);

  return {
    errorMessage,
    handleClearSelectedPhoto,
    handleCreateVisit,
    handlePickImage,
    handleRefresh,
    history,
    isLoading,
    isSubmittingVisit,
    properties,
    refreshing,
    selectedPhoto,
    selectedProperty,
    selectedPropertyId,
    setSelectedPropertyId,
  };
}
