/* The key of the encrypted database: 256-bit random, created at the first start, and it
   lives only in expo-secure-store (Keychain / Keystore). Never log it, never export it,
   never put it into the app state: from here it goes straight into PRAGMA key.
   requireAuthentication: false, because the app must work also without biometrics. */
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
