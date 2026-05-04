export function createRuntimeId(prefix = "id") {
  const uuid = getRuntimeUuid();
  return prefix ? `${prefix}-${uuid}` : uuid;
}

export function getRuntimeUuid() {
  const cryptoApi = getCryptoApi();
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
      .slice(6, 8)
      .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getCryptoApi(): Crypto | undefined {
  if (typeof globalThis === "undefined") return undefined;
  const value = globalThis.crypto;
  return value && typeof value === "object" ? value : undefined;
}
