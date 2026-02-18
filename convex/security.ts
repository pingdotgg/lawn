const BASE62_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomIndex(limit: number): number {
  if (limit <= 0 || limit > 256) {
    throw new Error("randomIndex limit must be between 1 and 256");
  }

  const max = Math.floor(256 / limit) * limit;
  const bytes = new Uint8Array(16);

  while (true) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte < max) return byte % limit;
    }
  }
}

export function generateOpaqueToken(length: number): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("Token length must be a positive integer");
  }

  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += BASE62_ALPHABET[randomIndex(BASE62_ALPHABET.length)];
  }
  return result;
}

export async function generateUniqueToken(
  length: number,
  exists: (token: string) => Promise<boolean>,
  maxAttempts = 5,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const token = generateOpaqueToken(length);
    if (!(await exists(token))) {
      return token;
    }
  }

  throw new Error("Could not generate a unique token");
}
