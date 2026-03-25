import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { colors } from '../../src/theme/colors';

const PROPRIEDADES = [
  { id: '1', nome: 'Fazenda Santa Clara', meta: 'Ribeirao Preto, SP' },
  { id: '2', nome: 'Sitio Boa Esperanca', meta: 'Bauru, SP' },
  { id: '3', nome: 'Chacara Vale Verde', meta: 'Jau, SP' },
] as const;

const VISITAS_REALIZADAS = [
  {
    id: '1',
    propriedade: 'Fazenda Santa Clara',
    data: '24/05/2025',
    hora: '09:41',
    status: 'Analisada',
  },
  {
    id: '2',
    propriedade: 'Sitio Boa Esperanca',
    data: '22/05/2025',
    hora: '13:20',
    status: 'Enviada',
  },
  {
    id: '3',
    propriedade: 'Rancho Ipe Amarelo',
    data: '20/05/2025',
    hora: '10:15',
    status: 'Concluida',
  },
] as const;

const METADADOS = [
  { label: 'Latitude', value: '-21.1785' },
  { label: 'Longitude', value: '-47.8164' },
  { label: 'Altitude', value: '621m' },
] as const;

export default function VisitasScreen() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(PROPRIEDADES[0].id);

  const selectedProperty =
    PROPRIEDADES.find((item) => item.id === selectedPropertyId) ?? PROPRIEDADES[0];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Visitas</Text>
            <Text style={styles.subtitle}>
              Historico das visitas realizadas e novo envio de evidencias
            </Text>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.primaryDark} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOVA EVIDENCIA</Text>
          <Text style={styles.helperText}>
            Escolha a propriedade para vincular a foto da visita realizada.
          </Text>

          <View style={styles.selectionCard}>
            <View style={styles.selectionTop}>
              <View style={styles.selectionIcon}>
                <Ionicons name="business-outline" size={22} color={colors.primaryLight} />
              </View>
              <View style={styles.selectionCopy}>
                <Text style={styles.selectionLabel}>Propriedade selecionada</Text>
                <Text style={styles.selectionTitle}>{selectedProperty.nome}</Text>
                <Text style={styles.selectionMeta}>{selectedProperty.meta}</Text>
              </View>
            </View>

            <View style={styles.chipsRow}>
              {PROPRIEDADES.map((item) => {
                const isActive = item.id === selectedPropertyId;

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.9}
                    onPress={() => setSelectedPropertyId(item.id)}
                    style={[styles.propertyChip, isActive && styles.propertyChipActive]}>
                    <Text
                      style={[
                        styles.propertyChipText,
                        isActive && styles.propertyChipTextActive,
                      ]}>
                      {item.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UPLOAD DE FOTO</Text>
          <TouchableOpacity activeOpacity={0.9} style={styles.uploadCard}>
            <View style={styles.uploadIconWrap}>
              <Ionicons name="folder-open-outline" size={34} color={colors.warning} />
            </View>
            <Text style={styles.uploadTitle}>Selecionar Foto</Text>
            <Text style={styles.uploadSubtitle}>
              JPEG, PNG, HEIC - metadados GPS serao lidos automaticamente
            </Text>
            <View style={styles.uploadButton}>
              <Text style={styles.uploadButtonText}>Escolher Arquivo</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.geoHeader}>
            <View>
              <Text style={styles.geoTitle}>Geolocalizacao Extraida</Text>
              <Text style={styles.geoSubtitle}>
                Metadados da foto selecionada para {selectedProperty.nome}
              </Text>
            </View>
            <View style={styles.geoBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.geoBadgeText}>Metadados OK</Text>
            </View>
          </View>

          <View style={styles.metadataRow}>
            {METADADOS.map((item) => (
              <View key={item.label} style={styles.metadataCard}>
                <Text style={styles.metadataLabel}>{item.label}</Text>
                <Text style={styles.metadataValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.primaryButton}
            onPress={() => router.push('/avaliador')}>
            <Text style={styles.primaryButtonText}>Enviar para Analise</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VISITAS REALIZADAS</Text>
          {VISITAS_REALIZADAS.map((item) => (
            <View key={item.id} style={styles.historyRow}>
              <View style={styles.historyIcon}>
                <Ionicons name="clipboard-outline" size={20} color={colors.primaryLight} />
              </View>
              <View style={styles.historyCopy}>
                <Text style={styles.historyTitle}>{item.propriedade}</Text>
                <Text style={styles.historyMeta}>
                  {item.data} - {item.hora}
                </Text>
              </View>
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>{item.status}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: colors.textDark,
    fontSize: 29,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  moreButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0B1E17',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  sectionTitle: {
    color: '#979289',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  selectionCard: {
    backgroundColor: '#F8F4EC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8DECF',
  },
  selectionTop: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  selectionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#E0F2E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectionCopy: {
    flex: 1,
  },
  selectionLabel: {
    color: '#989289',
    fontSize: 11,
    marginBottom: 4,
  },
  selectionTitle: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  selectionMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  propertyChip: {
    borderRadius: 999,
    backgroundColor: '#ECE6DA',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  propertyChipActive: {
    backgroundColor: colors.primaryDark,
  },
  propertyChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  propertyChipTextActive: {
    color: colors.textLight,
  },
  uploadCard: {
    borderWidth: 2,
    borderColor: '#70C995',
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#EAF7EE',
  },
  uploadIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#DDF3E3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadTitle: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  uploadSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  uploadButton: {
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  uploadButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '700',
  },
  geoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  geoTitle: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  geoSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    maxWidth: 220,
  },
  geoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E4F6EB',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  geoBadgeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  metadataRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metadataCard: {
    flex: 1,
    backgroundColor: '#E8F4E9',
    borderRadius: 14,
    padding: 10,
  },
  metadataLabel: {
    color: '#75917B',
    fontSize: 11,
    marginBottom: 4,
  },
  metadataValue: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '800',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E0D4',
  },
  historyIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF5DF',
    marginRight: 12,
  },
  historyCopy: {
    flex: 1,
  },
  historyTitle: {
    color: colors.textDark,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  historyMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  historyBadge: {
    borderRadius: 999,
    backgroundColor: '#E4F6EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyBadgeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
});
