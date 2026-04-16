import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';

import type { SelectedPhoto } from '@/features/instrutor/types/visitas';

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) {
    return 'Tamanho não informado';
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExifValue(exif: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in exif && exif[key] != null) {
      return exif[key];
    }
  }

  return null;
}

function toNumericExifPart(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    if (normalized.includes('/')) {
      const [rawA, rawB] = normalized.split('/');
      const a = Number(rawA);
      const b = Number(rawB);

      if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) {
        return a / b;
      }
    }

    const parsed = Number(normalized.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === 'object' && value !== null) {
    const maybeNumerator = (value as { numerator?: unknown; denominator?: unknown }).numerator;
    const maybeDenominator = (value as { numerator?: unknown; denominator?: unknown }).denominator;

    if (maybeNumerator != null && maybeDenominator != null) {
      const numerator = toNumericExifPart(maybeNumerator);
      const denominator = toNumericExifPart(maybeDenominator);

      if (numerator != null && denominator != null && denominator !== 0) {
        return numerator / denominator;
      }
    }
  }

  return null;
}

function toDecimalCoordinate(value: unknown, ref?: string) {
  if (typeof value === 'number') {
    if (value === 0 && !ref) {
      return null;
    }

    if (ref === 'S' || ref === 'W') {
      return value * -1;
    }

    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const direct = Number(normalized.replace(',', '.'));
    if (Number.isFinite(direct) && direct !== 0) {
      return ref === 'S' || ref === 'W' ? direct * -1 : direct;
    }

    const parts = normalized
      .split(/[,\s]+/)
      .map((part) => toNumericExifPart(part))
      .filter((part): part is number => part != null);

    if (parts.length >= 3) {
      const signal = ref === 'S' || ref === 'W' ? -1 : 1;
      return signal * (parts[0] + parts[1] / 60 + parts[2] / 3600);
    }

    return null;
  }

  if (!Array.isArray(value) || value.length < 3) {
    return null;
  }

  const parts = value
    .map((part) => toNumericExifPart(part))
    .filter((part): part is number => part != null);

  if (parts.length < 3) {
    return null;
  }

  const signal = ref === 'S' || ref === 'W' ? -1 : 1;
  return signal * (parts[0] + parts[1] / 60 + parts[2] / 3600);
}

function formatCoordinate(value: number | null, suffix = '') {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Não disponível';
  }

  return `${value.toFixed(5)}${suffix}`;
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

function extractCoordinate(exif: Record<string, unknown>, kind: 'latitude' | 'longitude') {
  const isLatitude = kind === 'latitude';
  const directKeys = isLatitude
    ? ['latitude', 'Latitude', 'GPSLatitudeDecimal', 'gpsLatitudeDecimal']
    : ['longitude', 'Longitude', 'GPSLongitudeDecimal', 'gpsLongitudeDecimal'];
  const dmsKeys = isLatitude
    ? ['GPSLatitude', 'gpsLatitude', 'ExifGPSLatitude']
    : ['GPSLongitude', 'gpsLongitude', 'ExifGPSLongitude'];
  const refKeys = isLatitude
    ? ['GPSLatitudeRef', 'gpsLatitudeRef', 'ExifGPSLatitudeRef']
    : ['GPSLongitudeRef', 'gpsLongitudeRef', 'ExifGPSLongitudeRef'];

  const refValue = getExifValue(exif, refKeys);
  const ref = typeof refValue === 'string' ? refValue.toUpperCase() : undefined;
  const directValue = getExifValue(exif, directKeys);
  const directCoordinate = toDecimalCoordinate(directValue, ref);

  if (directCoordinate != null) {
    return directCoordinate;
  }

  const dmsValue = getExifValue(exif, dmsKeys);
  return toDecimalCoordinate(dmsValue, ref);
}

function extractAltitude(exif: Record<string, unknown>) {
  const altitudeValue = getExifValue(exif, ['altitude', 'Altitude', 'GPSAltitude', 'gpsAltitude']);
  return toNumericExifPart(altitudeValue);
}

export async function enrichAssetWithMediaLibrary(asset: ImagePicker.ImagePickerAsset) {
  if (!asset.assetId) {
    return asset;
  }

  try {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      return asset;
    }

    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.assetId);
    const mediaLibraryExif = (((assetInfo as unknown as { exif?: Record<string, unknown> | null }).exif) ?? {}) as Record<
      string,
      unknown
    >;
    const mediaLocation =
      ((assetInfo as unknown as { location?: { latitude?: number; longitude?: number; altitude?: number } | null })
        .location) ?? null;
    const assetExif = ((asset.exif ?? {}) as Record<string, unknown>) ?? {};

    const mergedExif: Record<string, unknown> = {
      ...mediaLibraryExif,
      ...assetExif,
    };

    if (mediaLocation?.latitude != null && mergedExif.latitude == null && mergedExif.GPSLatitude == null) {
      mergedExif.latitude = mediaLocation.latitude;
      mergedExif.GPSLatitudeDecimal = mediaLocation.latitude;
    }

    if (mediaLocation?.longitude != null && mergedExif.longitude == null && mergedExif.GPSLongitude == null) {
      mergedExif.longitude = mediaLocation.longitude;
      mergedExif.GPSLongitudeDecimal = mediaLocation.longitude;
    }

    if (mediaLocation?.altitude != null && mergedExif.altitude == null && mergedExif.GPSAltitude == null) {
      mergedExif.altitude = mediaLocation.altitude;
      mergedExif.GPSAltitude = mediaLocation.altitude;
    }

    return {
      ...asset,
      exif: mergedExif,
    };
  } catch (error) {
    console.warn('Falha ao enriquecer EXIF via media library:', error);
    return asset;
  }
}

export function buildSelectedPhoto(asset: ImagePicker.ImagePickerAsset): SelectedPhoto {
  const exif = (asset.exif ?? {}) as Record<string, unknown>;
  const exifFieldCount = Object.keys(exif).length;
  const latitude = extractCoordinate(exif, 'latitude');
  const longitude = extractCoordinate(exif, 'longitude');
  const altitudeValue = extractAltitude(exif);
  const altitude = altitudeValue != null ? `${Math.round(altitudeValue)}m` : 'Não disponível';
  const rawDate =
    (getExifValue(exif, ['DateTimeOriginal', 'DateTimeDigitized', 'CreateDate', 'dateTime']) as string | null) ?? null;
  const extension = asset.fileName?.split('.').pop()?.toLowerCase() || asset.mimeType?.split('/').pop() || 'jpg';
  const cameraModel = (getExifValue(exif, ['Model', 'model', 'make', 'Make']) as string | null) || 'Não identificado';

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

export function getPhotoMetadataErrorMessage(error: unknown) {
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

export function base64ToArrayBuffer(base64: string) {
  const binaryString = globalThis.atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}
