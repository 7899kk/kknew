import { gcm } from "@noble/ciphers/aes";
import { pbkdf2Async } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha256";
import {
  bytesToHex,
  hexToBytes,
  utf8ToBytes,
  bytesToUtf8,
} from "@noble/ciphers/utils";
import { encodeLedger, decodeLedger } from "./ledgerSchema";
import type { Ledger } from "./ledgerSchema";
const ITERATIONS = 210000,
  MAX = 10 * 1024 * 1024;
const aad = utf8ToBytes("profinancer-backup:v1:PBKDF2-SHA256:AES-256-GCM");
async function key(password: string, salt: Uint8Array) {
  return pbkdf2Async(sha256, utf8ToBytes(password), salt, {
    c: ITERATIONS,
    dkLen: 32,
    asyncTick: 10,
  });
}
export async function encryptBackup(
  data: Ledger,
  password: string,
  random: (length: number) => Uint8Array,
) {
  if (password.length < 10)
    throw Error("Use a backup password of at least 10 characters.");
  const plain = utf8ToBytes(encodeLedger(data));
  if (plain.length > MAX / 2 - 1024)
    throw Error("Backup exceeds the 5 MB data limit.");
  const salt = random(16),
    nonce = random(12),
    secret = await key(password, salt);
  try {
    return JSON.stringify({
      format: "profinancer-backup",
      version: 1,
      kdf: "PBKDF2-SHA256",
      iterations: ITERATIONS,
      cipher: "AES-256-GCM",
      salt: bytesToHex(salt),
      nonce: bytesToHex(nonce),
      ciphertext: bytesToHex(gcm(secret, nonce, aad).encrypt(plain)),
    });
  } finally {
    secret.fill(0);
    plain.fill(0);
  }
}
export async function decryptBackup(raw: string, password: string) {
  if (new TextEncoder().encode(raw).length > MAX)
    throw Error("Backup exceeds 10 MB.");
  const e = JSON.parse(raw);
  if (
    e.format !== "profinancer-backup" ||
    e.version !== 1 ||
    e.kdf !== "PBKDF2-SHA256" ||
    e.iterations !== ITERATIONS ||
    e.cipher !== "AES-256-GCM" ||
    typeof e.salt !== "string" ||
    !/^[a-f0-9]{32}$/.test(e.salt) ||
    typeof e.nonce !== "string" ||
    !/^[a-f0-9]{24}$/.test(e.nonce) ||
    typeof e.ciphertext !== "string" ||
    e.ciphertext.length < 32 ||
    !/^([a-f0-9]{2})+$/.test(e.ciphertext)
  )
    throw Error("Unsupported or damaged backup.");
  const secret = await key(password, hexToBytes(e.salt));
  let plain: Uint8Array | undefined;
  try {
    plain = gcm(secret, hexToBytes(e.nonce), aad).decrypt(
      hexToBytes(e.ciphertext),
    );
    return decodeLedger(bytesToUtf8(plain));
  } catch {
    throw Error("Incorrect password or damaged backup. No data was changed.");
  } finally {
    secret.fill(0);
    plain?.fill(0);
  }
}
