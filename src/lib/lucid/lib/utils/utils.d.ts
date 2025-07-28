import { type Assets, type Credential, Data, type Exact } from "../mod.js";
export declare function fromHex(hex: string): Uint8Array;
export declare function toHex(bytes: Uint8Array): string;
/** Convert a Hex encoded string to a Utf-8 encoded string. */
export declare function toText(hex: string): string;
/** Convert a Utf-8 encoded string to a Hex encoded string. */
export declare function fromText(text: string): string;
export declare function toLabel(num: number): string;
export declare function fromLabel(label: string): number | null;
/**
 * @param name Hex encoded
 */
export declare function toUnit(policyId: string, name?: string | null, label?: number | null): string;
/**
 * Splits unit into policy id, asset name (entire asset name), name (asset name without label) and label if applicable.
 * name will be returned in Hex.
 */
export declare function fromUnit(unit: string): {
    policyId: string;
    assetName: string | null;
    name: string | null;
    label: number | null;
};
export declare function applyParamsToScript<T extends unknown[] = Data[]>(params: Exact<[...T]>, plutusScript: string, type?: T): string;
export declare function addAssets(...assets: Assets[]): Assets;
export declare function paymentCredentialOf(address: string): Credential;
export declare function stakeCredentialOf(address: string): Credential;
