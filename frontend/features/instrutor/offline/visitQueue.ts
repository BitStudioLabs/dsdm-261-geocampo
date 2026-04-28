import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import type { PropertyOption, QueuedVisitRecord, SelectedPhoto } from '@/features/instrutor/types/visitas';

const OFFLINE_VISITS_STORAGE_KEY = 'offline-instrutor-visitas-v1';
const OFFLINE_VISITS_DIR = `${FileSystem.documentDirectory ?? ''}offline-visits`;

async function ensureOfflineVisitDirectory(userId: string) {
  const userDir = `${OFFLINE_VISITS_DIR}/${userId}`;
  const dirInfo = await FileSystem.getInfoAsync(userDir);

  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(userDir, { intermediates: true });
  }

  return userDir;
}

async function readQueue(): Promise<QueuedVisitRecord[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_VISITS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedVisitRecord[]) : [];
  } catch (error) {
    console.error('Erro ao ler fila offline de visitas:', error);
    return [];
  }
}

async function writeQueue(queue: QueuedVisitRecord[]) {
  await AsyncStorage.setItem(OFFLINE_VISITS_STORAGE_KEY, JSON.stringify(queue));
}

async function copyPhotoToOfflineDirectory(params: {
  userId: string;
  localId: string;
  selectedPhoto: SelectedPhoto;
}) {
  const { localId, selectedPhoto, userId } = params;
  const userDir = await ensureOfflineVisitDirectory(userId);
  const offlineUri = `${userDir}/visit-${localId}.${selectedPhoto.extension}`;

  if (selectedPhoto.uri !== offlineUri) {
    const existingInfo = await FileSystem.getInfoAsync(offlineUri);
    if (existingInfo.exists) {
      await FileSystem.deleteAsync(offlineUri, { idempotent: true });
    }

    await FileSystem.copyAsync({
      from: selectedPhoto.uri,
      to: offlineUri,
    });
  }

  return offlineUri;
}

export async function getQueuedInstructorVisits(userId: string) {
  const queue = await readQueue();
  return queue.filter((item) => item.userId === userId);
}

export async function queueInstructorVisitOffline(params: {
  userId: string;
  property: PropertyOption;
  selectedPhoto: SelectedPhoto;
  remoteVisitId?: number | null;
  syncStatus?: 'pending' | 'failed';
  lastError?: string | null;
}) {
  const { lastError = null, property, remoteVisitId = null, selectedPhoto, syncStatus = 'pending', userId } = params;
  const queue = await readQueue();
  const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const offlineUri = await copyPhotoToOfflineDirectory({ userId, localId, selectedPhoto });

  const queuedItem: QueuedVisitRecord = {
    localId,
    userId,
    property,
    createdAt: new Date().toISOString(),
    remoteVisitId,
    syncStatus,
    lastError,
    selectedPhoto: {
      ...selectedPhoto,
      uri: offlineUri,
    },
  };

  await writeQueue([queuedItem, ...queue]);
  return queuedItem;
}

export async function updateQueuedInstructorVisit(localId: string, updates: Partial<QueuedVisitRecord>) {
  const queue = await readQueue();
  const nextQueue = queue.map((item) => (item.localId === localId ? { ...item, ...updates } : item));
  await writeQueue(nextQueue);
}

export async function removeQueuedInstructorVisit(localId: string) {
  const queue = await readQueue();
  const item = queue.find((entry) => entry.localId === localId);

  if (item?.selectedPhoto.uri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(item.selectedPhoto.uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(item.selectedPhoto.uri, { idempotent: true });
      }
    } catch (error) {
      console.warn('Não foi possível remover a foto offline já sincronizada:', error);
    }
  }

  await writeQueue(queue.filter((entry) => entry.localId !== localId));
}
