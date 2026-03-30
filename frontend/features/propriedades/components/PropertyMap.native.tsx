import { FontAwesome6 } from '@expo/vector-icons';
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
  if (!initialRegion) {
    return (
      <View style={[styles.mapFrame, styles.map, { alignItems: 'center', justifyContent: 'center' }]}>
        <FontAwesome6 name="map-location-dot" size={24} color={theme.green} />
      </View>
    );
  }

  return (
    <View style={styles.mapFrame}>
      <MapView ref={undefined} style={styles.map} initialRegion={initialRegion}>
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
      {selectedProperty?.latitude != null && selectedProperty.longitude != null ? (
        <TouchableOpacity style={styles.centerButton} onPress={() => onSelectProperty(selectedProperty)} activeOpacity={0.85}>
          <FontAwesome6 name="crosshairs" size={13} color={theme.green} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
