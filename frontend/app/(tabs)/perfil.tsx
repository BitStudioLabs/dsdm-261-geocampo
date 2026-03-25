import React from 'react';
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

import { colors } from '../../src/theme/colors';

const RESUMO = [
  { id: '1', label: 'Visitas no mes', value: '24', icon: 'clipboard-outline', color: '#DF8E56' },
  { id: '2', label: 'Atribuidas', value: '12', icon: 'business-outline', color: colors.info },
  { id: '3', label: 'Concluidas', value: '8', icon: 'checkmark-done-outline', color: colors.success },
] as const;

const PREFERENCIAS = [
  {
    id: '1',
    title: 'Regiao de atuacao',
    subtitle: 'Regiao Sul - Ribeirao Preto e entorno',
    icon: 'navigate-circle-outline',
  },
  {
    id: '2',
    title: 'Notificacoes',
    subtitle: 'Alertas de visitas e resultado das analises',
    icon: 'notifications-outline',
  },
  {
    id: '3',
    title: 'Sincronizacao offline',
    subtitle: 'Ultima sincronizacao hoje as 09:54',
    icon: 'cloud-done-outline',
  },
  {
    id: '4',
    title: 'Seguranca da conta',
    subtitle: 'Senha atualizada ha 18 dias',
    icon: 'shield-checkmark-outline',
  },
] as const;

export default function PerfilScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
          <TouchableOpacity style={styles.editButton} activeOpacity={0.9}>
            <Ionicons name="create-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={38} color={colors.textLight} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.name}>Joao Silva</Text>
              <Text style={styles.role}>Instrutor de Campo</Text>
              <Text style={styles.region}>Instituto Rural do Sudeste</Text>
            </View>
          </View>

          <View style={styles.badgesRow}>
            <View style={styles.badge}>
              <Ionicons name="checkmark-circle" size={15} color={colors.success} />
              <Text style={styles.badgeText}>Ativo</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="location-outline" size={15} color={colors.primaryLight} />
              <Text style={styles.badgeText}>Regiao Sul</Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>E-mail</Text>
              <Text style={styles.contactValue}>joao.silva@campoapp.com</Text>
            </View>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>Telefone</Text>
              <Text style={styles.contactValue}>(16) 99999-1234</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          {RESUMO.map((item) => (
            <View key={item.id} style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: `${item.color}1A` }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.summaryValue}>{item.value}</Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DADOS PROFISSIONAIS</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Matricula</Text>
            <Text style={styles.infoValue}>INS-0248</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cargo</Text>
            <Text style={styles.infoValue}>Instrutor Regional</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Inicio na instituicao</Text>
            <Text style={styles.infoValue}>Marco de 2023</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Supervisor</Text>
            <Text style={styles.infoValue}>Ana Costa</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCIAS E OPERACAO</Text>

          {PREFERENCIAS.map((item) => (
            <TouchableOpacity key={item.id} activeOpacity={0.9} style={styles.preferenceRow}>
              <View style={styles.preferenceIcon}>
                <Ionicons name={item.icon} size={18} color={colors.primaryDark} />
              </View>
              <View style={styles.preferenceCopy}>
                <Text style={styles.preferenceTitle}>{item.title}</Text>
                <Text style={styles.preferenceSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#96A099" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.92} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.textDark,
    fontSize: 29,
    fontWeight: '800',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E1F0E4',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editButtonText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: '#A56B3F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroCopy: {
    flex: 1,
  },
  name: {
    color: colors.textLight,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 2,
  },
  role: {
    color: '#B9D2C6',
    fontSize: 14,
    marginBottom: 2,
  },
  region: {
    color: '#D7E8DF',
    fontSize: 13,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgeText: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '700',
  },
  contactRow: {
    gap: 10,
  },
  contactItem: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 12,
  },
  contactLabel: {
    color: '#B6CEC2',
    fontSize: 11,
    marginBottom: 4,
  },
  contactValue: {
    color: colors.textLight,
    fontSize: 15,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#0B1E17',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryValue: {
    color: colors.textDark,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 2,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E0D4',
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  infoValue: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: '700',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E0D4',
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#EAF5DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  preferenceCopy: {
    flex: 1,
  },
  preferenceTitle: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  preferenceSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF0F0',
    borderRadius: 18,
    paddingVertical: 15,
    marginTop: 4,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
});
