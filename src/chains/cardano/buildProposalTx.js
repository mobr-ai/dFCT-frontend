import { createLucid } from "@/chains/cardano/useLucidClient";

/**
 * Build a governance proposal TX using Lucid.
 * Used to submit a new proposal UTxO to the governance script.
 */
export async function buildProposalTx({
    walletApi,
    outputAddress,
    datum,              // PlutusData object
    lovelaceAmount,
    metadata = undefined,
}) {
    const lucid = await createLucid();
    lucid.selectWalletFromApi(walletApi);

    let txBuilder = lucid
        .newTx()
        .payToContract(
            outputAddress,
            { Inline: datum },                   // use as Inline datum
            { lovelace: BigInt(lovelaceAmount) }
        );

    if (metadata) {
        txBuilder = txBuilder.attachMetadata(0, metadata);
    }

    const tx = await txBuilder.commit();
    return tx;
}
