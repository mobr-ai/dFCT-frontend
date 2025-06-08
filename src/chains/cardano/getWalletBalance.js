import { Buffer } from "buffer";
import { loadCSL } from "./loadCSL";
import { DFCT_POLICY_ID, DFCT_TOKEN_NAME } from './constants';

export async function getWalletBalance(api) {
    const CSL = await loadCSL();
    const balanceHex = await api.getBalance();
    const value = CSL.Value.from_bytes(Buffer.from(balanceHex, "hex"));
    const lovelace = BigInt(value.coin().to_str());

    let dfct = BigInt(0);
    const multiAsset = value.multiasset();
    if (multiAsset) {
        const policy = multiAsset.get(CSL.ScriptHash.from_bytes(Buffer.from(DFCT_POLICY_ID, "hex")));
        if (policy) {
            const tokenName = CSL.AssetName.new(Buffer.from(DFCT_TOKEN_NAME, "utf8"));
            const amount = policy.get(tokenName);
            if (amount) dfct = BigInt(amount.to_str());
        }
    }

    return { lovelace, dfct };
}
