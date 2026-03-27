import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/src/lib/supabase';

const THEME = {
  skyTop: '#0a1f0d',
  white: '#ffffff',
  offWhite: '#f0f8f0',
  textMuted: 'rgba(255,255,255,0.55)',
  cardBg: 'rgba(10,31,13,0.85)',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.1)',
  leafLight: '#4dc85a',
  gold: '#f5c842',
  error: '#ff6b6b',
};

export default function CadastroPropriedadeScreen() {
  const [form, setForm] = useState({
    nome: '',
    imovel: '',
    municipioNome: '',
    uf: 'TO',
    telefone: '',
    latitude: '',
    longitude: '',
    referencia: '',
    comoChegar: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) {
      setFeedback({ type: 'error', message: 'Informe o nome da propriedade.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const { error } = await supabase.from('propriedades').insert({
      nome: form.nome.trim(),
      imovel: form.imovel.trim() || null,
      municipio_nome: form.municipioNome.trim() || null,
      uf: form.uf.trim().toUpperCase() || 'TO',
      telefone: form.telefone.trim() || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      referencia: form.referencia.trim() || null,
      como_chegar: form.comoChegar.trim() || null,
      atualizado_em: new Date().toISOString(),
    });

    setIsSubmitting(false);

    if (error) {
      console.error('Erro ao cadastrar propriedade:', error);
      setFeedback({ type: 'error', message: 'Não foi possivel cadastrar a propriedade.' });
      return;
    }

    setForm({
      nome: '',
      imovel: '',
      municipioNome: '',
      uf: 'TO',
      telefone: '',
      latitude: '',
      longitude: '',
      referencia: '',
      comoChegar: '',
    });
    setFeedback({ type: 'success', message: 'Propriedade cadastrada com sucesso.' });
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
              <FontAwesome6 name="arrow-left" size={14} color={THEME.white} />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Nova Propriedade</Text>
              <Text style={styles.subtitle}>Cadastre uma nova propriedade rural na base operacional.</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Nome da propriedade</Text>
            <TextInput style={styles.input} value={form.nome} onChangeText={(value) => handleChange('nome', value)} placeholder="Fazenda Santa Clara" placeholderTextColor={THEME.textMuted} />

            <Text style={styles.label}>Nome do imóvel</Text>
            <TextInput style={styles.input} value={form.imovel} onChangeText={(value) => handleChange('imovel', value)} placeholder="Nome no cartorio" placeholderTextColor={THEME.textMuted} />

            <Text style={styles.label}>Município</Text>
            <TextInput style={styles.input} value={form.municipioNome} onChangeText={(value) => handleChange('municipioNome', value)} placeholder="Palmas" placeholderTextColor={THEME.textMuted} />

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>UF</Text>
                <TextInput style={styles.input} value={form.uf} onChangeText={(value) => handleChange('uf', value)} placeholder="TO" placeholderTextColor={THEME.textMuted} maxLength={2} autoCapitalize="characters" />
              </View>
              <View style={styles.colLarge}>
                <Text style={styles.label}>Telefone</Text>
                <TextInput style={styles.input} value={form.telefone} onChangeText={(value) => handleChange('telefone', value)} placeholder="(63) 99999-9999" placeholderTextColor={THEME.textMuted} keyboardType="phone-pad" />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.colLarge}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput style={styles.input} value={form.latitude} onChangeText={(value) => handleChange('latitude', value)} placeholder="-10.1840" placeholderTextColor={THEME.textMuted} keyboardType="numeric" />
              </View>
              <View style={styles.colLarge}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput style={styles.input} value={form.longitude} onChangeText={(value) => handleChange('longitude', value)} placeholder="-48.3336" placeholderTextColor={THEME.textMuted} keyboardType="numeric" />
              </View>
            </View>

            <Text style={styles.label}>Referência</Text>
            <TextInput style={[styles.input, styles.textArea]} value={form.referencia} onChangeText={(value) => handleChange('referencia', value)} placeholder="Ponto de referência do local" placeholderTextColor={THEME.textMuted} multiline textAlignVertical="top" />

            <Text style={styles.label}>Como chegar</Text>
            <TextInput style={[styles.input, styles.textArea]} value={form.comoChegar} onChangeText={(value) => handleChange('comoChegar', value)} placeholder="Instruções de acesso" placeholderTextColor={THEME.textMuted} multiline textAlignVertical="top" />

            {feedback ? (
              <View style={[styles.feedbackBox, feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
                <Text style={styles.feedbackText}>{feedback.message}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.9} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color={THEME.white} />
              ) : (
                <>
                  <FontAwesome6 name="house-chimney" size={14} color={THEME.white} />
                  <Text style={styles.submitText}>Cadastrar propriedade</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: THEME.skyTop },
  content: { padding: 20, paddingTop: 56, paddingBottom: 80 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { color: THEME.white, fontSize: 28, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: THEME.textMuted, fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: THEME.cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(77,200,90,0.15)' },
  row: { flexDirection: 'row', gap: 10 },
  col: { width: 84 },
  colLarge: { flex: 1 },
  label: { color: THEME.offWhite, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: THEME.inputBg, borderWidth: 1, borderColor: THEME.inputBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: THEME.white, fontSize: 14 },
  textArea: { minHeight: 92 },
  feedbackBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 16, borderWidth: 1 },
  feedbackSuccess: { backgroundColor: 'rgba(77,200,90,0.15)', borderColor: 'rgba(77,200,90,0.35)' },
  feedbackError: { backgroundColor: 'rgba(255,107,107,0.15)', borderColor: 'rgba(255,107,107,0.35)' },
  feedbackText: { color: THEME.white, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  submitButton: { marginTop: 18, backgroundColor: THEME.leafLight, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitText: { color: THEME.white, fontSize: 15, fontWeight: '800' },
});
