const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvFile(fileName) {
  const envPath = path.resolve(__dirname, '..', fileName);

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const [, , sheetUrlArg, limitArg = '10', offsetArg = '0'] = process.argv;

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const limit = Number(limitArg);
const offset = Number(offsetArg);

if (!supabaseUrl) {
  console.error('Defina SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_URL no ambiente.');
  process.exitCode = 1;
  return;
}

if (!serviceRoleKey) {
  console.error('Defina SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exitCode = 1;
  return;
}

if (!sheetUrlArg) {
  console.error('Uso: node scripts/import-properties-from-sheet.js <google-sheet-url> [limite] [offset]');
  console.error('Exemplo: node scripts/import-properties-from-sheet.js "https://docs.google.com/spreadsheets/d/ID/edit?usp=sharing" 10 0');
  process.exitCode = 1;
  return;
}

if (!Number.isInteger(limit) || limit <= 0) {
  console.error('O limite deve ser um numero inteiro maior que zero.');
  process.exitCode = 1;
  return;
}

if (!Number.isInteger(offset) || offset < 0) {
  console.error('O offset deve ser um numero inteiro maior ou igual a zero.');
  process.exitCode = 1;
  return;
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function parseGoogleSheetUrl(input) {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error('URL do Google Sheets invalida.');
  }

  const sheetId = match[1];
  const gidMatch = input.match(/[?&]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : null;

  return { sheetId, gid };
}

function buildCsvUrl(input) {
  const { sheetId, gid } = parseGoogleSheetUrl(input);
  const url = new URL(`https://docs.google.com/spreadsheets/d/${sheetId}/export`);
  url.searchParams.set('format', 'csv');
  if (gid) {
    url.searchParams.set('gid', gid);
  }
  return url.toString();
}

function parseCsv(csvText) {
  const rows = [];
  let current = '';
  let row = [];
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === ',' && !insideQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(current);
      current = '';
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const [headerRow, ...dataRows] = rows;
  const headers = (headerRow ?? []).map((header) => header.trim());

  return dataRows
    .filter((dataRow) => dataRow.some((cell) => cell.trim() !== ''))
    .map((dataRow) =>
      headers.reduce((acc, header, index) => {
        acc[header] = (dataRow[index] ?? '').trim();
        return acc;
      }, {})
    );
}

function parseNumber(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;

  const normalized = text.replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function parseDate(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;

  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const [, day, month, year, hour = '00', minute = '00'] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`).toISOString();
}

function normalizeCoordinate(value, kind) {
  const text = String(value ?? '').trim();
  if (!text) return null;

  const direct = Number(text.replace(',', '.'));
  if (Number.isFinite(direct) && Math.abs(direct) <= (kind === 'lat' ? 90 : 180)) {
    return direct;
  }

  const sign = text.startsWith('-') ? -1 : 1;
  const digits = text.replace(/\D/g, '');
  if (!digits) return null;

  const options = kind === 'lat' ? [1, 2] : [2, 3];
  for (const integerDigits of options) {
    if (digits.length <= integerDigits) {
      continue;
    }

    const candidate = sign * Number(`${digits.slice(0, integerDigits)}.${digits.slice(integerDigits)}`);
    const valid =
      kind === 'lat' ? candidate >= -35 && candidate <= 6 : candidate >= -75 && candidate <= -30;

    if (valid) {
      return candidate;
    }
  }

  return null;
}

function normalizeStatusPropriedade(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (text === 'ativo') return 'ativo';
  if (text === 'inativo') return 'inativo';
  if (text === 'em analise' || text === 'em_analise') return 'em_analise';
  return 'ativo';
}

function normalizeStatusArrendamento(value) {
  const text = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  if (text === 'arrendada') return 'arrendada';
  if (text === 'parcialmente arrendada' || text === 'parcialmente_arrendada') return 'parcialmente_arrendada';
  return 'nao_arrendada';
}

async function loadLookups() {
  const [{ data: municipios, error: municipiosError }, { data: regioes, error: regioesError }] = await Promise.all([
    supabase.from('municipios').select('id, id_ibge, id_cna'),
    supabase.from('regioes').select('id, codigo'),
  ]);

  if (municipiosError) {
    throw municipiosError;
  }

  if (regioesError) {
    throw regioesError;
  }

  const municipioByIbge = new Map();
  const municipioByCna = new Map();
  for (const municipio of municipios ?? []) {
    if (municipio.id_ibge != null) {
      municipioByIbge.set(String(municipio.id_ibge), municipio.id);
    }
    if (municipio.id_cna != null) {
      municipioByCna.set(String(municipio.id_cna), municipio.id);
    }
  }

  const regiaoByCodigo = new Map();
  for (const regiao of regioes ?? []) {
    if (regiao.codigo != null) {
      regiaoByCodigo.set(String(regiao.codigo), regiao.id);
    }
  }

  return { municipioByIbge, municipioByCna, regiaoByCodigo };
}

function mapRowToProperty(row, lookups) {
  const municipioId =
    lookups.municipioByIbge.get(String(row.id_municipio_ibge || '').trim()) ??
    lookups.municipioByCna.get(String(row.id_municipio_cna || '').trim()) ??
    null;

  const regiaoId = lookups.regiaoByCodigo.get(String(row.id_regional || '').trim()) ?? null;
  const nomeImovel = row.imovel?.trim() || row.municipio?.trim() || `Propriedade ${row.id_propriedade}`;

  return {
    id_externo: parseNumber(row.id_propriedade),
    nome: nomeImovel,
    imovel: nomeImovel,
    car: row.car?.trim() || null,
    inscricao_incra: row.inscricao_incra?.trim() || null,
    dap: row.dap?.trim() || null,
    id_municipio: municipioId,
    municipio_nome: row.municipio?.trim() || row.cidade?.trim() || null,
    uf: (row.uf?.trim() || 'TO').toUpperCase(),
    id_regional: regiaoId,
    bairro: row.bairro?.trim() || null,
    logradouro: row.logradourado?.trim() || null,
    numero: row.numero?.trim() || null,
    complemento: row.complemento?.trim() || null,
    cep: row.cep?.trim() || null,
    referencia: row.referencia?.trim() || null,
    como_chegar: row.como_chegar?.trim() || null,
    latitude: normalizeCoordinate(row.latitude_sede_propriedade, 'lat'),
    longitude: normalizeCoordinate(row.longitude_sede_propriedade, 'lon'),
    area_total: parseNumber(row.area_total),
    area_atividades_prod: parseNumber(row.area_atividades_produtivas),
    area_pecuaria: parseNumber(row.area_pecuaria),
    area_preservacao_perm: parseNumber(row.area_preservacao_permanente),
    area_reserva_legal: parseNumber(row.area_reserva_legal),
    area_vegetacao_nativa: parseNumber(row.area_vegetacao_nativa),
    area_acudes_represas: parseNumber(row.area_acudes_represas),
    area_benfeitorias: parseNumber(row.area_benfeitorias),
    area_estradas: parseNumber(row.area_estradas),
    area_graos_cereais: parseNumber(row.area_graos_cereais),
    area_nao_agricola: parseNumber(row.area_nao_agricola),
    valor_terra_nua: parseNumber(row.valor_terra_nua),
    status_arrendamento: normalizeStatusArrendamento(row.status_arrendamento),
    status_propriedade: normalizeStatusPropriedade(row.status_propriedade),
    telefone: row.telefone_propriedade?.trim() || null,
    dt_inclusao: parseDate(row.dt_inclusao),
    dt_alteracao: parseDate(row.dt_alteracao),
  };
}

async function main() {
  const csvUrl = buildCsvUrl(sheetUrlArg);
  console.log(`Baixando planilha: ${csvUrl}`);

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Nao foi possivel baixar a planilha (${response.status} ${response.statusText}). Verifique se ela esta publica.`);
  }

  const csvText = await response.text();
  const allRows = parseCsv(csvText);
  const rowsWithCoordinates = allRows.filter((row) => {
    const latitude = normalizeCoordinate(row.latitude_sede_propriedade, 'lat');
    const longitude = normalizeCoordinate(row.longitude_sede_propriedade, 'lon');
    return latitude != null && longitude != null;
  });
  const rows = rowsWithCoordinates.slice(offset, offset + limit);

  if (rows.length === 0) {
    console.log('Nenhuma linha encontrada para esse recorte com coordenadas.');
    return;
  }

  const lookups = await loadLookups();
  const properties = rows.map((row) => mapRowToProperty(row, lookups));

  const { data, error } = await supabase.from('propriedades').upsert(properties, {
    onConflict: 'id_externo',
  }).select('id, id_externo, nome');

  if (error) {
    throw error;
  }

  console.log(`Importacao concluida. ${data?.length ?? 0} propriedades processadas.`);
  console.log(`Recorte importado: ${offset + 1} ate ${offset + rows.length} das propriedades com coordenadas.`);
  for (const item of data ?? []) {
    console.log(`- [${item.id_externo}] ${item.nome} (id interno: ${item.id})`);
  }
}

main().catch((error) => {
  const message = error?.message ?? String(error);
  console.error(`Erro ao importar propriedades: ${message}`);
  process.exitCode = 1;
});
