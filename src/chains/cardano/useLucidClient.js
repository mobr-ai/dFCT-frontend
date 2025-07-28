// src/chains/cardano/useLucidClient.js

import { Lucid, Blockfrost } from "@/lib/lucid/mod.js";
import { BLOCKFROST_API_KEY, BLOCKFROST_API_URL } from './constants';

/**
 * Create Lucid instance with custom protocol provider
 */
export async function createLucid() {
  const lucid = new Lucid({
    provider: new Blockfrost(
      BLOCKFROST_API_URL,
      BLOCKFROST_API_KEY,
    ),
  });

  return lucid;
}