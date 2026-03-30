import { FontAwesome6 } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';

type Theme = {
  gold: string;
  green: string;
};

type Props = {
  isLoading: boolean;
  initialRegion: { latitude: number; longitude: number } | null;
  properties: any[];
  selectedProperty: any | null;
  onSelectProperty: (property: any) => void;
  theme: Theme;
  styles: Record<string, any>;
};

export default function PropertyMap({ isLoading, selectedProperty, theme, styles }: Props) {
  return (
    <View style={styles.mapFallback}>
      {isLoading ? (
        <>
          <ActivityIndicator color={theme.green} />
          <Text style={styles.mapFallbackText}>Carregando propriedades...</Text>
        </>
      ) : (
        <>
          <FontAwesome6 name="map-location-dot" size={24} color={theme.gold} />
          <Text style={styles.mapFallbackTitle}>Mapa indisponivel no navegador</Text>
          <Text style={styles.mapFallbackText}>
            {selectedProperty?.latitude != null && selectedProperty.longitude != null
              ? `Coordenadas: ${selectedProperty.latitude}, ${selectedProperty.longitude}`
              : 'Nenhuma propriedade com coordenadas cadastradas para mostrar no mapa.'}
          </Text>
        </>
      )}
    </View>
  );
}
