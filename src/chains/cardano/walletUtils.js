// chains/cardano/walletUtils.js

import { Buffer } from "buffer";
import { DFCT_POLICY_ID, DFCT_TOKEN_NAME, SUPPORTED_WALLETS, WALLET_ICONS } from './constants';
import { loadCSL } from "./loadCSL";
import { useState, useEffect } from "react"
import { fromText } from "@/lib/lucid/mod.js";
import { createLucid } from "@/chains/cardano/useLucidClient";


const enabledWallets = {};

const WALLET_DISCOVERY_TIMEOUT_MS = 8000;
const WALLET_ACTION_TIMEOUT_MS = 30000;

async function withTimeout(promise, label, timeoutMs = WALLET_DISCOVERY_TIMEOUT_MS) {
    let timeoutId;

    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(
            () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
            timeoutMs
        );
    });

    try {
        return await Promise.race([promise, timeout]);
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function enableWalletForAction(walletName) {
    const walletProvider = window.cardano?.[walletName];

    if (!walletProvider?.enable) {
        throw new Error(`${walletName} wallet provider is not available`);
    }

    if (enabledWallets[walletName]) {
        return enabledWallets[walletName];
    }

    const walletApi = await withTimeout(
        walletProvider.enable(),
        `${walletName}.enable`,
        WALLET_ACTION_TIMEOUT_MS
    );

    enabledWallets[walletName] = walletApi;
    localStorage.setItem("dfct_last_used_wallet", walletName);

    return walletApi;
}

function uniqueWalletNames(names) {
    return [...new Set(names.filter(Boolean))];
}



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
    if (typeof window === "undefined" || !window.cardano) return [];

    const availableWallets = Object.keys(window.cardano).filter((name) =>
        SUPPORTED_WALLETS.includes(name)
    );

    const sessionWalletName = user?.wallet_info?.name;
    const lastUsedWalletName = localStorage.getItem("dfct_last_used_wallet");

    const orderedWallets = uniqueWalletNames([
        sessionWalletName,
        lastUsedWalletName,
        ...availableWallets,
    ]).filter((name) => availableWallets.includes(name));

    const loadWalletSummary = async (name) => {
        const wallet = window.cardano[name];

        if (!wallet?.enable) {
            return null;
        }

        const icon = WALLET_ICONS[name];

        try {
            const isLoginWallet = sessionWalletName === name;
            const isLastUsedWallet = lastUsedWalletName === name;

            let alreadyEnabled = false;
            if (wallet.isEnabled) {
                alreadyEnabled = await withTimeout(
                    wallet.isEnabled(),
                    `${name}.isEnabled`,
                    3000
                );
            }

            // Do not call enable() on every detected extension. That can trigger
            // permission flows or hang on providers the user did not select.
            //
            // If this is the wallet used for login, render it as selectable from
            // session data and defer enable()/balance lookup until the explicit
            // submit action.
            if (!alreadyEnabled) {
                if (isLoginWallet || isLastUsedWallet) {
                    return {
                        name,
                        icon,
                        lovelace: null,
                        dfct: null,
                        displayADA: isLoginWallet ? "Login wallet" : "Last used",
                        displayDFCT: "Connect on submit",
                        enabled: true,
                        needsEnable: true,
                        isLoginWallet,
                    };
                }

                return {
                    name,
                    icon,
                    lovelace: null,
                    dfct: null,
                    displayADA: "Not connected",
                    displayDFCT: "-",
                    enabled: false,
                    isLoginWallet,
                };
            }

            const api = enabledWallets[name];

            if (api) {
                const balance = await withTimeout(
                    getWalletBalance(api),
                    `${name}.balance`
                );

                return {
                    name,
                    icon,
                    lovelace: Number(balance.lovelace),
                    dfct: Number(balance.dfct),
                    displayADA: `${(Number(balance.lovelace) / 1_000_000).toFixed(2)} ADA`,
                    displayDFCT: `${Number(balance.dfct)} DFC`,
                    enabled: true,
                    needsEnable: false,
                    isLoginWallet,
                };
            }

            return {
                name,
                icon,
                lovelace: null,
                dfct: null,
                displayADA: "Connected",
                displayDFCT: "Connect on confirm",
                enabled: true,
                needsEnable: true,
                isLoginWallet,
            };
        } catch (err) {
            console.warn(`Failed to load wallet ${name}:`, err);

            const isLoginWallet = sessionWalletName === name;
            const isLastUsedWallet = lastUsedWalletName === name;

            if (isLoginWallet || isLastUsedWallet) {
                return {
                    name,
                    icon,
                    lovelace: null,
                    dfct: null,
                    displayADA: isLoginWallet ? "Login wallet" : "Last used",
                    displayDFCT: "Connect on confirm",
                    enabled: true,
                    needsEnable: true,
                    isLoginWallet,
                    warning: err?.message || String(err),
                };
            }

            return {
                name,
                icon,
                lovelace: null,
                dfct: null,
                displayADA: "Unavailable",
                displayDFCT: "-",
                enabled: false,
                isLoginWallet: false,
                error: err?.message || String(err),
            };
        }
    };

    const results = await Promise.allSettled(
        orderedWallets.map((name) => loadWalletSummary(name))
    );

    return results
        .map((result) => result.status === "fulfilled" ? result.value : null)
        .filter(Boolean);
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
        let cancelled = false;

        const updateWallets = async () => {
            setIsLoadingWallet(true);

            try {
                const summaries = await getEnabledWalletSummaries(user);

                if (cancelled) return;

                setWalletSummaries(summaries);

                const lastUsedWalletName = localStorage.getItem("dfct_last_used_wallet");
                const fallback =
                    summaries.find((w) => w.name === sessionWalletName) ||
                    summaries.find((w) => w.name === lastUsedWalletName) ||
                    summaries.find((w) => w.enabled) ||
                    summaries[0] ||
                    null;

                setSelectedWallet(fallback);
            } catch (err) {
                console.warn("Failed to update wallet list:", err);

                if (!cancelled) {
                    setWalletSummaries([]);
                    setSelectedWallet(null);
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingWallet(false);
                }
            }
        };

        updateWallets();

        return () => {
            cancelled = true;
        };
    }, [sessionWalletName]);

    const updateSelectedWallet = (wallet) => {
        setSelectedWallet(wallet);
        localStorage.setItem("dfct_last_used_wallet", wallet?.name ?? "");
    };

    const getWalletInfoForSelected = async () => {
        if (!selectedWallet || !selectedWallet.enabled) return null;

        const walletProvider = window.cardano?.[selectedWallet.name];
        if (!walletProvider?.enable) {
            throw new Error(`${selectedWallet.name} wallet provider is not available`);
        }

        const walletApi = await enableWalletForAction(selectedWallet.name);

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


export function getWalletErrorMessage(err, walletName = "wallet") {
    const rawMessage =
        err?.info ||
        err?.message ||
        err?.code ||
        String(err || "");

    const message = String(rawMessage);

    if (
        err?.code === -3 ||
        /wallet is locked/i.test(message) ||
        /please unlock/i.test(message)
    ) {
        return `${walletName} is locked. Please unlock it and try again.`;
    }

    if (/timed out/i.test(message)) {
        return `${walletName} did not respond in time. Please unlock/open the wallet and try again.`;
    }

    return message;
}
