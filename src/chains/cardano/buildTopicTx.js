// chains/cardano/buildTopicTx.js

import { Buffer } from "buffer";
import { loadCSL } from "./loadCSL"; // memoized dynamic import of CSL
import { fetchCardanoParams } from "./fetchCardanoParams";

/**
 * Builds a topic transaction ready for signing.
 * @param {Object} args
 * @param {WalletApi} args.walletApi - CIP-30 wallet API
 * @param {string} args.outputAddress - Bech32 Plutus script address
 * @param {string} args.datumHex - Plutus datum in hex
 * @param {string} args.dfctPolicyId - Policy ID in hex
 * @param {string} args.dfctAssetName - Token name (string or bytes)
 * @param {number|string} args.dfctAmount - Token amount
 * @param {number|string} args.lovelaceAmount - Lovelace to send
 * @param {string} args.changeAddressBech32 - Bech32 base address for change
 * @param {TransactionMetadata=} args.metadata - Optional metadata
 * @returns {Uint8Array} - CBOR-encoded transaction bytes
 */
export async function buildTopicTx({
  walletApi,
  outputAddress,
  datumHex,
  dfctPolicyId,
  dfctAssetName,
  dfctAmount,
  lovelaceAmount,
  changeAddressBech32,
  metadata = undefined,
}) {
  const CSL = await loadCSL();
  const protocolParams = await fetchCardanoParams();

  // Build TransactionBuilderConfig
  const txBuilderCfg = CSL.TransactionBuilderConfigBuilder.new()
    .fee_algo(CSL.LinearFee.new(
      CSL.BigNum.from_str(protocolParams.min_fee_a.toString()),
      CSL.BigNum.from_str(protocolParams.min_fee_b.toString())
    ))
    .coins_per_utxo_byte(CSL.BigNum.from_str(protocolParams.coins_per_utxo_word.toString()))
    .pool_deposit(CSL.BigNum.from_str(protocolParams.pool_deposit.toString()))
    .key_deposit(CSL.BigNum.from_str(protocolParams.key_deposit.toString()))
    .ex_unit_prices(
      CSL.ExUnitPrices.new(
        CSL.UnitInterval.new(CSL.BigNum.from_str("577"), CSL.BigNum.from_str("10000")),
        CSL.UnitInterval.new(CSL.BigNum.from_str("721"), CSL.BigNum.from_str("10000000"))
      )
    )
    .max_value_size(parseInt(protocolParams.max_val_size.toString()))
    .max_tx_size(parseInt(protocolParams.max_tx_size.toString()))
    .build();

  const txBuilder = CSL.TransactionBuilder.new(txBuilderCfg);

  // Build transaction output to Plutus script
  const outputValue = CSL.Value.new(CSL.BigNum.from_str(lovelaceAmount.toString()));
  const multiAsset = CSL.MultiAsset.new();
  const assets = CSL.Assets.new();
  assets.insert(
    CSL.AssetName.new(Buffer.from(dfctAssetName)),
    CSL.BigNum.from_str(dfctAmount.toString())
  );
  multiAsset.insert(CSL.ScriptHash.from_bytes(Buffer.from(dfctPolicyId, "hex")), assets);
  outputValue.set_multiasset(multiAsset);

  const output = CSL.TransactionOutput.new(
    CSL.Address.from_bech32(outputAddress),
    outputValue
  );

  // Attach datum to output
  const datum = CSL.PlutusData.from_bytes(Buffer.from(datumHex, "hex"));
  output.set_plutus_data(datum);
  txBuilder.add_output(output);

  // Add UTXOs and compute fee/change via builder
  const utxosHex = await walletApi.getUtxos();
  const utxos = CSL.TransactionUnspentOutputs.new();
  utxosHex.forEach((utxoHex) => {
    utxos.add(CSL.TransactionUnspentOutput.from_bytes(Buffer.from(utxoHex, "hex")));
  });

  const changeConfig = CSL.ChangeConfig.new(CSL.Address.from_bech32(changeAddressBech32));
  txBuilder.add_inputs_from_and_change(
    utxos,
    CSL.CoinSelectionStrategyCIP2.LargestFirstMultiAsset,
    changeConfig
  );

  // Build transaction body and witnesses
  const tx = txBuilder.build_tx();

  // Attach metadata if provided
  if (metadata) {
    return CSL.Transaction.new(
      tx.body(),
      tx.witness_set(),
      metadata
    );
  }

  return tx; // Return unsigned tx (full object)
}
