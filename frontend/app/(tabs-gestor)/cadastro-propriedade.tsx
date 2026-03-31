
import { FontAwesome6 } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { supabase } from '@/src/lib/supabase';

// ─── Tema ────────────────────────────────────────────────────────────────────
const T = {
  bg:        '#0a1f0d',
  card:      'rgba(10,31,13,0.88)',
  border:    'rgba(77,200,90,0.14)',
  borderFoc: 'rgba(77,200,90,0.55)',
  inputBg:   'rgba(255,255,255,0.055)',
  inputBdr:  'rgba(255,255,255,0.10)',
  white:     '#ffffff',
  muted:     'rgba(255,255,255,0.48)',
  hint:      'rgba(255,255,255,0.30)',
  green:     '#4dc85a',
  greenDim:  '#2d8c3e',
  gold:      '#f5c842',
  goldDim:   '#b8920e',
  blue:      '#5b9cff',
  red:       '#ff6b6b',
  redBg:     'rgba(255,107,107,0.12)',
  redBdr:    'rgba(255,107,107,0.30)',
  okBg:      'rgba(77,200,90,0.12)',
  okBdr:     'rgba(77,200,90,0.30)',
};

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Regiao   { id: number; nome: string; uf: string }
interface Municipio{ id: number; nome: string; uf: string }
interface ProprietarioOption { id: string; nome_completo: string; email: string; telefone: string | null }

type StatusProp = 'ativo' | 'inativo' | 'em_analise';
type StatusArr  = 'nao_arrendada' | 'arrendada' | 'parcialmente_arrendada';

interface PropForm {
  nome: string; imovel: string; car: string; inscricaoIncra: string; dap: string;
  municipio: Municipio | null; regiao: Regiao | null; uf: string;
  bairro: string; logradouro: string; numero: string;
  complemento: string; cep: string; referencia: string; comoChegar: string;
  latitude: string; longitude: string;
  areaTotal: string; areaAtividades: string; areaPecuaria: string;
  areaPreservacao: string; areaReserva: string; areaVegetacao: string;
  areaAcudes: string; areaBenfeitorias: string; areaEstradas: string;
  areaGraos: string; areaNaoAgricola: string; valorTerraNua: string;
  statusProp: StatusProp; statusArr: StatusArr; telefone: string;
}

interface OwnerForm {
  nome: string; email: string; telefone: string; cpfCnpj: string; senha: string;
}

interface LoadedPropertyRow {
  id: number;
  nome: string | null;
  imovel: string | null;
  car: string | null;
  inscricao_incra: string | null;
  dap: string | null;
  id_municipio: number | null;
  municipio_nome: string | null;
  uf: string | null;
  id_regional: number | null;
  bairro: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  referencia: string | null;
  como_chegar: string | null;
  latitude: number | null;
  longitude: number | null;
  area_total: number | null;
  area_atividades_prod: number | null;
  area_pecuaria: number | null;
  area_preservacao_perm: number | null;
  area_reserva_legal: number | null;
  area_vegetacao_nativa: number | null;
  area_acudes_represas: number | null;
  area_benfeitorias: number | null;
  area_estradas: number | null;
  area_graos_cereais: number | null;
  area_nao_agricola: number | null;
  valor_terra_nua: number | null;
  status_propriedade: StatusProp;
  status_arrendamento: StatusArr;
  telefone: string | null;
  id_produtor: number | null;
  produtores:
    | {
        nome: string | null;
        telefone: string | null;
        email: string | null;
        cpf_cnpj: string | null;
        usuario_id: string | null;
      }
    | null;
}

const PROP0: PropForm = {
  nome: '', imovel: '', car: '', inscricaoIncra: '', dap: '',
  municipio: null, regiao: null, uf: 'TO',
  bairro: '', logradouro: '', numero: '', complemento: '',
  cep: '', referencia: '', comoChegar: '',
  latitude: '', longitude: '',
  areaTotal: '', areaAtividades: '', areaPecuaria: '',
  areaPreservacao: '', areaReserva: '', areaVegetacao: '',
  areaAcudes: '', areaBenfeitorias: '', areaEstradas: '',
  areaGraos: '', areaNaoAgricola: '', valorTerraNua: '',
  statusProp: 'ativo', statusArr: 'nao_arrendada', telefone: '',
};

const OWNER0: OwnerForm = { nome: '', email: '', telefone: '', cpfCnpj: '', senha: '' };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseNum(v: string) {
  const s = v.replace(',', '.').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function formatOptionalNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '';
  return String(value).replace('.', ',');
}

function formatCoordinateValue(value: number | null | undefined, type: 'lat' | 'lon') {
  if (value == null || Number.isNaN(value)) return '';
  return formatCoordinateInput(String(value).replace('.', ','), type);
}

function formatCoordinateInput(value: string, type: 'lat' | 'lon') {
  const normalized = value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', ',');
  if (!normalized) return '';
  const negative = normalized.startsWith('-') || normalized.replace(/\D/g, '').length > 0;
  const digits = normalized.replace(/\D/g, '');

  if (!digits) return negative ? '-' : '';

  let integerLength = type === 'lat' ? 2 : 3;
  if (type === 'lat' && Number(digits.slice(0, 2)) > 90) integerLength = 1;
  if (type === 'lon' && Number(digits.slice(0, 3)) > 180) integerLength = 2;

  const boundedIntegerLength = Math.min(integerLength, Math.max(digits.length - 1, 1));
  const integer = digits.slice(0, boundedIntegerLength);
  const decimal = digits.slice(boundedIntegerLength, boundedIntegerLength + 8);

  return `${negative ? '-' : ''}${integer}${decimal ? `,${decimal}` : ''}`;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// ─── Componente: campo de texto ───────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder,
  keyboard = 'default', secure = false, multiline = false, error, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboard?: any; secure?: boolean;
  multiline?: boolean; error?: string; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fs.fieldWrap}>
      <Text style={fs.label}>{label}</Text>
      {hint ? <Text style={fs.hint}>{hint}</Text> : null}
      <View style={[fs.inputBox, focused && fs.inputFocused, !!error && fs.inputError]}>
        <TextInput
          style={[fs.input, multiline && fs.inputMulti]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={T.hint}
          keyboardType={keyboard}
          secureTextEntry={secure}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          autoCapitalize={keyboard === 'email-address' ? 'none' : 'sentences'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {error ? <Text style={fs.errorMsg}>{error}</Text> : null}
    </View>
  );
}

const fs = StyleSheet.create({
  fieldWrap:   { marginBottom: 2 },
  label:       { color: T.white, fontSize: 12, fontWeight: '700', letterSpacing: 0.4, marginBottom: 5, marginTop: 10, textTransform: 'uppercase' },
  hint:        { color: T.muted, fontSize: 11, marginBottom: 4, lineHeight: 15 },
  inputBox:    { backgroundColor: T.inputBg, borderWidth: 1.5, borderColor: T.inputBdr, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11 },
  inputFocused:{ borderColor: T.borderFoc },
  inputError:  { borderColor: T.red },
  input:       { color: T.white, fontSize: 14, padding: 0, margin: 0 },
  inputMulti:  { minHeight: 80 },
  errorMsg:    { color: T.red, fontSize: 11, marginTop: 4 },
});

// ─── Componente: chips de opção ───────────────────────────────────────────────
function ChipGroup<T extends string>({
  label, options, value, onChange,
}: { label: string; options: {value: T; label: string}[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={fs.label}>{label}</Text>
      <View style={cs.row}>
        {options.map(o => {
          const sel = value === o.value;
          return (
            <TouchableOpacity key={o.value} style={[cs.chip, sel && cs.chipSel]} onPress={() => onChange(o.value)} activeOpacity={0.8}>
              <Text style={[cs.txt, sel && cs.txtSel]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  row:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip:   { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)' },
  chipSel:{ backgroundColor: 'rgba(77,200,90,0.16)', borderColor: 'rgba(77,200,90,0.45)' },
  txt:    { color: T.muted, fontSize: 12, fontWeight: '700' },
  txtSel: { color: T.white },
});

// ─── Componente: seção colapsável ─────────────────────────────────────────────
function Section({ icon, iconColor = T.gold, title, hint, children, collapsible = false }: {
  icon: string; iconColor?: string; title: string; hint?: string;
  children: React.ReactNode; collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  const anim = useRef(new Animated.Value(!collapsible ? 1 : 0)).current;

  const toggle = () => {
    const toVal = open ? 0 : 1;
    setOpen(!open);
    Animated.timing(anim, { toValue: toVal, duration: 220, useNativeDriver: false }).start();
  };

  return (
    <View style={ss.card}>
      <TouchableOpacity style={ss.header} onPress={collapsible ? toggle : undefined} activeOpacity={collapsible ? 0.7 : 1}>
        <View style={[ss.iconBox, { backgroundColor: `${iconColor}18` }]}>
          <FontAwesome6 name={icon} size={13} color={iconColor} />
        </View>
        <Text style={ss.title}>{title}</Text>
        {collapsible && (
          <FontAwesome6 name={open ? 'chevron-up' : 'chevron-down'} size={11} color={T.muted} style={{ marginLeft: 'auto' }} />
        )}
      </TouchableOpacity>
      {hint ? <Text style={ss.hint}>{hint}</Text> : null}
      {(!collapsible || open) && <View style={ss.body}>{children}</View>}
    </View>
  );
}

const ss = StyleSheet.create({
  card:   { backgroundColor: T.card, borderRadius: 20, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginBottom: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingBottom: 4 },
  iconBox:{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title:  { color: T.white, fontSize: 16, fontWeight: '800' },
  hint:   { color: T.muted, fontSize: 12, lineHeight: 17, marginHorizontal: 16, marginBottom: 2 },
  body:   { padding: 16, paddingTop: 4 },
});

// ─── Stepper ──────────────────────────────────────────────────────────────────
const STEPS = ['Propriedade', 'Localização', 'Proprietário'];

function Stepper({ current }: { current: number }) {
  return (
    <View style={stp.row}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={i} style={stp.item}>
            <View style={[stp.dot, done && stp.dotDone, active && stp.dotActive]}>
              {done
                ? <FontAwesome6 name="check" size={9} color={T.bg} />
                : <Text style={[stp.dotNum, active && stp.dotNumActive]}>{i + 1}</Text>
              }
            </View>
            <Text style={[stp.lbl, active && stp.lblActive]}>{label}</Text>
            {i < STEPS.length - 1 && (
              <View style={[stp.line, (done || active) && stp.lineDone]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const stp = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 0 },
  item:        { alignItems: 'center', position: 'relative', flexDirection: 'row', gap: 6 },
  dot:         { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: T.muted, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  dotActive:   { borderColor: T.green, backgroundColor: 'rgba(77,200,90,0.15)' },
  dotDone:     { borderColor: T.green, backgroundColor: T.green },
  dotNum:      { color: T.muted, fontSize: 11, fontWeight: '700' },
  dotNumActive:{ color: T.green },
  lbl:         { color: T.muted, fontSize: 11, fontWeight: '600' },
  lblActive:   { color: T.white },
  line:        { width: 28, height: 1.5, backgroundColor: T.inputBdr, marginHorizontal: 4 },
  lineDone:    { backgroundColor: T.green },
});

// ─── Busca de município com debounce ──────────────────────────────────────────
function MunicipioSearch({ value, onChange }: { value: Municipio | null; onChange: (m: Municipio | null) => void }) {
  const [query, setQuery] = useState(value?.nome ?? '');
  const [results, setResults] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('municipios')
      .select('id, nome, uf')
      .ilike('nome', `%${q}%`)
      .order('nome')
      .limit(8);
    setResults(data ?? []);
    setLoading(false);
  }, []);

  const handleText = (t: string) => {
    setQuery(t);
    if (value) onChange(null);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => search(t), 380);
  };

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  const pick = (m: Municipio) => {
    onChange(m);
    setQuery(`${m.nome} – ${m.uf}`);
    setResults([]);
  };

  return (
    <View style={mun.wrap}>
      <Text style={fs.label}>Município</Text>
      <View style={[fs.inputBox, !!value && { borderColor: T.borderFoc }]}>
        <View style={mun.row}>
          <FontAwesome6 name="magnifying-glass" size={12} color={T.muted} />
          <TextInput
            style={[fs.input, { flex: 1 }]}
            value={query}
            onChangeText={handleText}
            placeholder="Digite o nome do município..."
            placeholderTextColor={T.hint}
          />
          {loading && <ActivityIndicator size="small" color={T.green} />}
          {value && !loading && (
            <TouchableOpacity onPress={() => { onChange(null); setQuery(''); setResults([]); }}>
              <FontAwesome6 name="xmark" size={12} color={T.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {results.length > 0 && (
        <View style={mun.dropdown}>
          {results.map(m => (
            <TouchableOpacity key={m.id} style={mun.item} onPress={() => pick(m)} activeOpacity={0.8}>
              <FontAwesome6 name="location-dot" size={11} color={T.green} />
              <Text style={mun.itemText}>{m.nome}</Text>
              <Text style={mun.itemUF}>{m.uf}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const mun = StyleSheet.create({
  wrap:      { marginTop: 10 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dropdown:  { backgroundColor: '#0d2810', borderWidth: 1, borderColor: T.border, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  item:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  itemText:  { color: T.white, fontSize: 13, flex: 1 },
  itemUF:    { color: T.muted, fontSize: 11, fontWeight: '700' },
});

// ─── Select de Regional ───────────────────────────────────────────────────────
function RegiaoSelect({ value, onChange }: { value: Regiao | null; onChange: (r: Regiao | null) => void }) {
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.from('regioes').select('id, nome, uf').order('nome').then(({ data }) => setRegioes(data ?? []));
  }, []);

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={fs.label}>Regional</Text>
      <TouchableOpacity
        style={[fs.inputBox, open && fs.inputFocused]}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FontAwesome6 name="map" size={12} color={value ? T.green : T.muted} />
          <Text style={[fs.input, !value && { color: T.hint }, { flex: 1 }]}>
            {value ? `${value.nome} – ${value.uf}` : 'Selecione a regional...'}
          </Text>
          <FontAwesome6 name={open ? 'chevron-up' : 'chevron-down'} size={10} color={T.muted} />
        </View>
      </TouchableOpacity>
      {open && (
        <View style={mun.dropdown}>
          {regioes.map(r => (
            <TouchableOpacity key={r.id} style={mun.item} onPress={() => { onChange(r); setOpen(false); }} activeOpacity={0.8}>
              <FontAwesome6 name="building" size={11} color={T.blue} />
              <Text style={mun.itemText}>{r.nome}</Text>
              <Text style={mun.itemUF}>{r.uf}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function CadastroPropriedadeScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editingPropertyId = params.id ? Number(params.id) : null;
  const isEditMode = Number.isInteger(editingPropertyId) && editingPropertyId! > 0;
  const bottomTabBarHeight      = useBottomTabBarHeight();
  const insets                  = useSafeAreaInsets();
  const footerSpacing           = bottomTabBarHeight + insets.bottom + 56;
  const [step, setStep]         = useState(0);   // 0=dados, 1=localizacao, 2=proprietario
  const [pf, setPf]             = useState<PropForm>(PROP0);
  const [of, setOf]             = useState<OwnerForm>(OWNER0);
  const [locating, setLocating] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [errors, setErrors]     = useState<Partial<Record<string, string>>>({});
  const [ownerExists, setOwnerExists] = useState<boolean | null>(null);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerOptions, setOwnerOptions] = useState<ProprietarioOption[]>([]);
  const [ownerSearchLoading, setOwnerSearchLoading] = useState(false);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  const sp = (k: keyof PropForm, v: any) => setPf(c => ({ ...c, [k]: v }));
  const so = (k: keyof OwnerForm, v: string) => setOf(c => ({ ...c, [k]: v }));
  const clearErr = (k: string) => setErrors(c => { const n = { ...c }; delete n[k]; return n; });

  // Cria cliente auxiliar para signup sem sobrescrever a sessão atual
  const signupClient = useMemo(() => createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  ), []);

  // Verifica se o e-mail do proprietário já existe no banco
  const checkOwnerEmail = async (email: string) => {
    if (!isValidEmail(email)) { setOwnerExists(null); return; }
    const { data } = await supabase.from('usuarios').select('id, perfil').eq('email', email.trim().toLowerCase()).maybeSingle();
    setOwnerExists(!!data);
  };

  const handleOwnerEmail = (v: string) => {
    so('email', v);
    if (checkTimer.current) {
      clearTimeout(checkTimer.current);
    }
    checkTimer.current = setTimeout(() => checkOwnerEmail(v), 600);
  };

  const selectExistingOwner = (owner: ProprietarioOption) => {
    setOf({
      nome: owner.nome_completo ?? '',
      email: owner.email ?? '',
      telefone: owner.telefone ?? '',
      cpfCnpj: '',
      senha: '',
    });
    setOwnerSearch(`${owner.nome_completo} - ${owner.email}`);
    setOwnerOptions([]);
    setOwnerExists(true);
    clearErr('ownerNome');
    clearErr('ownerEmail');
  };

  useEffect(() => {
    return () => {
      if (checkTimer.current) {
        clearTimeout(checkTimer.current);
      }
      if (ownerSearchTimer.current) {
        clearTimeout(ownerSearchTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isEditMode || !editingPropertyId) {
      setLoadingExisting(false);
      return;
    }

    let mounted = true;

    const loadExistingProperty = async () => {
      setLoadingExisting(true);
      try {
        const { data: property, error: propertyError } = await supabase
          .from('propriedades')
          .select(`
            id, nome, imovel, car, inscricao_incra, dap, id_municipio, municipio_nome, uf, id_regional,
            bairro, logradouro, numero, complemento, cep, referencia, como_chegar, latitude, longitude,
            area_total, area_atividades_prod, area_pecuaria, area_preservacao_perm, area_reserva_legal,
            area_vegetacao_nativa, area_acudes_represas, area_benfeitorias, area_estradas, area_graos_cereais,
            area_nao_agricola, valor_terra_nua, status_propriedade, status_arrendamento, telefone, id_produtor,
            produtores(nome, telefone, email, cpf_cnpj, usuario_id)
          `)
          .eq('id', editingPropertyId)
          .single();

        if (propertyError) {
          throw propertyError;
        }

        const loadedProperty = property as unknown as LoadedPropertyRow;
        const [municipioResult, regiaoResult] = await Promise.all([
          loadedProperty.id_municipio
            ? supabase.from('municipios').select('id, nome, uf').eq('id', loadedProperty.id_municipio).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          loadedProperty.id_regional
            ? supabase.from('regioes').select('id, nome, uf').eq('id', loadedProperty.id_regional).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (municipioResult.error) {
          throw municipioResult.error;
        }
        if (regiaoResult.error) {
          throw regiaoResult.error;
        }

        if (!mounted) {
          return;
        }

        setPf({
          nome: loadedProperty.nome ?? '',
          imovel: loadedProperty.imovel ?? '',
          car: loadedProperty.car ?? '',
          inscricaoIncra: loadedProperty.inscricao_incra ?? '',
          dap: loadedProperty.dap ?? '',
          municipio: (municipioResult.data as Municipio | null) ?? null,
          regiao: (regiaoResult.data as Regiao | null) ?? null,
          uf: loadedProperty.uf ?? 'TO',
          bairro: loadedProperty.bairro ?? '',
          logradouro: loadedProperty.logradouro ?? '',
          numero: loadedProperty.numero ?? '',
          complemento: loadedProperty.complemento ?? '',
          cep: loadedProperty.cep ?? '',
          referencia: loadedProperty.referencia ?? '',
          comoChegar: loadedProperty.como_chegar ?? '',
          latitude: formatCoordinateValue(loadedProperty.latitude, 'lat'),
          longitude: formatCoordinateValue(loadedProperty.longitude, 'lon'),
          areaTotal: formatOptionalNumber(loadedProperty.area_total),
          areaAtividades: formatOptionalNumber(loadedProperty.area_atividades_prod),
          areaPecuaria: formatOptionalNumber(loadedProperty.area_pecuaria),
          areaPreservacao: formatOptionalNumber(loadedProperty.area_preservacao_perm),
          areaReserva: formatOptionalNumber(loadedProperty.area_reserva_legal),
          areaVegetacao: formatOptionalNumber(loadedProperty.area_vegetacao_nativa),
          areaAcudes: formatOptionalNumber(loadedProperty.area_acudes_represas),
          areaBenfeitorias: formatOptionalNumber(loadedProperty.area_benfeitorias),
          areaEstradas: formatOptionalNumber(loadedProperty.area_estradas),
          areaGraos: formatOptionalNumber(loadedProperty.area_graos_cereais),
          areaNaoAgricola: formatOptionalNumber(loadedProperty.area_nao_agricola),
          valorTerraNua: formatOptionalNumber(loadedProperty.valor_terra_nua),
          statusProp: loadedProperty.status_propriedade ?? 'ativo',
          statusArr: loadedProperty.status_arrendamento ?? 'nao_arrendada',
          telefone: loadedProperty.telefone ?? '',
        });

        setOf({
          nome: loadedProperty.produtores?.nome ?? '',
          email: loadedProperty.produtores?.email ?? '',
          telefone: loadedProperty.produtores?.telefone ?? '',
          cpfCnpj: loadedProperty.produtores?.cpf_cnpj ?? '',
          senha: '',
        });

        setOwnerSearch(
          loadedProperty.produtores?.email
            ? `${loadedProperty.produtores?.nome ?? ''} - ${loadedProperty.produtores.email}`
            : ''
        );
        setOwnerExists(!!loadedProperty.produtores?.usuario_id || !!loadedProperty.produtores?.email);
      } catch (error: any) {
        if (mounted) {
          setFeedback({ type: 'err', msg: error?.message ?? 'Nao foi possivel carregar a propriedade para edicao.' });
        }
      } finally {
        if (mounted) {
          setLoadingExisting(false);
        }
      }
    };

    loadExistingProperty();

    return () => {
      mounted = false;
    };
  }, [editingPropertyId, isEditMode]);

  useEffect(() => {
    if (step !== 2) return;

    const query = ownerSearch.trim();
    if (query.length < 2) {
      setOwnerOptions([]);
      setOwnerSearchLoading(false);
      return;
    }

    if (ownerSearchTimer.current) {
      clearTimeout(ownerSearchTimer.current);
    }

    ownerSearchTimer.current = setTimeout(async () => {
      setOwnerSearchLoading(true);
      const { data } = await supabase
        .from('usuarios')
        .select('id, nome_completo, email, telefone')
        .eq('perfil', 'proprietario')
        .or(`nome_completo.ilike.%${query}%,email.ilike.%${query}%`)
        .order('nome_completo')
        .limit(6);
      setOwnerOptions((data as ProprietarioOption[]) ?? []);
      setOwnerSearchLoading(false);
    }, 350);
  }, [ownerSearch, step]);

  // Captura localização GPS atual
  const getLocation = async () => {
    setLocating(true);
    try {
      // Solicita permissão no Android; no iOS a permissão é pedida automaticamente
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permissão de localização',
            message: 'O app precisa acessar sua localização para registrar as coordenadas da propriedade.',
            buttonPositive: 'Permitir',
            buttonNegative: 'Cancelar',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setErrors(c => ({ ...c, coord: 'Permissão de localização negada.' }));
          return;
        }
      }
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          pos => {
            sp('latitude',  pos.coords.latitude.toFixed(6).replace('.', ','));
            sp('longitude', pos.coords.longitude.toFixed(6).replace('.', ','));
            clearErr('coord');
            resolve();
          },
          err => reject(new Error(err.message)),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
      });
    } catch {
      setErrors(c => ({ ...c, coord: 'Não foi possível obter a localização.' }));
    } finally {
      setLocating(false);
    }
  };

  // Validação por etapa
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (step === 0) {
      if (!pf.nome.trim())     errs.nome = 'Nome da propriedade é obrigatório.';
    }
    if (step === 1) {
      if (!pf.municipio)       errs.municipio = 'Selecione um município.';
      if (!pf.regiao)          errs.regiao = 'Selecione a regional.';
      if (pf.latitude && isNaN(parseNum(pf.latitude) ?? NaN))  errs.lat = 'Latitude inválida.';
      if (pf.longitude && isNaN(parseNum(pf.longitude) ?? NaN)) errs.lon = 'Longitude inválida.';
    }
    if (step === 2) {
      if (!of.nome.trim())     errs.ownerNome  = 'Nome do proprietário é obrigatório.';
      if (!isValidEmail(of.email)) errs.ownerEmail = 'E-mail inválido.';
      if (!ownerExists && !of.senha.trim()) errs.ownerSenha = 'Informe uma senha para criar o acesso.';
      if (!ownerExists && of.senha.trim().length < 8) errs.ownerSenha = 'Senha deve ter no mínimo 8 caracteres.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (!validate()) return;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setStep(s => Math.min(s + 1, 2));
  };

  const prevStep = () => {
    setErrors({});
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setStep(s => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      // 1. Garante usuário + produtor
      const ownerEmail = of.email.trim().toLowerCase();
      let ownerUserId: string;

      const { data: existingUser } = await supabase
        .from('usuarios').select('id, perfil').eq('email', ownerEmail).maybeSingle();

      if (existingUser) {
        if (existingUser.perfil !== 'proprietario')
          throw new Error('Já existe um usuário com esse e-mail, mas sem perfil de proprietário.');
        ownerUserId = existingUser.id;
        await supabase.from('usuarios').update({
          nome_completo: of.nome.trim(),
          telefone: of.telefone.trim() || null,
          atualizado_em: new Date().toISOString(),
        }).eq('id', ownerUserId);
      } else {
        const { data: authData, error: authErr } = await signupClient.auth.signUp({
          email: ownerEmail,
          password: of.senha,
          options: { data: { nome_completo: of.nome.trim(), perfil: 'proprietario' } },
        });
        if (authErr || !authData.user) throw new Error(authErr?.message ?? 'Erro ao criar login.');
        ownerUserId = authData.user.id;
        const { error: profErr } = await supabase.from('usuarios').insert({
          id: ownerUserId, email: ownerEmail, perfil: 'proprietario',
          nome_completo: of.nome.trim(),
          telefone: of.telefone.trim() || null,
          id_regional: pf.regiao?.id ?? null,
          ativo: true,
        });
        if (profErr) throw profErr;
      }

      // Upsert produtor
      const { data: existingProd } = await supabase
        .from('produtores').select('id').eq('usuario_id', ownerUserId).maybeSingle();

      let prodId: number;
      const prodPayload = {
        nome: of.nome.trim(),
        cpf_cnpj: of.cpfCnpj.trim() || null,
        telefone: of.telefone.trim() || null,
        email: ownerEmail,
        usuario_id: ownerUserId,
        atualizado_em: new Date().toISOString(),
      };

      if (existingProd) {
        await supabase.from('produtores').update(prodPayload).eq('id', existingProd.id);
        prodId = existingProd.id;
      } else {
        const { data: newProd, error: prodErr } = await supabase
          .from('produtores').insert(prodPayload).select('id').single();
        if (prodErr || !newProd) throw prodErr ?? new Error('Erro ao criar produtor.');
        prodId = newProd.id;
      }

      // 2. Salva propriedade
      const numAreas = (field: string) => parseNum(field) ?? null;
      const propertyPayload = {
        nome:                  pf.nome.trim(),
        imovel:                pf.imovel.trim()        || null,
        car:                   pf.car.trim()            || null,
        inscricao_incra:       pf.inscricaoIncra.trim() || null,
        dap:                   pf.dap.trim()            || null,
        id_municipio:          pf.municipio?.id         ?? null,
        municipio_nome:        pf.municipio?.nome       ?? null,
        uf:                    pf.municipio?.uf ?? pf.uf.toUpperCase(),
        id_regional:           pf.regiao?.id            ?? null,
        bairro:                pf.bairro.trim()         || null,
        logradouro:            pf.logradouro.trim()     || null,
        numero:                pf.numero.trim()         || null,
        complemento:           pf.complemento.trim()   || null,
        cep:                   pf.cep.trim()            || null,
        referencia:            pf.referencia.trim()     || null,
        como_chegar:           pf.comoChegar.trim()    || null,
        latitude:              parseNum(pf.latitude),
        longitude:             parseNum(pf.longitude),
        area_total:            numAreas(pf.areaTotal),
        area_atividades_prod:  numAreas(pf.areaAtividades),
        area_pecuaria:         numAreas(pf.areaPecuaria),
        area_preservacao_perm: numAreas(pf.areaPreservacao),
        area_reserva_legal:    numAreas(pf.areaReserva),
        area_vegetacao_nativa: numAreas(pf.areaVegetacao),
        area_acudes_represas:  numAreas(pf.areaAcudes),
        area_benfeitorias:     numAreas(pf.areaBenfeitorias),
        area_estradas:         numAreas(pf.areaEstradas),
        area_graos_cereais:    numAreas(pf.areaGraos),
        area_nao_agricola:     numAreas(pf.areaNaoAgricola),
        valor_terra_nua:       numAreas(pf.valorTerraNua),
        status_propriedade:    pf.statusProp,
        status_arrendamento:   pf.statusArr,
        telefone:              pf.telefone.trim() || null,
        id_produtor:           prodId,
        atualizado_em:         new Date().toISOString(),
      };

      const propQuery = isEditMode && editingPropertyId
        ? supabase.from('propriedades').update(propertyPayload).eq('id', editingPropertyId)
        : supabase.from('propriedades').insert(propertyPayload);

      const { error: propErr } = await propQuery;

      if (propErr) throw propErr;

      if (isEditMode) {
        setFeedback({ type: 'ok', msg: 'Propriedade atualizada com sucesso!' });
      } else {
        setPf(PROP0); setOf(OWNER0); setStep(0); setOwnerExists(null);
        setFeedback({ type: 'ok', msg: 'Propriedade cadastrada com sucesso!' });
      }
    } catch (e: any) {
      setFeedback({ type: 'err', msg: e?.message ?? `Erro ao ${isEditMode ? 'atualizar' : 'cadastrar'}. Tente novamente.` });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={rs.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[rs.content, { paddingBottom: footerSpacing }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">

          {/* Cabeçalho */}
          <View style={rs.header}>
            <TouchableOpacity style={rs.back} onPress={() => router.back()} activeOpacity={0.8}>
              <FontAwesome6 name="arrow-left" size={14} color={T.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={rs.title}>{isEditMode ? 'Editar Propriedade' : 'Nova Propriedade'}</Text>
              <Text style={rs.sub}>{isEditMode ? 'Atualize os dados da propriedade' : 'Preencha as etapas abaixo'}</Text>
            </View>
          </View>

          {loadingExisting ? (
            <View style={rs.loadingCard}>
              <ActivityIndicator color={T.green} />
              <Text style={rs.loadingCardText}>Carregando dados da propriedade...</Text>
            </View>
          ) : null}

          <Stepper current={step} />

          {/* ── ETAPA 0: Dados da Propriedade ── */}
          {step === 0 && (
            <View style={rs.sections}>
              <Section icon="house-chimney" iconColor={T.gold} title="Identificação">
                <Field
                  label="Nome da propriedade *"
                  value={pf.nome}
                  onChange={v => { sp('nome', v); clearErr('nome'); }}
                  placeholder="Ex: Fazenda Santa Clara"
                  error={errors.nome}
                />
                <Field label="Nome do imóvel no cartório" value={pf.imovel} onChange={v => sp('imovel', v)} placeholder="Nome jurídico (opcional)" />
                <View style={rs.row}>
                  <View style={rs.col}>
                    <Field label="CAR" value={pf.car} onChange={v => sp('car', v)} placeholder="Cód. CAR" />
                  </View>
                  <View style={rs.col}>
                    <Field label="DAP / CAF" value={pf.dap} onChange={v => sp('dap', v)} placeholder="Número" />
                  </View>
                </View>
                <Field label="Inscrição INCRA" value={pf.inscricaoIncra} onChange={v => sp('inscricaoIncra', v)} placeholder="Número da inscrição (opcional)" />
                <Field label="Telefone de contato" value={pf.telefone} onChange={v => sp('telefone', v)} placeholder="(63) 99999-9999" keyboard="phone-pad" />
              </Section>

              <Section icon="clipboard-check" iconColor={T.blue} title="Status operacional">
                <ChipGroup
                  label="Status da propriedade"
                  value={pf.statusProp}
                  onChange={v => sp('statusProp', v as StatusProp)}
                  options={[
                    { value: 'ativo', label: 'Ativa' },
                    { value: 'em_analise', label: 'Em análise' },
                    { value: 'inativo', label: 'Inativa' },
                  ]}
                />
                <ChipGroup
                  label="Arrendamento"
                  value={pf.statusArr}
                  onChange={v => sp('statusArr', v as StatusArr)}
                  options={[
                    { value: 'nao_arrendada', label: 'Não arrendada' },
                    { value: 'arrendada', label: 'Arrendada' },
                    { value: 'parcialmente_arrendada', label: 'Parcial' },
                  ]}
                />
              </Section>
            </View>
          )}

          {/* ── ETAPA 1: Localização ── */}
          {step === 1 && (
            <View style={rs.sections}>
              <Section icon="location-dot" iconColor={T.blue} title="Localização">
                <MunicipioSearch
                  value={pf.municipio}
                  onChange={m => { sp('municipio', m); clearErr('municipio'); }}
                />
                {errors.municipio && <Text style={fs.errorMsg}>{errors.municipio}</Text>}

                <RegiaoSelect
                  value={pf.regiao}
                  onChange={r => { sp('regiao', r); clearErr('regiao'); }}
                />
                {errors.regiao && <Text style={fs.errorMsg}>{errors.regiao}</Text>}

                <View style={rs.row}>
                  <View style={rs.col}>
                    <Field label="CEP" value={pf.cep} onChange={v => sp('cep', v)} placeholder="77000-000" keyboard="numeric" />
                  </View>
                  <View style={rs.col}>
                    <Field label="Bairro / Zona" value={pf.bairro} onChange={v => sp('bairro', v)} placeholder="Zona rural" />
                  </View>
                </View>
                <Field label="Logradouro" value={pf.logradouro} onChange={v => sp('logradouro', v)} placeholder="Estrada, lote, chácara..." />
                <View style={rs.row}>
                  <View style={{ width: 80 }}>
                    <Field label="Número" value={pf.numero} onChange={v => sp('numero', v)} placeholder="S/N" />
                  </View>
                  <View style={rs.col}>
                    <Field label="Complemento" value={pf.complemento} onChange={v => sp('complemento', v)} placeholder="Apto, sala..." />
                  </View>
                </View>
                <Field label="Referência" value={pf.referencia} onChange={v => sp('referencia', v)} placeholder="Próximo a..." multiline />
                <Field label="Como chegar" value={pf.comoChegar} onChange={v => sp('comoChegar', v)} placeholder="Instrucoes de acesso ao local" multiline />
              </Section>

              <Section icon="map-pin" iconColor={T.green} title="Coordenadas GPS da sede" hint="Essas coordenadas são usadas para validar a localização das visitas.">
                {/* Botão capturar GPS */}
                <TouchableOpacity style={rs.gpsBtn} onPress={getLocation} activeOpacity={0.8} disabled={locating}>
                  {locating
                    ? <ActivityIndicator size="small" color={T.green} />
                    : <FontAwesome6 name="crosshairs" size={13} color={T.green} />
                  }
                  <Text style={rs.gpsBtnText}>{locating ? 'Obtendo localização...' : 'Usar localização atual'}</Text>
                </TouchableOpacity>
                {errors.coord && <Text style={[fs.errorMsg, { marginBottom: 6 }]}>{errors.coord}</Text>}

                <View style={rs.row}>
                  <View style={rs.col}>
                    <Field
                      label="Latitude"
                      value={pf.latitude}
                      onChange={v => { sp('latitude', formatCoordinateInput(v, 'lat')); clearErr('lat'); }}
                      placeholder="-9,91518134"
                      keyboard="numeric"
                      error={errors.lat}
                      hint="Formato brasileiro com virgula decimal"
                    />
                  </View>
                  <View style={rs.col}>
                    <Field
                      label="Longitude"
                      value={pf.longitude}
                      onChange={v => { sp('longitude', formatCoordinateInput(v, 'lon')); clearErr('lon'); }}
                      placeholder="-48,12345678"
                      keyboard="numeric"
                      error={errors.lon}
                      hint="Formato brasileiro com virgula decimal"
                    />
                  </View>
                </View>
              </Section>

              {/* Seção de áreas – colapsável */}
              <TouchableOpacity
                style={rs.areasToggle}
                onPress={() => setAreasOpen(v => !v)}
                activeOpacity={0.8}
              >
                <FontAwesome6 name="chart-area" size={12} color={T.goldDim} />
                <Text style={rs.areasToggleText}>
                  {areasOpen ? 'Ocultar áreas e valor da terra' : 'Informar áreas e valor da terra (opcional)'}
                </Text>
                <FontAwesome6 name={areasOpen ? 'chevron-up' : 'chevron-down'} size={10} color={T.muted} />
              </TouchableOpacity>

              {areasOpen && (
                <Section icon="chart-area" iconColor={T.gold} title="Áreas (hectares) e valor">
                  <View style={rs.row}>
                    <View style={rs.col}><Field label="Total" value={pf.areaTotal} onChange={v => sp('areaTotal', v)} placeholder="0,00" keyboard="numeric" /></View>
                    <View style={rs.col}><Field label="Atividades prod." value={pf.areaAtividades} onChange={v => sp('areaAtividades', v)} placeholder="0,00" keyboard="numeric" /></View>
                  </View>
                  <View style={rs.row}>
                    <View style={rs.col}><Field label="Pecuária" value={pf.areaPecuaria} onChange={v => sp('areaPecuaria', v)} placeholder="0,00" keyboard="numeric" /></View>
                    <View style={rs.col}><Field label="Preservação perm." value={pf.areaPreservacao} onChange={v => sp('areaPreservacao', v)} placeholder="0,00" keyboard="numeric" /></View>
                  </View>
                  <View style={rs.row}>
                    <View style={rs.col}><Field label="Reserva legal" value={pf.areaReserva} onChange={v => sp('areaReserva', v)} placeholder="0,00" keyboard="numeric" /></View>
                    <View style={rs.col}><Field label="Vegetação nativa" value={pf.areaVegetacao} onChange={v => sp('areaVegetacao', v)} placeholder="0,00" keyboard="numeric" /></View>
                  </View>
                  <View style={rs.row}>
                    <View style={rs.col}><Field label="Açudes/represas" value={pf.areaAcudes} onChange={v => sp('areaAcudes', v)} placeholder="0,00" keyboard="numeric" /></View>
                    <View style={rs.col}><Field label="Benfeitorias" value={pf.areaBenfeitorias} onChange={v => sp('areaBenfeitorias', v)} placeholder="0,00" keyboard="numeric" /></View>
                  </View>
                  <View style={rs.row}>
                    <View style={rs.col}><Field label="Estradas" value={pf.areaEstradas} onChange={v => sp('areaEstradas', v)} placeholder="0,00" keyboard="numeric" /></View>
                    <View style={rs.col}><Field label="Grãos/cereais" value={pf.areaGraos} onChange={v => sp('areaGraos', v)} placeholder="0,00" keyboard="numeric" /></View>
                  </View>
                  <View style={rs.row}>
                    <View style={rs.col}><Field label="Não agrícola" value={pf.areaNaoAgricola} onChange={v => sp('areaNaoAgricola', v)} placeholder="0,00" keyboard="numeric" /></View>
                    <View style={rs.col}><Field label="Valor terra nua (R$)" value={pf.valorTerraNua} onChange={v => sp('valorTerraNua', v)} placeholder="0,00" keyboard="numeric" /></View>
                  </View>
                </Section>
              )}
            </View>
          )}

          {/* ── ETAPA 2: Proprietário ── */}
          {step === 2 && (
            <View style={rs.sections}>
              <Section
                icon="user-tie"
                iconColor={T.blue}
                title="Proprietário rural"
                hint="Se o e-mail já existir com perfil de proprietário, o cadastro será atualizado. Caso contrário, um novo acesso será criado."
              >
                <Field
                  label="Vincular proprietario ja cadastrado"
                  value={ownerSearch}
                  onChange={setOwnerSearch}
                  placeholder="Busque por nome ou e-mail"
                  hint="Opcional. Ao selecionar um resultado, os dados abaixo sao preenchidos."
                />
                {ownerSearchLoading && (
                  <View style={rs.ownerSearchState}>
                    <ActivityIndicator size="small" color={T.green} />
                    <Text style={rs.ownerSearchStateText}>Buscando proprietarios...</Text>
                  </View>
                )}
                {ownerOptions.length > 0 && (
                  <View style={rs.ownerList}>
                    {ownerOptions.map((owner) => (
                      <TouchableOpacity key={owner.id} style={rs.ownerItem} onPress={() => selectExistingOwner(owner)} activeOpacity={0.8}>
                        <View style={rs.ownerItemIcon}>
                          <FontAwesome6 name="user-check" size={12} color={T.green} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={rs.ownerItemName}>{owner.nome_completo}</Text>
                          <Text style={rs.ownerItemMeta}>{owner.email}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Field
                  label="Nome completo *"
                  value={of.nome}
                  onChange={v => { so('nome', v); clearErr('ownerNome'); }}
                  placeholder="Nome do proprietário"
                  error={errors.ownerNome}
                />
                <View>
                  <Field
                    label="E-mail *"
                    value={of.email}
                    onChange={v => { handleOwnerEmail(v); clearErr('ownerEmail'); }}
                    placeholder="proprietario@email.com"
                    keyboard="email-address"
                    error={errors.ownerEmail}
                  />
                  {/* Badge de status do e-mail */}
                  {ownerExists !== null && isValidEmail(of.email) && (
                    <View style={[rs.emailBadge, ownerExists ? rs.emailBadgeOk : rs.emailBadgeNew]}>
                      <FontAwesome6 name={ownerExists ? 'user-check' : 'user-plus'} size={11} color={ownerExists ? T.green : T.gold} />
                      <Text style={[rs.emailBadgeText, { color: ownerExists ? T.green : T.gold }]}>
                        {ownerExists ? 'Usuário já cadastrado — dados serão atualizados' : 'Novo usuário — será criado um login'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={rs.row}>
                  <View style={rs.col}>
                    <Field label="Telefone" value={of.telefone} onChange={v => so('telefone', v)} placeholder="(63) 99999-9999" keyboard="phone-pad" />
                  </View>
                  <View style={rs.col}>
                    <Field label="CPF / CNPJ" value={of.cpfCnpj} onChange={v => so('cpfCnpj', v)} placeholder="000.000.000-00" />
                  </View>
                </View>

                {/* Senha: só exibe se for usuário novo ou ainda não verificado */}
                {ownerExists === false && (
                  <Field
                    label="Senha inicial *"
                    value={of.senha}
                    onChange={v => { so('senha', v); clearErr('ownerSenha'); }}
                    placeholder="Mínimo 8 caracteres"
                    secure
                    error={errors.ownerSenha}
                    hint="O proprietário poderá alterar a senha no primeiro acesso."
                  />
                )}
              </Section>

              {/* Feedback */}
              {feedback && (
                <View style={[rs.feedback, feedback.type === 'ok' ? rs.feedbackOk : rs.feedbackErr]}>
                  <FontAwesome6
                    name={feedback.type === 'ok' ? 'circle-check' : 'circle-exclamation'}
                    size={14}
                    color={feedback.type === 'ok' ? T.green : T.red}
                  />
                  <Text style={[rs.feedbackText, { color: feedback.type === 'ok' ? T.green : T.red }]}>
                    {feedback.msg}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Navegação entre etapas */}
          <View style={[rs.navRow, { marginBottom: insets.bottom + 16 }, step === 0 && { justifyContent: 'flex-end' }]}>
            {step > 0 && (
              <TouchableOpacity style={rs.btnSecondary} onPress={prevStep} activeOpacity={0.8}>
                <FontAwesome6 name="arrow-left" size={12} color={T.white} />
                <Text style={rs.btnSecondaryText}>Voltar</Text>
              </TouchableOpacity>
            )}
            {step < 2 && (
              <TouchableOpacity style={rs.btnPrimary} onPress={nextStep} activeOpacity={0.8}>
                <Text style={rs.btnPrimaryText}>Próximo</Text>
                <FontAwesome6 name="arrow-right" size={12} color={T.bg} />
              </TouchableOpacity>
            )}
            {step === 2 && (
              <TouchableOpacity style={rs.btnPrimary} onPress={handleSubmit} activeOpacity={0.8} disabled={submitting}>
                {submitting
                  ? <ActivityIndicator color={T.bg} size="small" />
                  : <>
                      <FontAwesome6 name="floppy-disk" size={13} color={T.bg} />
                      <Text style={rs.btnPrimaryText}>{isEditMode ? 'Salvar alteracoes' : 'Cadastrar'}</Text>
                    </>
                }
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const rs = StyleSheet.create({
  root:    { flex: 1, backgroundColor: T.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 48, gap: 14 },

  header:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 28 },
  back:    { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  title:   { color: T.white, fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  sub:     { color: T.muted, fontSize: 13, marginTop: 2 },
  loadingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 16, marginBottom: 8 },
  loadingCardText: { color: T.muted, fontSize: 13, fontWeight: '600' },

  sections:{ gap: 14 },
  row:     { flexDirection: 'row', gap: 10 },
  col:     { flex: 1 },

  gpsBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(77,200,90,0.1)', borderWidth: 1.5, borderColor: 'rgba(77,200,90,0.25)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginTop: 10, marginBottom: 6 },
  gpsBtnText:  { color: T.green, fontSize: 13, fontWeight: '700' },

  areasToggle:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 4 },
  areasToggleText: { color: T.muted, fontSize: 13, fontWeight: '600', flex: 1 },

  ownerSearchState:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 10 },
  ownerSearchStateText: { color: T.muted, fontSize: 12, fontWeight: '600' },
  ownerList:            { marginTop: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: T.border, backgroundColor: 'rgba(255,255,255,0.03)' },
  ownerItem:            { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  ownerItemIcon:        { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(77,200,90,0.12)' },
  ownerItemName:        { color: T.white, fontSize: 13, fontWeight: '700' },
  ownerItemMeta:        { color: T.muted, fontSize: 12, marginTop: 2 },

  emailBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  emailBadgeOk:   { backgroundColor: 'rgba(77,200,90,0.1)' },
  emailBadgeNew:  { backgroundColor: 'rgba(245,200,66,0.1)' },
  emailBadgeText: { fontSize: 12, fontWeight: '600' },

  feedback:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 13, borderWidth: 1 },
  feedbackOk:   { backgroundColor: T.okBg, borderColor: T.okBdr },
  feedbackErr:  { backgroundColor: T.redBg, borderColor: T.redBdr },
  feedbackText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },

  navRow:         { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  btnPrimary:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.green, borderRadius: 14, paddingVertical: 14 },
  btnPrimaryText: { color: T.bg, fontSize: 15, fontWeight: '800' },
  btnSecondary:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 14, paddingVertical: 14 },
  btnSecondaryText:{ color: T.white, fontSize: 15, fontWeight: '700' },
});
