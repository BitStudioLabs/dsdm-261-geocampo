export type NetworkRiskResult = {
  available: boolean;
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  org: string | null;
  latitude: number | null;
  longitude: number | null;
  vpnSuspected: boolean;
  reason: string;
  checkedAt: string;
};

type IpApiResponse = {
  ip?: string;
  city?: string;
  region?: string;
  country_name?: string;
  org?: string;
  asn?: string;
  network?: string;
  latitude?: number;
  longitude?: number;
  error?: boolean;
  reason?: string;
};

type IpWhoResponse = {
  success?: boolean;
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  connection?: {
    asn?: number;
    org?: string;
    isp?: string;
  };
  message?: string;
};

const VPN_KEYWORDS = [
  'vpn',
  'proxy',
  'hosting',
  'host',
  'datacenter',
  'data center',
  'cloud',
  'server',
  'digitalocean',
  'amazon',
  'aws',
  'google cloud',
  'microsoft',
  'azure',
  'ovh',
  'hetzner',
  'linode',
  'vultr',
  'm247',
  'leaseweb',
];

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function detectVpnByOrganization(value: string) {
  const normalized = value.toLowerCase();
  return VPN_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function unavailable(reason: string): NetworkRiskResult {
  return {
    available: false,
    ip: null,
    city: null,
    region: null,
    country: null,
    org: null,
    latitude: null,
    longitude: null,
    vpnSuspected: false,
    reason,
    checkedAt: new Date().toISOString(),
  };
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 9000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Consulta de IP falhou em ${url} (${response.status}).`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function buildResult(params: {
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  org: string | null;
  latitude: number | null;
  longitude: number | null;
}): NetworkRiskResult {
  const vpnSuspected = params.org ? detectVpnByOrganization(params.org) : false;

  return {
    available: true,
    ...params,
    vpnSuspected,
    reason: vpnSuspected
      ? 'Provedor do IP parece ser VPN, proxy, nuvem ou datacenter.'
      : 'Provedor do IP sem sinais comuns de VPN/proxy.',
    checkedAt: new Date().toISOString(),
  };
}

export async function fetchNetworkRisk(): Promise<NetworkRiskResult> {
  const errors: string[] = [];

  try {
    const data = await fetchJsonWithTimeout<IpApiResponse>('https://ipapi.co/json/');

    if (data.error) {
      throw new Error(data.reason ?? 'Servico ipapi.co retornou erro.');
    }

    return buildResult({
      ip: data.ip ?? null,
      city: data.city ?? null,
      region: data.region ?? null,
      country: data.country_name ?? null,
      org: [data.org, data.asn, data.network].filter(Boolean).join(' - ') || null,
      latitude: toNumber(data.latitude),
      longitude: toNumber(data.longitude),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida em ipapi.co.';
    errors.push(`ipapi.co: ${message}`);
  }

  try {
    const data = await fetchJsonWithTimeout<IpWhoResponse>('https://ipwho.is/');

    if (data.success === false) {
      throw new Error(data.message ?? 'Servico ipwho.is retornou erro.');
    }

    return buildResult({
      ip: data.ip ?? null,
      city: data.city ?? null,
      region: data.region ?? null,
      country: data.country ?? null,
      org: [data.connection?.org, data.connection?.isp, data.connection?.asn ? `AS${data.connection.asn}` : null]
        .filter(Boolean)
        .join(' - ') || null,
      latitude: toNumber(data.latitude),
      longitude: toNumber(data.longitude),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida em ipwho.is.';
    errors.push(`ipwho.is: ${message}`);
  }

  return unavailable(errors.join(' | ') || 'Não foi possivel consultar o IP publico.');
}
