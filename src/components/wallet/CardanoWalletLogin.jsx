import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import Button from "react-bootstrap/Button";
import "../../styles/AuthPage.css";
import { getWalletInfo } from "../../chains/cardano/walletUtils";
import {
  SUPPORTED_WALLETS,
  WALLET_ICONS,
} from "../../chains/cardano/constants";

function CardanoWalletLogin({
  onLogin,
  showToast,
  rememberMe = false,
}) {
  const { t } = useTranslation();
  const [availableWallets, setAvailableWallets] = useState([]);

  useEffect(() => {
    const wallets = SUPPORTED_WALLETS.filter(
      (w) => window.cardano && window.cardano[w]
    );
    setAvailableWallets(wallets);
  }, []);

  const textToHex = (text) =>
    Array.from(new TextEncoder().encode(text))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

  const readJsonOrThrow = async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || response.statusText || "Cardano auth failed");
    }
    return data;
  };

  const handleConnect = async (walletName) => {
    try {
      const walletApi = await window.cardano[walletName].enable();

      if (!walletApi?.signData) {
        throw new Error("Selected wallet does not support CIP-30 signData");
      }

      const walletInfo = await getWalletInfo(walletName, walletApi);

      const challenge = await readJsonOrThrow(
        await fetch("/api/auth/cardano/challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletInfo.address,
            raw_address: walletInfo.raw_address,
            wallet_name: walletName,
          }),
        })
      );

      const signed = await walletApi.signData(
        walletInfo.raw_address,
        textToHex(challenge.message)
      );

      const data = await readJsonOrThrow(
        await fetch("/api/auth/cardano/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletInfo.address,
            raw_address: walletInfo.raw_address,
            wallet_name: walletName,
            message: challenge.message,
            challenge_token: challenge.challenge_token,
            signature: signed.signature,
            key: signed.key,
            remember_me: rememberMe,
          }),
        })
      );

      localStorage.setItem("dfct_last_used_wallet", walletName);

      if (onLogin) onLogin({ ...data, wallet_info: walletInfo });
    } catch (err) {
      console.error("Cardano Auth Error:", err);
      if (showToast) showToast(t("loginError"), "danger");
    }
  };

  return (
    <div className="Auth-oauth-wallets">
      {availableWallets.length > 0 ? (
        (
          <div
            style={{
              marginBottom: "0.5rem",
              fontFamily: "monospace",
              color: "gray",
            }}
          >
            {t("loginWithWallet")}
          </div>
        ) &&
        availableWallets.map((wallet) => (
          <Button
            key={wallet}
            variant="outline-secondary"
            size="md"
            onClick={() => handleConnect(wallet)}
            className="Auth-oauth-button"
          >
            <img
              src={WALLET_ICONS[wallet]}
              alt={wallet}
              className="Auth-oauth-logo"
            />
            {t("connectWallet", { wallet })}
          </Button>
        ))
      ) : (
        <div style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
          <Trans
            i18nKey="walletNotFound"
            components={{
              nami: (
                <a
                  className="Auth-wallet-link"
                  href="https://namiwallet.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ),
              lace: (
                <a
                  className="Auth-wallet-link"
                  href="https://lace.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ),
              eternl: (
                <a
                  className="Auth-wallet-link"
                  href="https://eternl.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ),
            }}
          />
        </div>
      )}
    </div>
  );
}

export default CardanoWalletLogin;
