import { GOV_SCRIPT_CBOR_HEX } from "./governanceScriptHex.js";
import { Data } from "@/lib/lucid/mod.js";


/**
 * Ensure the hex string is valid (lowercase, trimmed, even-length).
 * Pads with leading zero if needed.
 */
function safeHex(hex) {
    if (typeof hex !== "string") throw new Error("Expected hex string for redeemer");
    hex = hex.trim().toLowerCase();
    if (!/^[0-9a-f]+$/.test(hex)) throw new Error("Invalid hex format in redeemer: " + hex);
    return hex.length % 2 === 1 ? "0" + hex : hex;
}

/**
 * Build a governance proposal update transaction using Lucid.
 * Expects the UTxO that originated the proposal and redeemer logic.
 */
export async function buildProposalUpdateTx({
    lucid,                   // already initialized and wallet bound
    walletApi,               // from enable()
    proposalInputUtxo,       // UTxO from the governance proposal
    updatedDatum,            // PlutusData object
    redeemerPlutusData,      // Lucid-compatible redeemer (Data.to(Constr))
    outputAddress,           // should be GOV_SCRIPT_ADDRESS,
    ownerPkh                 // proposal owner PKH
}) {
    // bind wallet
    lucid.selectWalletFromApi(walletApi);

    // Validate input structure
    if (
        !proposalInputUtxo?.txHash ||
        proposalInputUtxo.outputIndex === undefined ||
        !proposalInputUtxo.assets ||
        !proposalInputUtxo.datum
    ) {
        throw new Error("Invalid proposalInputUtxo provided to buildProposalUpdateTx");
    }

    const rawScript = {
        type: "PlutusV3",
        script: GOV_SCRIPT_CBOR_HEX,
    };

    console.log("payToContract params:");
    console.log(" - address =", outputAddress);
    console.log(` - proposalInputUtxo:`);
    console.dir(proposalInputUtxo, { depth: null, colors: true });
    console.log(` - Data.from(proposalInputUtxo.datum) = (${Data.from(proposalInputUtxo.datum)}) type = ${typeof (Data.from(proposalInputUtxo.datum))}`);
    console.dir(Data.from(proposalInputUtxo.datum), { depth: null, colors: true });
    console.log(` - updatedDatum = ${updatedDatum} type = ${typeof updatedDatum}`);
    console.log(` - Data.to(updatedDatum) = ${Data.to(updatedDatum)} type = ${typeof Data.to(updatedDatum)}`);
    console.log(` - redeemerPlutusData (${typeof redeemerPlutusData}) = ${redeemerPlutusData}`);
    console.log(` - safeHex(redeemerPlutusData) (${typeof safeHex(redeemerPlutusData)}) = ${safeHex(redeemerPlutusData)}`);

    // Build the TX
    const tx = await lucid
        .newTx()
        .addSigner(ownerPkh)
        // Attach the spending input from script with redeemer
        .collectFrom(
            [
                {
                    txHash: proposalInputUtxo.txHash,
                    outputIndex: proposalInputUtxo.outputIndex,
                    assets: proposalInputUtxo.assets,
                    address: proposalInputUtxo.address,
                    datum: proposalInputUtxo.datum,
                },
            ],
            safeHex(redeemerPlutusData)
        )
        // Send back to same script address with updated inline datum
        .payToContract(
            outputAddress,
            {
                Inline: Data.to(updatedDatum),
            },
            proposalInputUtxo.assets,
            // { lovelace: BigInt(proposalInputUtxo.assets['lovelace']) }

        )
        .attachScript(rawScript)
        .commit();

    return tx;
}
