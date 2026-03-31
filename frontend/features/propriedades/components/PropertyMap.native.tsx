import { FontAwesome6 } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

type PropertyStatus = 'ativo' | 'inativo' | 'em_analise' | null;

type PropertyRow = {
  id: number;
  nome: string | null;
  municipio_nome: string | null;
  uf: string | null;
  latitude: number | null;
  longitude: number | null;
  status_propriedade: PropertyStatus;
};

type Theme = {
  green: string;
  borderStrong: string;
};

type Props = {
  isLoading: boolean;
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null;
  properties: PropertyRow[];
  selectedProperty: PropertyRow | null;
  onSelectProperty: (property: PropertyRow) => void;
  theme: Theme;
  styles: Record<string, any>;
};

function getPinColor(status: PropertyStatus, theme: Theme) {
  if (status === 'em_analise') return '#f59e0b';
  if (status === 'inativo') return '#ff6b6b';
  return theme.green;
}

export default function PropertyMap({
  initialRegion,
  properties,
  selectedProperty,
  onSelectProperty,
  theme,
  styles,
}: Props) {
  const mapRef = useRef<MapView | null>(null);

  const coordinates = useMemo(
    () =>
      properties
        .filter((property) => property.latitude != null && property.longitude != null)
        .map((property) => ({
          latitude: property.latitude as number,
          longitude: property.longitude as number,
        })),
    [properties]
  );

  const fitMapToProperties = () => {
    if (!mapRef.current || coordinates.length === 0) {
      return;
    }

    if (coordinates.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        400
      );
      return;
    }

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: {
        top: 48,
        right: 48,
        bottom: 48,
        left: 48,
      },
      animated: true,
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fitMapToProperties();
    }, 180);

    return () => clearTimeout(timer);
  }, [coordinates]);

  if (!initialRegion) {
    return (
      <View style={[styles.mapFrame, styles.map, { alignItems: 'center', justifyContent: 'center' }]}>
        <FontAwesome6 name="map-location-dot" size={24} color={theme.green} />
      </View>
    );
  }

  return (
    <View style={styles.mapFrame}>
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion} onMapReady={fitMapToProperties}>
        {properties.map((property) => (
          <Marker
            key={property.id}
            coordinate={{ latitude: property.latitude!, longitude: property.longitude! }}
            title={property.nome ?? 'Propriedade'}
            description={[property.municipio_nome, property.uf].filter(Boolean).join(' - ')}
            pinColor={property.id === selectedProperty?.id ? theme.green : getPinColor(property.status_propriedade, theme)}
            onPress={() => onSelectProperty(property)}
          />
        ))}
      </MapView>
      {coordinates.length > 0 ? (
        <TouchableOpacity style={styles.centerButton} onPress={fitMapToProperties} activeOpacity={0.85}>
          <FontAwesome6 name="crosshairs" size={13} color={theme.green} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
