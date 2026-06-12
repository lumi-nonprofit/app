/* Klíč šifrované databáze: 256bit náhodný, vzniká při prvním spuštění a žije
   výhradně v expo-secure-store (Keychain / Keystore). Nikdy ho nelogovat,
   neexportovat ani nedávat do stavu aplikace — odsud jde rovnou do PRAGMA key.
   requireAuthentication: false — appka musí fungovat i bez biometriky. */
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const DB_KEY_NAME = "lumi-db-key-v1";

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export async function getOrCreateDbKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DB_KEY_NAME);
  if (existing) return existing;
  const key = toHex(await Crypto.getRandomBytesAsync(32));
  await SecureStore.setItemAsync(DB_KEY_NAME, key, { requireAuthentication: false });
  return key;
}
