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

const [, , emailArg, passwordArg, perfilArg = 'instrutor', ...nameParts] = process.argv;

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const perfilMap = {
  gestor: 'admin',
};

const perfil = perfilMap[perfilArg] || perfilArg;
const nomeCompleto = nameParts.join(' ').trim() || emailArg;

if (!supabaseUrl) {
  console.error('Defina SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_URL no ambiente.');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('Defina SUPABASE_SERVICE_ROLE_KEY no ambiente para usar a Admin API.');
  process.exit(1);
}

if (!emailArg || !passwordArg) {
  console.error('Uso: node scripts/create-user.js <email> <senha> [perfil] [nome completo]');
  console.error('Exemplo: node scripts/create-user.js joao@gmail.com Senha123! instrutor "Joao Silva"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function ensureProfileRecord(user) {
  const payload = {
    id: user.id,
    nome_completo: nomeCompleto,
    email: user.email,
    perfil,
    ativo: true,
  };

  const { error } = await supabase.from('usuarios').upsert(payload, {
    onConflict: 'id',
  });

  if (error) {
    console.warn('Usuario criado no Auth, mas nao foi possivel sincronizar a tabela usuarios.');
    console.warn(`Motivo: ${error.message}`);
    return;
  }

  console.log('Registro sincronizado na tabela usuarios.');
}

async function main() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: emailArg,
    password: passwordArg,
    email_confirm: true,
    user_metadata: {
      nome_completo: nomeCompleto,
      perfil,
    },
  });

  if (error) {
    console.error(`Erro ao criar usuario: ${error.message}`);
    process.exit(1);
  }

  if (!data.user) {
    console.error('Usuario nao retornado pela API do Supabase.');
    process.exit(1);
  }

  console.log('Usuario criado no Supabase Auth com sucesso.');
  console.log(`id: ${data.user.id}`);
  console.log(`email: ${data.user.email}`);
  console.log(`perfil: ${perfil}`);

  await ensureProfileRecord(data.user);
}

main().catch((error) => {
  console.error('Falha inesperada ao criar usuario.');
  console.error(error);
  process.exit(1);
});
