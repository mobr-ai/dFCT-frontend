import { createLucid } from "@/chains/cardano/useLucidClient";

/**
 * Build a simple ADA payment transaction for DFCT credit package checkout.
 *
 * d-FCT currently vendors a Lucid API variant where the regular address
 * payment method is tx.payTo(address, assets).
 */
export async function buildAdaPaymentTx({
  walletApi,
  paymentAddress,
  amountLovelace,
  metadata = undefined,
}) {
  if (!walletApi) {
    throw new Error("Wallet API is required.");
  }

  if (!paymentAddress) {
    throw new Error("Payment address is required.");
  }

  const lovelace = BigInt(String(amountLovelace || "0"));

  if (lovelace <= 0n) {
    throw new Error("Payment amount must be positive.");
  }

  const lucid = await createLucid();
  lucid.selectWalletFromApi(walletApi);

  let txBuilder = lucid
    .newTx()
    .payTo(paymentAddress, { lovelace });

  if (metadata && typeof txBuilder.attachMetadata === "function") {
    txBuilder = txBuilder.attachMetadata(674, metadata);
  }

  return txBuilder.commit();
}
