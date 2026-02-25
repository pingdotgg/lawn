const BASE62_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const PASSWORD_HASH_VERSION = "pbkdf2_sha256_v1";
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_BYTES = 32;
const PASSWORD_ITERATIONS = 210_000;
const textEncoder = new TextEncoder();

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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex input");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    const offset = i * 2;
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16);
    if (!Number.isFinite(value)) {
      throw new Error("Invalid hex input");
    }
    bytes[i] = value;
  }
  return bytes;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left[i] ^ right[i];
  }
  return diff === 0;
}

async function derivePasswordHashBytes(
  password: string,
  salt: Uint8Array,
  iterations: number,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: Uint8Array.from(salt),
      iterations,
    },
    key,
    PASSWORD_KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length === 0) {
    throw new Error("Password cannot be empty");
  }

  const salt = crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_BYTES));
  const hash = await derivePasswordHashBytes(password, salt, PASSWORD_ITERATIONS);
  return `${PASSWORD_HASH_VERSION}$${PASSWORD_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  try {
    const [version, iterationsRaw, saltHex, hashHex] = encodedHash.split("$");
    if (version !== PASSWORD_HASH_VERSION) {
      return false;
    }

    const iterations = Number.parseInt(iterationsRaw, 10);
    if (!Number.isInteger(iterations) || iterations <= 0) {
      return false;
    }

    const salt = hexToBytes(saltHex);
    const storedHash = hexToBytes(hashHex);
    const derivedHash = await derivePasswordHashBytes(password, salt, iterations);
    return constantTimeEqual(derivedHash, storedHash);
  } catch {
    return false;
  }
}
