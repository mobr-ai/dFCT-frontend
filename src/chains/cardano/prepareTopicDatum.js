// chains/cardano/prepareTopicDatum.js

import { Buffer } from "buffer";
import { loadCSL } from "./loadCSL";

/**
 * Prepares PlutusData for on-chain datum and MetadataMap for transaction metadata.
 * @param {Object} params
 * @param {string} params.topicId - topic identifier (UTF-8 or hex)
 * @param {string} params.proposerPubKeyHash - 28-byte hex string
 * @param {number|string} params.lovelaceAmount - ADA in lovelace
 * @param {number|string} params.dfctAmount - DFC token amount
 * @param {string} [params.comment] - Optional comment string
 * @param {string[]} [params.tags] - Optional array of text tags
 * @returns {{ datumHex: string, metadataMap: CSL.MetadataMap }}
 */
export async function prepareTopicDatum({
    topicId,
    proposerPubKeyHash,
    lovelaceAmount,
    dfctAmount,
    comment = "",
    tags = [],
}) {
    const CSL = await loadCSL();

    // Create PlutusData for datum
    const topicBytes = CSL.PlutusData.new_bytes(
        Buffer.from(topicId, isHex(topicId) ? "hex" : "utf8")
    );
    const proposerBytes = CSL.PlutusData.new_bytes(Buffer.from(proposerPubKeyHash, "hex"));
    const lovelaceData = CSL.PlutusData.new_integer(CSL.BigInt.from_str(String(lovelaceAmount)));
    const dfctData = CSL.PlutusData.new_integer(CSL.BigInt.from_str(String(dfctAmount)));

    const fields = CSL.PlutusList.new();
    fields.add(topicBytes);
    fields.add(proposerBytes);
    fields.add(lovelaceData);
    fields.add(dfctData);

    const datum = CSL.PlutusData.new_constr_plutus_data(
        CSL.ConstrPlutusData.new(CSL.BigNum.from_str("0"), fields)
    );
    const datumHex = Buffer.from(datum.to_bytes()).toString("hex");

    // Construct metadata map
    const metadataMap = CSL.MetadataMap.new();
    metadataMap.insert(
        CSL.TransactionMetadatum.new_text("topic_id"),
        CSL.TransactionMetadatum.new_text(topicId)
    );
    metadataMap.insert(
        CSL.TransactionMetadatum.new_text("proposer"),
        CSL.TransactionMetadatum.new_bytes(Buffer.from(proposerPubKeyHash, "hex"))
    );
    metadataMap.insert(
        CSL.TransactionMetadatum.new_text("comment"),
        CSL.TransactionMetadatum.new_text(comment.slice(0, 64))
    );

    const tagList = CSL.MetadataList.new();
    tags.slice(0, 10).forEach((tag) => {
        tagList.add(CSL.TransactionMetadatum.new_text(tag.slice(0, 64)));
    });

    metadataMap.insert(CSL.TransactionMetadatum.new_text("tags"), CSL.TransactionMetadatum.new_list(tagList));

    return { datumHex, metadataMap };
}

function isHex(str) {
    return /^[0-9a-fA-F]+$/.test(str);
}
