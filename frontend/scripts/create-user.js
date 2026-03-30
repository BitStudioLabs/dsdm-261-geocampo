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
  process.exitCode = 1;
  return;
}

if (!serviceRoleKey) {
  console.error('Defina SUPABASE_SERVICE_ROLE_KEY no ambiente para usar a Admin API.');
  process.exitCode = 1;
  return;
}

if (!emailArg || !passwordArg) {
  console.error('Uso: node scripts/create-user.js <email> <senha> [perfil] [nome completo]');
  console.error('Exemplo: node scripts/create-user.js joao@gmail.com Senha123! instrutor "Joao Silva"');
  process.exitCode = 1;
  return;
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

async function createOrReuseAuthUser() {
  const userPayload = {
    email: emailArg,
    password: passwordArg,
    email_confirm: true,
    user_metadata: {
      nome_completo: nomeCompleto,
      perfil,
    },
  };

  const { data, error } = await supabase.auth.admin.createUser(userPayload);

  if (!error && data.user) {
    console.log('Usuario criado no Supabase Auth com sucesso.');
    return data.user;
  }

  if (!error) {
    throw new Error('Usuario nao retornado pela API do Supabase.');
  }

  const duplicatedEmail =
    error.message?.includes('already been registered') ||
    error.code === 'email_exists' ||
    error.status === 422;

  if (!duplicatedEmail) {
    throw error;
  }

  const existingUser = await findAuthUserByEmail(emailArg);

  if (!existingUser) {
    throw new Error('O Supabase informou e-mail duplicado, mas o usuario nao foi localizado na Admin API.');
  }

  const { data: updatedData, error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
    password: passwordArg,
    email_confirm: true,
    user_metadata: {
      ...(existingUser.user_metadata ?? {}),
      nome_completo: nomeCompleto,
      perfil,
    },
  });

  if (updateError) {
    throw updateError;
  }

  if (!updatedData.user) {
    throw new Error('Usuario existente encontrado, mas a atualizacao nao retornou dados.');
  }

  console.log('Usuario ja existia no Supabase Auth e foi reaproveitado.');
  return updatedData.user;
}

async function main() {
  const user = await createOrReuseAuthUser();

  console.log(`id: ${user.id}`);
  console.log(`email: ${user.email}`);
  console.log(`perfil: ${perfil}`);

  await ensureProfileRecord(user);
}

main().catch((error) => {
  const message = error?.message ?? String(error);
  console.error(`Erro ao criar usuario: ${message}`);
  process.exitCode = 1;
});
