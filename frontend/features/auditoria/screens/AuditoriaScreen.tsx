import { FontAwesome6 } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchAuditDashboardData, fetchInstructorAuditCases } from '@/features/auditoria/api';
import { AUDIT_RULES, AUDITORIA_THEME as THEME } from '@/features/auditoria/constants';
import { formatDistance, getInstructorRiskColor, getRiskLabel, getSeverityColor } from '@/features/auditoria/helpers';
import { styles } from '@/features/auditoria/styles';
import type { AuditCase, AuditSummary, InstructorRisk } from '@/features/auditoria/types';

export default function AuditoriaScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 780;
  const [auditCases, setAuditCases] = useState<AuditCase[]>([]);
  const [instructorRisks, setInstructorRisks] = useState<InstructorRisk[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorRisk | null>(null);
  const [selectedInstructorCases, setSelectedInstructorCases] = useState<AuditCase[]>([]);
  const [selectedAuditCase, setSelectedAuditCase] = useState<AuditCase | null>(null);
  const [auditSummary, setAuditSummary] = useState<AuditSummary>({ highRisk: 0, mediumRisk: 0, clean: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInstructorCases, setIsLoadingInstructorCases] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [instructorErrorMessage, setInstructorErrorMessage] = useState('');

  const loadAuditData = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      setErrorMessage('');

      const data = await fetchAuditDashboardData();

      setAuditCases(data.auditCases);
      setInstructorRisks(data.instructorRisks);
      setAuditSummary(data.auditSummary);
    } catch (error) {
      console.error('Erro ao carregar auditoria antifraude:', error);
      setAuditCases([]);
      setInstructorRisks([]);
      setAuditSummary({ highRisk: 0, mediumRisk: 0, clean: 0 });
      setErrorMessage('Não foi possível carregar os dados de auditoria.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const openInstructorCases = useCallback(async (instructor: InstructorRisk) => {
    setSelectedInstructor(instructor);
    setSelectedAuditCase(null);
    setSelectedInstructorCases([]);
    setInstructorErrorMessage('');
    setIsLoadingInstructorCases(true);

    try {
      const mappedCases = await fetchInstructorAuditCases(instructor.id);
      setSelectedInstructorCases(mappedCases);
    } catch (error) {
      console.error('Erro ao carregar visitas suspeitas do instrutor:', error);
      setInstructorErrorMessage('Não foi possível carregar as visitas suspeitas deste instrutor.');
    } finally {
      setIsLoadingInstructorCases(false);
    }
  }, []);

  const closeInstructorCases = useCallback(() => {
    setSelectedInstructor(null);
    setSelectedInstructorCases([]);
    setSelectedAuditCase(null);
    setInstructorErrorMessage('');
  }, []);

  const closeVisitDetails = useCallback(() => {
    setSelectedAuditCase(null);
  }, []);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  const summary = useMemo(() => {
    const averageDistance =
      auditCases.length > 0
        ? Math.round(auditCases.reduce((total, item) => total + item.photoDistanceMeters, 0) / auditCases.length)
        : 0;

    return [
      { id: 'high', label: 'Alto risco', value: String(auditSummary.highRisk), icon: 'triangle-exclamation' as const, color: THEME.error },
      { id: 'medium', label: 'Suspeitas', value: String(auditSummary.mediumRisk), icon: 'circle-info' as const, color: THEME.gold },
      { id: 'clean', label: 'Válidas', value: String(auditSummary.clean), icon: 'circle-check' as const, color: THEME.leafLight },
      { id: 'distance', label: 'Distância média', value: formatDistance(averageDistance), icon: 'location-dot' as const, color: THEME.blue },
    ];
  }, [auditCases, auditSummary.clean, auditSummary.highRisk, auditSummary.mediumRisk]);

  const onRefresh = useCallback(() => {
    loadAuditData(true);
  }, [loadAuditData]);

  const hasEmptyState = !isLoading && !errorMessage && auditCases.length === 0;
  const visibleAuditCases = selectedInstructor ? selectedInstructorCases : auditCases;

  return (
    <View style={styles.root}>
      <View style={styles.skyGlow} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 34, paddingBottom: insets.bottom + 112 }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={THEME.leafLight} />}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Auditoria antifraude</Text>
            <Text style={styles.title}>Autenticidade da geolocalização</Text>
            <Text style={styles.subtitle}>
              Dados da `vw_alertas_fraude` e da `analises_antifraude`, avaliando distância, IP/região, deslocamento e VPN.
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <FontAwesome6 name="fingerprint" size={24} color={THEME.leafLight} />
          </View>
        </View>

        <View style={[styles.summaryGrid, isWideLayout && styles.summaryGridWide]}>
          {summary.map((item) => (
            <View key={item.id} style={[styles.summaryCard, isWideLayout && styles.summaryCardWide]}>
              <View style={[styles.summaryIcon, { backgroundColor: `${item.color}20` }]}>
                <FontAwesome6 name={item.icon} size={15} color={item.color} />
              </View>
              <Text style={styles.summaryValue}>{isLoading ? '--' : item.value}</Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Instrutores sob atenção</Text>
          <Text style={styles.sectionMeta}>{isLoading ? 'Carregando' : `${instructorRisks.length} técnicos`}</Text>
        </View>

        <View style={styles.instructorList}>
          {isLoading ? (
            <View style={styles.instructorSkeleton}>
              <ActivityIndicator color={THEME.leafLight} />
              <Text style={styles.stateText}>Calculando ranking de instrutores...</Text>
            </View>
          ) : null}

          {!isLoading && instructorRisks.length === 0 ? (
            <View style={styles.instructorSkeleton}>
              <View style={[styles.stateIcon, { backgroundColor: `${THEME.leafLight}20` }]}>
                <FontAwesome6 name="user-check" size={15} color={THEME.leafLight} />
              </View>
              <Text style={styles.stateText}>Nenhum instrutor com visitas analisadas pela `vw_score_instrutores`.</Text>
            </View>
          ) : null}

          {instructorRisks.map((instructor, index) => {
            const riskColor = getInstructorRiskColor(instructor);
            const suspiciousTotal = instructor.suspiciousVisits + instructor.highRiskVisits;

            return (
              <TouchableOpacity key={instructor.id} style={styles.instructorCard} activeOpacity={0.9} onPress={() => openInstructorCases(instructor)}>
                <View style={styles.instructorTop}>
                  <View style={[styles.instructorRank, { backgroundColor: `${riskColor}20`, borderColor: `${riskColor}55` }]}>
                    <Text style={[styles.instructorRankText, { color: riskColor }]}>{index + 1}</Text>
                  </View>
                  <View style={styles.instructorCopy}>
                    <Text style={styles.instructorName}>{instructor.name}</Text>
                    <Text style={styles.instructorMeta}>{instructor.regional}</Text>
                  </View>
                  <View style={styles.instructorScoreBox}>
                    <Text style={[styles.instructorScore, { color: riskColor }]}>{instructor.averageScore || '--'}</Text>
                    <Text style={styles.instructorScoreLabel}>score médio</Text>
                  </View>
                </View>

                <View style={styles.instructorStats}>
                  <View style={styles.instructorStat}>
                    <Text style={styles.instructorStatValue}>{instructor.totalVisits}</Text>
                    <Text style={styles.instructorStatLabel}>visitas</Text>
                  </View>
                  <View style={styles.instructorStat}>
                    <Text style={styles.instructorStatValue}>{instructor.analyzedVisits}</Text>
                    <Text style={styles.instructorStatLabel}>analisadas</Text>
                  </View>
                  <View style={styles.instructorStat}>
                    <Text style={[styles.instructorStatValue, { color: suspiciousTotal > 0 ? THEME.gold : THEME.leafLight }]}>
                      {suspiciousTotal}
                    </Text>
                    <Text style={styles.instructorStatLabel}>suspeitas</Text>
                  </View>
                  <View style={styles.instructorStat}>
                    <Text style={[styles.instructorStatValue, { color: instructor.highRiskVisits > 0 ? THEME.error : THEME.leafLight }]}>
                      {instructor.highRiskVisits}
                    </Text>
                    <Text style={styles.instructorStatLabel}>alto risco</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedInstructor ? (
          <View style={styles.drilldownCard}>
            <View style={styles.drilldownHeader}>
              <View style={styles.drilldownTitleBox}>
                <Text style={styles.drilldownEyebrow}>Visitas suspeitas do instrutor</Text>
                <Text style={styles.drilldownTitle}>{selectedInstructor.name}</Text>
                <Text style={styles.drilldownSubtitle}>{selectedInstructor.regional}</Text>
              </View>
              <TouchableOpacity style={styles.iconButton} activeOpacity={0.85} onPress={closeInstructorCases}>
                <FontAwesome6 name="xmark" size={15} color={THEME.offWhite} />
              </TouchableOpacity>
            </View>

            {isLoadingInstructorCases ? (
              <View style={styles.inlineState}>
                <ActivityIndicator color={THEME.leafLight} />
                <Text style={styles.stateText}>Carregando visitas suspeitas...</Text>
              </View>
            ) : null}

            {instructorErrorMessage ? (
              <TouchableOpacity style={styles.inlineState} activeOpacity={0.9} onPress={() => openInstructorCases(selectedInstructor)}>
                <FontAwesome6 name="rotate-right" size={15} color={THEME.error} />
                <Text style={styles.stateText}>{instructorErrorMessage}</Text>
              </TouchableOpacity>
            ) : null}

            {!isLoadingInstructorCases && !instructorErrorMessage && selectedInstructorCases.length === 0 ? (
              <View style={styles.inlineState}>
                <FontAwesome6 name="circle-check" size={15} color={THEME.leafLight} />
                <Text style={styles.stateText}>Nenhuma visita suspeita retornada para este instrutor.</Text>
              </View>
            ) : null}

            {!isLoadingInstructorCases && selectedInstructorCases.length > 0 ? (
              <View style={styles.visitList}>
                {selectedInstructorCases.map((visit) => {
                  const riskColor = visit.classification === 'alto_risco_vpn' ? THEME.error : THEME.gold;

                  return (
                    <TouchableOpacity key={visit.id} style={styles.visitListItem} activeOpacity={0.88} onPress={() => setSelectedAuditCase(visit)}>
                      <View style={[styles.visitIcon, { backgroundColor: `${riskColor}20` }]}>
                        <FontAwesome6 name="clipboard-list" size={14} color={riskColor} />
                      </View>
                      <View style={styles.visitCopy}>
                        <Text style={styles.visitProperty}>{visit.property}</Text>
                        <Text style={styles.visitMeta}>
                          {visit.trackingCode} • {visit.visitDate}
                        </Text>
                      </View>
                      <View style={[styles.visitScoreBadge, { borderColor: `${riskColor}55` }]}>
                        <Text style={[styles.visitScoreText, { color: riskColor }]}>{visit.riskScore}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {selectedAuditCase ? (
          <View style={styles.detailCard}>
            <View style={styles.drilldownHeader}>
              <View style={styles.drilldownTitleBox}>
                <Text style={styles.drilldownEyebrow}>Dados da visita</Text>
                <Text style={styles.drilldownTitle}>{selectedAuditCase.property}</Text>
                <Text style={styles.drilldownSubtitle}>{selectedAuditCase.trackingCode}</Text>
              </View>
              <TouchableOpacity style={styles.iconButton} activeOpacity={0.85} onPress={closeVisitDetails}>
                <FontAwesome6 name="xmark" size={15} color={THEME.offWhite} />
              </TouchableOpacity>
            </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.evidenceLabel}>Instrutor</Text>
                  <Text style={styles.evidenceValue}>{selectedAuditCase.technician}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.evidenceLabel}>Produtor</Text>
                  <Text style={styles.evidenceValue}>{selectedAuditCase.producer}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.evidenceLabel}>Projeto</Text>
                  <Text style={styles.evidenceValue}>{selectedAuditCase.project}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.evidenceLabel}>Tipo</Text>
                  <Text style={styles.evidenceValue}>{selectedAuditCase.type}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.evidenceLabel}>Data da visita</Text>
                  <Text style={styles.evidenceValue}>{selectedAuditCase.visitDate}</Text>
                </View>
              <View style={styles.detailItem}>
                <Text style={styles.evidenceLabel}>Analisado em</Text>
                <Text style={styles.evidenceValue}>{selectedAuditCase.analyzedAt}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.evidenceLabel}>Status</Text>
                <Text style={styles.evidenceValue}>{selectedAuditCase.status}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.evidenceLabel}>Score</Text>
                <Text style={styles.evidenceValue}>{selectedAuditCase.riskScore}/100 • {getRiskLabel(selectedAuditCase.riskScore)}</Text>
              </View>
            </View>

            <View style={styles.pythonAuditBlock}>
              <View style={styles.pythonAuditHeader}>
                <FontAwesome6 name="route" size={14} color={THEME.leafLight} />
                <Text style={styles.pythonAuditTitle}>Conferência operacional da visita</Text>
              </View>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.evidenceLabel}>Horário check-in</Text>
                  <Text style={styles.evidenceValue}>{selectedAuditCase.checkinAt}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.evidenceLabel}>Horário check-out</Text>
                  <Text style={styles.evidenceValue}>{selectedAuditCase.checkoutAt}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.evidenceLabel}>Tempo da visita</Text>
                  <Text style={styles.evidenceValue}>
                    {selectedAuditCase.durationMinutes == null ? 'Não informado' : `${selectedAuditCase.durationMinutes} min`}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.evidenceLabel}>Check-in x check-out</Text>
                  <Text style={styles.evidenceValue}>
                    {selectedAuditCase.checkinCheckoutMeters == null ? 'Sem coordenadas' : formatDistance(selectedAuditCase.checkinCheckoutMeters)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.evidenceLabel}>Check-in x sede</Text>
                  <Text style={styles.evidenceValue}>
                    {selectedAuditCase.checkinPropertyMeters == null ? 'Sem coordenadas' : formatDistance(selectedAuditCase.checkinPropertyMeters)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.evidenceLabel}>Coordenada check-in</Text>
                  <Text style={styles.evidenceValue}>{selectedAuditCase.checkinCoordinate}</Text>
                </View>
              </View>
            </View>

            <View style={styles.evidenceRow}>
              <View style={styles.evidenceItem}>
                <Text style={styles.evidenceLabel}>Foto x propriedade</Text>
                <Text style={styles.evidenceValue}>{formatDistance(selectedAuditCase.photoDistanceMeters)}</Text>
              </View>
              <View style={styles.evidenceItem}>
                <Text style={styles.evidenceLabel}>IP / propriedade</Text>
                <Text style={styles.evidenceValue}>
                  {selectedAuditCase.ipRegion} / {selectedAuditCase.propertyRegion}
                </Text>
              </View>
            </View>

            <View style={styles.evidenceRow}>
              <View style={styles.evidenceItem}>
                <Text style={styles.evidenceLabel}>Deslocamento</Text>
                <Text style={styles.evidenceValue}>{selectedAuditCase.displacement}</Text>
              </View>
              <View style={styles.evidenceItem}>
                <Text style={styles.evidenceLabel}>VPN</Text>
                <Text style={styles.evidenceValue}>{selectedAuditCase.vpnSignal}</Text>
              </View>
            </View>

            <View style={styles.indicatorGrid}>
              {selectedAuditCase.indicators.map((indicator) => {
                const indicatorColor = getSeverityColor(indicator.severity);

                return (
                  <View key={indicator.id} style={styles.indicatorCard}>
                    <View style={styles.indicatorTop}>
                      <View style={[styles.indicatorIcon, { backgroundColor: `${indicatorColor}1f` }]}>
                        <FontAwesome6 name={indicator.icon} size={13} color={indicatorColor} />
                      </View>
                      <Text style={[styles.indicatorValue, { color: indicatorColor }]}>{indicator.value}</Text>
                    </View>
                    <Text style={styles.indicatorLabel}>{indicator.label}</Text>
                    <Text style={styles.indicatorDetail}>{indicator.detail}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{selectedInstructor ? 'Alertas filtrados' : 'Alertas de fraude'}</Text>
          <Text style={styles.sectionMeta}>{isLoading ? 'Carregando' : `${visibleAuditCases.length} registros`}</Text>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={THEME.leafLight} size="large" />
            <Text style={styles.stateTitle}>Carregando auditoria</Text>
            <Text style={styles.stateText}>Consultando alertas, scores individuais e evidências antifraude.</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <TouchableOpacity style={styles.stateCard} activeOpacity={0.9} onPress={() => loadAuditData()}>
            <View style={[styles.stateIcon, { backgroundColor: `${THEME.error}20` }]}>
              <FontAwesome6 name="rotate-right" size={16} color={THEME.error} />
            </View>
            <Text style={styles.stateTitle}>{errorMessage}</Text>
            <Text style={styles.stateText}>Toque para tentar novamente.</Text>
          </TouchableOpacity>
        ) : null}

        {hasEmptyState ? (
          <View style={styles.stateCard}>
            <View style={[styles.stateIcon, { backgroundColor: `${THEME.leafLight}20` }]}>
              <FontAwesome6 name="shield-heart" size={16} color={THEME.leafLight} />
            </View>
            <Text style={styles.stateTitle}>Nenhum alerta pendente</Text>
            <Text style={styles.stateText}>A view `vw_alertas_fraude` não retornou visitas suspeitas ou de alto risco.</Text>
          </View>
        ) : null}

        {visibleAuditCases.map((auditCase) => {
          const riskColor = auditCase.classification === 'alto_risco_vpn' ? THEME.error : auditCase.classification === 'suspeita' ? THEME.gold : THEME.leafLight;

          return (
            <TouchableOpacity key={auditCase.id} style={styles.auditCard} activeOpacity={0.92} onPress={() => setSelectedAuditCase(auditCase)}>
              <View style={styles.auditHeader}>
                <View style={styles.auditTitleBox}>
                  <Text style={styles.propertyName}>{auditCase.property}</Text>
                  <Text style={styles.auditMeta}>
                    {auditCase.technician} • {auditCase.visitDate}
                  </Text>
                  <Text style={styles.trackingCode}>{auditCase.trackingCode}</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: `${riskColor}1f`, borderColor: `${riskColor}55` }]}>
                  <Text style={[styles.riskScore, { color: riskColor }]}>{auditCase.riskScore}</Text>
                  <Text style={[styles.riskLabel, { color: riskColor }]}>{getRiskLabel(auditCase.riskScore)}</Text>
                </View>
              </View>

              <View style={styles.evidenceRow}>
                <View style={styles.evidenceItem}>
                  <Text style={styles.evidenceLabel}>Foto x propriedade</Text>
                  <Text style={styles.evidenceValue}>{formatDistance(auditCase.photoDistanceMeters)}</Text>
                </View>
                <View style={styles.evidenceItem}>
                  <Text style={styles.evidenceLabel}>IP / propriedade</Text>
                  <Text style={styles.evidenceValue}>
                    {auditCase.ipRegion} / {auditCase.propertyRegion}
                  </Text>
                </View>
              </View>

              <View style={styles.evidenceRow}>
                <View style={styles.evidenceItem}>
                  <Text style={styles.evidenceLabel}>Deslocamento</Text>
                  <Text style={styles.evidenceValue}>{auditCase.displacement}</Text>
                </View>
                <View style={styles.evidenceItem}>
                  <Text style={styles.evidenceLabel}>VPN</Text>
                  <Text style={styles.evidenceValue}>{auditCase.vpnSignal}</Text>
                </View>
              </View>

              <View style={styles.indicatorGrid}>
                {auditCase.indicators.map((indicator) => {
                  const indicatorColor = getSeverityColor(indicator.severity);

                  return (
                    <View key={indicator.id} style={styles.indicatorCard}>
                      <View style={styles.indicatorTop}>
                        <View style={[styles.indicatorIcon, { backgroundColor: `${indicatorColor}1f` }]}>
                          <FontAwesome6 name={indicator.icon} size={13} color={indicatorColor} />
                        </View>
                        <Text style={[styles.indicatorValue, { color: indicatorColor }]}>{indicator.value}</Text>
                      </View>
                      <Text style={styles.indicatorLabel}>{indicator.label}</Text>
                      <Text style={styles.indicatorDetail}>{indicator.detail}</Text>
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.rulesCard}>
          <View style={styles.rulesHeader}>
            <View style={styles.rulesIcon}>
              <FontAwesome6 name="list-check" size={15} color={THEME.blue} />
            </View>
            <View style={styles.rulesCopy}>
              <Text style={styles.rulesTitle}>Critérios de autenticidade</Text>
              <Text style={styles.rulesSubtitle}>Base para classificação automática das evidências.</Text>
            </View>
          </View>
          {AUDIT_RULES.map((rule) => (
            <View key={rule} style={styles.ruleRow}>
              <FontAwesome6 name="check" size={11} color={THEME.leafLight} />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
