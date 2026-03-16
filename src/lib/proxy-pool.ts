// Round-robin proxy pool
// Each new browser profile gets the next proxy in rotation

interface Proxy {
  host: string;
  port: number;
  username: string;
  password: string;
}

const PROXIES: Proxy[] = [
  { host: "108.61.251.204", port: 11290, username: "LGqxTE", password: "41DBeB" },
  { host: "149.28.161.95", port: 13325, username: "P57nTR", password: "n6eM7E" },
  { host: "104.238.190.248", port: 10748, username: "faF7K4", password: "Kgyv2q" },
  { host: "217.69.6.173", port: 11628, username: "ZQgoCH", password: "d33ghf" },
  { host: "217.69.6.173", port: 11629, username: "ZQgoCH", password: "d33ghf" },
  { host: "217.69.6.173", port: 11630, username: "ZQgoCH", password: "d33ghf" },
  { host: "217.69.6.173", port: 11631, username: "ZQgoCH", password: "d33ghf" },
  { host: "85.195.81.150", port: 12880, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12882, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12879, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12877, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12872, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12871, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12876, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12875, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12874, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12873, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12870, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12869, username: "SW8rTn", password: "HwS8B2" },
  { host: "85.195.81.150", port: 12868, username: "SW8rTn", password: "HwS8B2" },
];

let currentIndex = 0;

export function getNextProxy(): Proxy {
  const proxy = PROXIES[currentIndex];
  currentIndex = (currentIndex + 1) % PROXIES.length;
  return proxy;
}

export function getProxyByIndex(index: number): Proxy {
  return PROXIES[index % PROXIES.length];
}

export function getProxyCount(): number {
  return PROXIES.length;
}

export function getAllProxies(): Proxy[] {
  return [...PROXIES];
}
