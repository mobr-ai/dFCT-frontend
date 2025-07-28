// chains/cardano/walletUtils.js

import { Buffer } from "buffer";
import { DFCT_POLICY_ID, DFCT_TOKEN_NAME, SUPPORTED_WALLETS, WALLET_ICONS } from './constants';
import { loadCSL } from "./loadCSL";
import { useState, useEffect } from "react"
import { fromText } from "@/lib/lucid/mod.js";
import { createLucid } from "@/chains/cardano/useLucidClient";


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
        wallet_api: walletApi,
        address: addressObj.to_bech32(),         // bech32 format required
        raw_address: changeAddressHex,
        pub_key_hash: await getPubKeyHash(addressObj),  // fixed await
        skey: null  // should be uploaded or managed securely
    };
}

/**
 * List available wallets along with their name, icon, ADA and DFC balances, and enabled status.
 */
export async function getEnabledWalletSummaries(user = null) {
    const summaries = [];

    if (typeof window === "undefined" || !window.cardano) return summaries;

    const available = Object.keys(window.cardano).filter((key) =>
        SUPPORTED_WALLETS.includes(key)
    );

    const sessionWalletName = user?.wallet_info?.name;

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
                isLoginWallet: sessionWalletName === name  // ✅ NEW FIELD
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
                isLoginWallet: false
            });
        }
    }

    return summaries;
}


/**
 * Provides session-aware wallet utilities:
 * - loads available wallets
 * - picks last used or login wallet by default
 * - helper to change & persist selection
 */
export function getSessionWalletHandlers(user = null) {
    const sessionWalletName = user?.wallet_info?.name;
    const [walletSummaries, setWalletSummaries] = useState([]);
    const [selectedWallet, setSelectedWallet] = useState(null);
    const [isLoadingWallet, setIsLoadingWallet] = useState(true);

    useEffect(() => {
        const updateWallets = async () => {
            const summaries = await getEnabledWalletSummaries(user);
            setWalletSummaries(summaries);
            setIsLoadingWallet(false);

            const lastUsed = localStorage.getItem("dfct_last_used_wallet");
            const fallback =
                summaries.find((w) => w.name === lastUsed) ||
                summaries.find((w) => w.name === sessionWalletName) ||
                summaries[0];
            setSelectedWallet(fallback || null);
        };

        updateWallets();
    }, [sessionWalletName]);

    const updateSelectedWallet = (wallet) => {
        setSelectedWallet(wallet);
        localStorage.setItem("dfct_last_used_wallet", wallet?.name ?? "");
    };

    const getWalletInfoForSelected = async () => {
        if (!selectedWallet) return null;
        const walletApi = await window.cardano[selectedWallet.name].enable();
        return await getWalletInfo(selectedWallet.name, walletApi);
    };

    return {
        walletSummaries,
        selectedWallet,
        updateSelectedWallet,
        getWalletInfoForSelected,
        isLoadingWallet,
    };
}


/**
 * Checks whether wallet has enough ADA to cover estimated fee.
 * Assumes `lucid.selectWalletFromApi()` has already been called.
 */
export async function checkWalletHasSufficientFeeFunds({ lucid, walletApi, buildTxFn }) {
    try {
        const tx = await buildTxFn(lucid);
        const estimatedFee = tx.body?.fee ?? 167569n; // fallback if missing

        const utxos = await lucid.wallet.getUtxos();
        const walletAda = utxos.reduce(
            (sum, utxo) => sum + (utxo.assets.lovelace ?? 0n),
            0n
        );

        const requiredAda = estimatedFee + 2_000_000n; // includes dummy datum output

        return {
            isEnough: walletAda >= requiredAda,
            walletAda,
            requiredAda,
            estimatedFee,
        };
    } catch (err) {
        console.warn(`[checkWalletHasSufficientFeeFunds] Failed:`, err);
        return {
            isEnough: false,
            walletAda: 0n,
            requiredAda: 0n,
            estimatedFee: 167569n,
            error: err,
        };
    }
}


export async function getWalletBalance(walletApi) {
    const lucid = await createLucid();
    await lucid.selectWalletFromApi(walletApi);

    const utxos = await lucid.wallet.getUtxos();

    let lovelace = 0n;
    let dfct = 0n;

    for (const utxo of utxos) {
        const assets = utxo.assets;

        for (const unit in assets) {
            const amount = assets[unit];

            if (unit === "lovelace") {
                lovelace += amount;
            } else if (unit === `${DFCT_POLICY_ID}${fromText(DFCT_TOKEN_NAME)}`) {
                dfct += amount;
            }
        }
    }

    return { lovelace, dfct };
}
