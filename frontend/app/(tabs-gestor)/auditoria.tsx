import { FontAwesome6 } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const THEME = {
  skyTop: '#0a1f0d',
  leafLight: '#4dc85a',
  gold: '#f5c842',
  error: '#ff6b6b',
  blue: '#5b9cff',
  white: '#ffffff',
  textMuted: 'rgba(255,255,255,0.55)',
  cardBg: 'rgba(10,31,13,0.85)',
};

const ALERTS = [
  { id: '1', title: 'Localizacao divergente', level: 'Alta', color: THEME.error },
  { id: '2', title: 'Visitas simultaneas', level: 'Media', color: THEME.gold },
  { id: '3', title: 'Padrao suspeito', level: 'Baixa', color: THEME.blue },
];

export default function AuditoriaScreen() {
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Auditoria</Text>
        <Text style={styles.subtitle}>Visão inicial dos alertas operacionais e de antifraude.</Text>

        {ALERTS.map((alert) => (
          <TouchableOpacity key={alert.id} style={styles.card} activeOpacity={0.9}>
            <View style={[styles.iconBox, { backgroundColor: `${alert.color}22` }]}>
              <FontAwesome6 name="shield-halved" size={16} color={alert.color} />
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{alert.title}</Text>
              <Text style={styles.cardMeta}>Severidade {alert.level}</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={12} color={THEME.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.skyTop },
  content: { padding: 20, paddingTop: 56, paddingBottom: 120 },
  title: { fontSize: 28, fontWeight: '800', color: THEME.white, marginBottom: 6 },
  subtitle: { fontSize: 14, color: THEME.textMuted, marginBottom: 18 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: THEME.cardBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(77,200,90,0.12)', marginBottom: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1 },
  cardTitle: { color: THEME.white, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardMeta: { color: THEME.textMuted, fontSize: 12 },
});
