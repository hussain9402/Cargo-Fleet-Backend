import { networkInterfaces } from 'os';

export function getServerPort() {
  return Number(process.env.PORT || 3000);
}

export function getLocalNetworkIps() {
  const nets = networkInterfaces();
  const ips: string[] = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }

  return [...new Set(ips)];
}

export async function getPublicIp() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { ip?: string };
    return data.ip ?? null;
  } catch {
    return null;
  }
}

export function buildHealthUrls(port = getServerPort()) {
  const localhost = `http://localhost:${port}/api/health`;
  const network = getLocalNetworkIps().map((ip) => `http://${ip}:${port}/api/health`);

  return {
    localhost,
    network,
  };
}

export async function buildHealthUrlsWithPublic(port = getServerPort()) {
  const base = buildHealthUrls(port);
  const publicIp = await getPublicIp();

  return {
    ...base,
    public: publicIp ? `http://${publicIp}:${port}/api/health` : null,
    publicIp,
  };
}
