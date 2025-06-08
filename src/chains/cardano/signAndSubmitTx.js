import { Buffer } from "buffer";
import { loadCSL } from "./loadCSL";

/**
 * Signs and submits a Cardano transaction using the CIP-30 wallet API.
 * @param {Transaction} tx - Unsigned CSL.Transaction object.
 * @param {WalletApi} walletApi - CIP-30 wallet API.
 * @param {TransactionMetadata=} metadata - Optional metadata.
 * @returns {Promise<string>} - Transaction hash.
 */
export async function signAndSubmitTx(tx, walletApi, metadata = null) {
    const CSL = await loadCSL();

    // 1. Serialize unsigned tx to hex
    const txHex = Buffer.from(tx.to_bytes()).toString("hex");

    // 2. Sign (returns TransactionWitnessSet as hex)
    const witnessSetHex = await walletApi.signTx(txHex, true);
    const witnessSet = CSL.TransactionWitnessSet.from_bytes(Buffer.from(witnessSetHex, "hex"));

    // 3. Assemble final signed transaction
    const finalTx = CSL.Transaction.new(tx.body(), witnessSet, metadata ?? undefined);

    // 4. Submit
    const fullTxHex = Buffer.from(finalTx.to_bytes()).toString("hex");
    return await walletApi.submitTx(fullTxHex);
}
