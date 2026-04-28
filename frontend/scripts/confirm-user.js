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

const [, , emailArg] = process.argv;

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('Defina SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_URL no ambiente.');
  process.exitCode = 1;
  return;
}

if (!serviceRoleKey) {
  console.error('Defina SUPABASE_SERVICE_ROLE_KEY no ambiente para usar a Admin API.');
  process.exitCode = 1;
  return;
}

if (!emailArg) {
  console.error('Uso: node scripts/confirm-user.js <email>');
  console.error('Exemplo: node scripts/confirm-user.js joao@gmail.com');
  process.exitCode = 1;
  return;
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findAuthUserByEmail(email) {
  let page = 1;
  const normalizedEmail = email.trim().toLowerCase();

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const existingUser = users.find((user) => user.email?.trim().toLowerCase() === normalizedEmail);

    if (existingUser) {
      return existingUser;
    }

    if (users.length < 1000) {
      return null;
    }

    page += 1;
  }
}

async function main() {
  const user = await findAuthUserByEmail(emailArg);

  if (!user) {
    throw new Error('Usuario nao encontrado no Supabase Auth para esse e-mail.');
  }

  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('A confirmacao foi enviada, mas a API nao retornou o usuario atualizado.');
  }

  console.log('Usuario confirmado com sucesso.');
  console.log(`id: ${data.user.id}`);
  console.log(`email: ${data.user.email}`);
}

main().catch((error) => {
  const message = error?.message ?? String(error);
  console.error(`Erro ao confirmar usuario: ${message}`);
  process.exitCode = 1;
});
