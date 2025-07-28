// src/chains/cardano/signAndSubmitTx.js

import { createLucid } from "@/chains/cardano/useLucidClient";


/**
 * Signs and submits a Cardano transaction using Lucid.
 */
export async function signAndSubmitTx(tx, walletApi) {
  const lucid = await createLucid();
  lucid.selectWalletFromApi(walletApi);

  const signedTx = await tx.sign().commit();
  const txHash = await signedTx.submit();


  return txHash;
}