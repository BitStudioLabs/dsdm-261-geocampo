export type PropertyOption = {
  id: number;
  nome: string;
  meta: string;
  latitude: number | null;
  longitude: number | null;
};

export type VisitHistoryItem = {
  id: string;
  propriedade: string;
  data: string;
  hora: string;
  status: 'Concluída' | 'Enviada';
  isOfflineQueue?: boolean;
  syncStatus?: 'pending' | 'failed';
};

export type VisitStatusDb =
  | 'pendente'
  | 'em_andamento'
  | 'finalizada'
  | 'em_analise'
  | 'aprovada'
  | 'rejeitada'
  | 'excluida'
  | null;

export type AtribuicaoRow = {
  id: number;
  id_propriedade: number;
  atualizado_em?: string | null;
  criado_em?: string | null;
};

export type VisitaRow = {
  id: number;
  id_propriedade: number | null;
  criado_em?: string | null;
  status_visita?: VisitStatusDb;
};

export type PropertyLookup = Record<
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

export type SelectedPhoto = {
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

export type QueuedVisitRecord = {
  localId: string;
  userId: string;
  property: PropertyOption;
  selectedPhoto: SelectedPhoto;
  createdAt: string;
  remoteVisitId?: number | null;
  syncStatus: 'pending' | 'failed';
  lastError?: string | null;
};

export type CreateVisitResult = {
  visitId: number | null;
  propertyId: number;
  queuedOffline: boolean;
  localId?: string | null;
};
