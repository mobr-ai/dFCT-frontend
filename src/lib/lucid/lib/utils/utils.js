import { decodeHex, encodeHex } from "../../deps/jsr.io/@std/encoding/1.0.5/hex.js";
import { Addresses, Data, Utils, } from "../mod.js";
import { crc8 } from "../misc/crc8.js";
export function fromHex(hex) {
    return decodeHex(hex);
}
export function toHex(bytes) {
    return encodeHex(bytes);
}
/** Convert a Hex encoded string to a Utf-8 encoded string. */
export function toText(hex) {
    return new TextDecoder().decode(fromHex(hex));
}
/** Convert a Utf-8 encoded string to a Hex encoded string. */
export function fromText(text) {
    return toHex(new TextEncoder().encode(text));
}
/** Padded number in Hex. */
function checksum(num) {
    return crc8(fromHex(num)).toString(16).padStart(2, "0");
}
export function toLabel(num) {
    if (num < 0 || num > 65535) {
        throw new Error(`Label ${num} out of range: min label 1 - max label 65535.`);
    }
    const numHex = num.toString(16).padStart(4, "0");
    return "0" + numHex + checksum(numHex) + "0";
}
export function fromLabel(label) {
    if (label.length !== 8 || !(label[0] === "0" && label[7] === "0")) {
        return null;
    }
    const numHex = label.slice(1, 5);
    const num = parseInt(numHex, 16);
    const check = label.slice(5, 7);
    return check === checksum(numHex) ? num : null;
}
/**
 * @param name Hex encoded
 */
export function toUnit(policyId, name, label) {
    const hexLabel = Number.isInteger(label) ? toLabel(label) : "";
    const n = name ? name : "";
    if ((n + hexLabel).length > 64) {
        throw new Error("Asset name size exceeds 32 bytes.");
    }
    if (policyId.length !== 56) {
        throw new Error(`Policy id invalid: ${policyId}.`);
    }
    return policyId + hexLabel + n;
}
/**
 * Splits unit into policy id, asset name (entire asset name), name (asset name without label) and label if applicable.
 * name will be returned in Hex.
 */
export function fromUnit(unit) {
    const policyId = unit.slice(0, 56);
    const assetName = unit.slice(56) || null;
    const label = fromLabel(unit.slice(56, 64));
    const name = (() => {
        const hexName = Number.isInteger(label) ? unit.slice(64) : unit.slice(56);
        return hexName || null;
    })();
    return { policyId, assetName, name, label };
}
export function applyParamsToScript(params, plutusScript, type) {
    const p = Data.to(type
        ? Data.castTo(params, (type instanceof Array ? Data.Tuple(type) : type))
        : params);
    return Utils.applyParamsToScript(p, plutusScript);
}
export function addAssets(...assets) {
    return assets.reduce((a, b) => {
        for (const k in b) {
            if (Object.hasOwn(b, k)) {
                a[k] = (a[k] || 0n) + b[k];
            }
        }
        return a;
    }, {});
}
export function paymentCredentialOf(address) {
    const { payment } = Addresses.inspect(address);
    if (!payment) {
        throw new Error("The specified address does not contain a payment credential.");
    }
    return payment;
}
export function stakeCredentialOf(address) {
    const { delegation } = Addresses.inspect(address);
    if (!delegation) {
        throw new Error("The specified address does not contain a stake credential.");
    }
    return delegation;
}
