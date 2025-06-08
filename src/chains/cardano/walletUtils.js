// chains/cardano/walletUtils.js

import { Buffer } from "buffer";
import { SUPPORTED_WALLETS, WALLET_ICONS } from './constants';
import { loadCSL } from "./loadCSL";
import { getWalletBalance } from "./getWalletBalance";
const enabledWallets = {};


/**
 * Derive pub key hash from the change address (CIP-30).
 */
export async function getPubKeyHash(address) {
    const CSL = await loadCSL();
    const baseAddr = CSL.BaseAddress.from_address(address);
    const paymentCred = baseAddr.payment_cred();
    return Buffer.from(paymentCred.to_keyhash().to_bytes()).toString("hex");
}

/**
 * Extract full wallet info compatible with prov-backend.
 */
export async function getWalletInfo(walletName, walletApi) {
    const CSL = await loadCSL();
    const changeAddressHex = await walletApi.getChangeAddress();
    const addressObj = CSL.Address.from_bytes(Buffer.from(changeAddressHex, "hex"));

    return {
        name: walletName,
        address: addressObj.to_bech32(),         // bech32 format required
        raw_address: changeAddressHex,
        pub_key_hash: await getPubKeyHash(addressObj),  // fixed await
        skey: null  // should be uploaded or managed securely
    };
}

/**
 * List available wallets along with their name, icon, ADA and DFC balances, and enabled status.
 */
export async function getEnabledWalletSummaries() {
    const summaries = [];

    if (typeof window === "undefined" || !window.cardano) return summaries;

    const available = Object.keys(window.cardano).filter((key) =>
        SUPPORTED_WALLETS.includes(key)
    );

    for (const name of available) {
        const wallet = window.cardano[name];
        if (!wallet?.enable) continue;

        try {
            if (!enabledWallets[name]) {
                enabledWallets[name] = await wallet.enable();
            }
            const api = enabledWallets[name];
            const balance = await getWalletBalance(api)

            summaries.push({
                name,
                icon: WALLET_ICONS[name],
                lovelace: parseInt(balance.lovelace),
                dfct: parseInt(balance.dfct),
                displayADA: `${(Number(balance.lovelace) / 1_000_000).toFixed(2)} ADA`,
                displayDFCT: `${balance.dfct} DFC`,
                enabled: true,
            });
        } catch (err) {
            console.warn(`Failed to load wallet ${name}:`, err);
            summaries.push({
                name,
                icon: WALLET_ICONS[name],
                lovelace: null,
                dfct: null,
                displayADA: "Error",
                displayDFCT: "-",
                enabled: false,
            });
        }
    }

    return summaries;
}