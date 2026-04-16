
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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { CADASTRO_PROPRIEDADE_THEME as T } from '@/features/cadastro-propriedade/constants';
import { formatCoordinateInput, formatCoordinateValue, formatOptionalNumber, isValidEmail, parseNum } from '@/features/cadastro-propriedade/helpers';
import { cs, fs, mun, rs, ss, stp } from '@/features/cadastro-propriedade/styles';
import type { CadastroPropriedadeFeedback, LoadedPropertyRow, Municipio, OwnerForm, ProprietarioOption, PropForm, Regiao, StatusArr, StatusProp } from '@/features/cadastro-propriedade/types';
import { OWNER0, PROP0 } from '@/features/cadastro-propriedade/types';
import { supabase } from '@/src/lib/supabase';

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
  const [feedback, setFeedback] = useState<CadastroPropriedadeFeedback>(null);
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
          setFeedback({ type: 'err', msg: error?.message ?? 'Não foi possivel carregar a propriedade para edição.' });
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
                  hint="Opcional. Ao selecionar um resultado, os dados abaixo são preenchidos."
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
