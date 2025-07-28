import { Modal, Button, Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import {
  getEnabledWalletSummaries,
  getWalletInfo,
} from "./../../chains/cardano/walletUtils";
import LoadingPage from "./../../LoadingPage";
import "./../../styles/Wallet.css";

function PublishTopicModal({ show, onHide, onConfirm, showToast }) {
  const { t } = useTranslation();
  const [lovelace, setLovelace] = useState(2000000);
  const [reward, setReward] = useState(1000);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletSummaries, setWalletSummaries] = useState([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const sessionWalletName = JSON.parse(localStorage.getItem("userData"))
    ?.wallet_info?.name;

  useEffect(() => {
    let intervalId;

    const updateWallets = async () => {
      const summaries = await getEnabledWalletSummaries();
      setWalletSummaries(summaries);
      setIsLoadingWallet(false);

      const current = summaries.find((w) => w.name === selectedWallet?.name);
      if (!current) {
        // fallback to previously used or first
        const lastUsed = localStorage.getItem("dfct_last_used_wallet");
        const fallback =
          summaries.find((w) => w.name === lastUsed) ||
          summaries.find((w) => w.name === sessionWalletName) ||
          summaries[0];
        setSelectedWallet(fallback || null);
      }
    };

    if (show) {
      updateWallets();
      window.addEventListener("focus", updateWallets);
      intervalId = setInterval(updateWallets, 5000);
    }

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", updateWallets);
    };
  }, [show]);

  const handleSubmit = async () => {
    try {
      setIsLoadingWallet(true);

      const walletApi = await window.cardano[selectedWallet.name].enable();
      const walletInfo = await getWalletInfo(selectedWallet.name, walletApi);

      setIsLoadingWallet(false);

      onConfirm({
        lovelace_amount: parseInt(lovelace),
        reward_amount: parseInt(reward),
        proposer_wallet_info: walletInfo,
      });

      localStorage.setItem("dfct_last_used_wallet", selectedWallet.name);
      onHide();
    } catch (err) {
      console.error("Error enabling wallet or fetching info:", err);
      showToast(t("walletEnableFailed"), "danger");
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const noWallets = walletSummaries.length === 0;
  const isValid =
    selectedWallet &&
    selectedWallet.lovelace >= lovelace &&
    selectedWallet.dfct >= reward;

  return (
    <Modal show={show} onHide={onHide} scrollable centered>
      <Modal.Header closeButton>
        <Modal.Title>{t("confirmPublishTitle")}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {isLoadingWallet ? (
          <div className="wallet-loading-container">
            <LoadingPage type="ring" />
          </div>
        ) : (
          <>
            {walletSummaries.length === 0 ? (
              <div className="no-wallet-message">{t("noWalletsFound")}</div>
            ) : (
              <>
                <h6 className="wallet-label">{t("connectedWallets")}</h6>
                <div className="wallet-selection-grid">
                  {walletSummaries.map((wallet) => (
                    <div
                      key={wallet.name}
                      className={`wallet-option ${
                        selectedWallet?.name === wallet.name ? "active" : ""
                      }`}
                      onClick={() => {
                        localStorage.setItem(
                          "dfct_last_used_wallet",
                          wallet.name
                        );
                        setSelectedWallet(wallet);
                      }}
                    >
                      {wallet.name === sessionWalletName && (
                        <FontAwesomeIcon
                          icon={faUser}
                          className="wallet-user-icon"
                          title={t("walletUsedToLogin")}
                        />
                      )}
                      <img
                        src={wallet.icon}
                        alt={wallet.name}
                        className="wallet-icon"
                      />
                      <div className="wallet-name">{wallet.name}</div>
                      <div className="wallet-balance">
                        {wallet.displayADA} / <br /> {wallet.displayDFCT}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Form>
              <Form.Group controlId="lovelaceAmount">
                <Form.Label>{t("lovelaceAmount")}</Form.Label>
                <Form.Control
                  type="number"
                  value={lovelace}
                  onChange={(e) => setLovelace(e.target.value)}
                  disabled={noWallets}
                />
                <Form.Text className="text-muted">
                  {t("lovelaceHelp")}
                </Form.Text>
              </Form.Group>

              <Form.Group controlId="rewardAmount" className="mt-3">
                <Form.Label>{t("rewardAmount")}</Form.Label>
                <Form.Control
                  type="number"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  disabled={noWallets}
                />
                <Form.Text className="text-muted">{t("rewardHelp")}</Form.Text>
              </Form.Group>
            </Form>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {t("cancel")}
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!isValid}>
          {t("confirm")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default PublishTopicModal;
