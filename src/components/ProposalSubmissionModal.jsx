import React, { useState, useEffect } from "react";

import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  Card,
  InputGroup,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLink,
  faCalendar,
  faHeading,
  faFileAlt,
  faUserLock,
  faCoins,
  faPlus,
  faTrash,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { paymentCredentialOf } from "@/lib/lucid/mod.js";
import { createLucid } from "../chains/cardano/useLucidClient";
import {
  checkWalletHasSufficientFeeFunds,
  getSessionWalletHandlers,
} from "./../chains/cardano/walletUtils";
import { prepareProposalDatum } from "./../chains/cardano/prepareProposalDatum";
import { buildProposalTx } from "./../chains/cardano/buildProposalTx";
import { signAndSubmitTx } from "./../chains/cardano/signAndSubmitTx";
import { GOV_SCRIPT_ADDRESS } from "./../chains/cardano/constants";
import { useAuthRequest } from "../hooks/useAuthRequest";
import LoadingPage from "./../LoadingPage";
import "./../styles/ProposalSubmissionModal.css";
import "./../styles/Wallet.css";

export default function ProposalSubmissionModal({
  user,
  show,
  onHide,
  onSubmitted,
  showToast,
}) {
  const { t } = useTranslation();
  const { authRequest } = useAuthRequest(user);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discussionUrl, setDiscussionUrl] = useState("");
  const [votingStart, setVotingStart] = useState("");
  const [votingEnd, setVotingEnd] = useState("");
  const [endManuallySet, setEndManuallySet] = useState(false);
  const [minVotingTokens, setMinVotingTokens] = useState(Number(5000));
  const [newPKH, setNewPKH] = useState("");
  const [authorizedPKHs, setAuthorizedPKHs] = useState([]);
  const [lovelaceAmount, setLovelaceAmount] = useState(); // placeholder fee
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({});

  const {
    walletSummaries,
    selectedWallet,
    updateSelectedWallet,
    getWalletInfoForSelected,
    isLoadingWallet,
  } = getSessionWalletHandlers(user);

  const markProposalSync = (proposalId) =>
    sessionStorage.setItem(`dfct_proposal_syncing_${proposalId}`, "1");
  const clearProposalSync = (proposalId) =>
    sessionStorage.removeItem(`dfct_proposal_syncing_${proposalId}`);

  const handleTouched = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleAddPKH = () => {
    const isHex = (str) =>
      typeof str === "string" &&
      /^[0-9a-fA-F]+$/.test(str) &&
      str.length % 2 === 0;

    const trimmed = newPKH.trim();
    if (!isHex(trimmed)) {
      showToast(t("invalidHexFormat"), "danger");
      return;
    }
    if (trimmed && !authorizedPKHs.includes(trimmed)) {
      setAuthorizedPKHs((prev) => [...prev, trimmed]);
      setNewPKH("");
    }
  };

  const handleRemovePKH = (pkh) => {
    setAuthorizedPKHs((prev) => prev.filter((item) => item !== pkh));
  };

  const pollProposalStatus = async (proposalId) => {
    const maxAttempts = 24;
    const delayMs = 10000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      try {
        const statusRes = await authRequest.get(
          `/api/proposal/${proposalId}/status`
        );
        const proposal = statusRes.body;
        if (proposal?.status && proposal.status !== 5) {
          onSubmitted(proposal);
          clearProposalSync(proposalId);
          return true;
        }
      } catch (err) {
        console.warn(`Polling attempt ${attempt + 1} failed`, err);
      }
    }
    showToast(t("statusSyncTimeout"), "secondary");
    return false;
  };

  const handleSubmit = async () => {
    // === Validate form ===
    setTouched({
      title: true,
      description: true,
      votingStart: true,
      votingEnd: true,
    });

    if (!title || !description || !votingStart || !votingEnd) {
      setError(t("fillAllRequiredFields"));
      return;
    }

    if (votingEnd <= votingStart) {
      setError(t("endAfterStart"));
      return;
    }

    if (!selectedWallet) {
      setError(t("selectWallet"));
      return;
    }

    setIsSubmitting(true);

    try {
      // === Prepare proposal input ===
      const lucid = await createLucid();
      const walletApi = await window.cardano[selectedWallet.name].enable();
      await lucid.selectWalletFromApi(walletApi);
      const walletAddr = await lucid.wallet.address();
      const walletPKH = paymentCredentialOf(walletAddr).hash;
      const walletInfo = await getWalletInfoForSelected();
      const proposalId = `p${Date.now()}`;
      const votingStartMs = new Date(votingStart).getTime();
      const votingEndMs = new Date(votingEnd).getTime();

      let authorizedDict = {};
      authorizedDict[walletInfo.pub_key_hash] = 1; // Add owner to authorize

      authorizedPKHs.forEach((pkh) => {
        authorizedDict[pkh] = 1;
      });

      // === Generate datum and metadata ===
      const { datum, metadata } = await prepareProposalDatum({
        proposalId: proposalId,
        proposerPubKeyHash: walletPKH,
        ownerPubKeyHash: walletPKH,
        votingStart: votingStartMs,
        votingEnd: votingEndMs,
        minVotingTokens: BigInt(Number(minVotingTokens)),
        authorizedPKHs: authorizedDict,
      });

      // === Build & Submit transaction ===

      const tx = await buildProposalTx({
        walletApi,
        outputAddress: GOV_SCRIPT_ADDRESS,
        datum,
        lovelaceAmount,
        metadata,
      });

      const txHash = await signAndSubmitTx(tx, walletApi);

      showToast(t("proposalSubmitted"), "secondary");

      // === Notify backend ===
      await authRequest.post("/api/validate_gov_tx").send({
        proposal_id: proposalId,
        submitted_by: user.id,
        owner_address: walletInfo.address,
        owner_pkh: walletInfo.pub_key_hash,
        proposer_pkh: walletInfo.pub_key_hash,
        transaction_hash: txHash,
        title,
        description,
        discussion_url: discussionUrl,
        proposal_metadata: metadata || "{}",
        lovelace_amount: lovelaceAmount,
        voting_start: votingStartMs,
        voting_end: votingEndMs,
        min_voting_tokens: minVotingTokens,
        authorized_pkhs: authorizedDict,
      });

      // === UI optimistic update ===
      const optimisticDraft = {
        proposal_id: proposalId,
        status: 5, // Proposed
        owner_address: walletInfo.address,
        title,
        description,
        discussion_url: discussionUrl,
        created_at: new Date().toISOString(),
        voting_start: votingStart,
        voting_end: votingEnd,
      };

      onSubmitted(optimisticDraft);
      markProposalSync(proposalId);
      pollProposalStatus(proposalId);
      onHide();
    } catch (err) {
      console.error("Proposal submission failed:", err);
      showToast(t("proposalSubmissionFailed"), "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!touched.votingStart) {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const formatDatetime = (dt) => dt.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

      setVotingStart(formatDatetime(now));
      setVotingEnd(formatDatetime(in24h));
    }

    const estimateFee = async () => {
      if (
        !selectedWallet ||
        !title ||
        !description ||
        !votingStart ||
        !votingEnd
      )
        return;

      try {
        const walletInfo = await getWalletInfoForSelected();
        console.log("walletInfo.pub_key_hash: ", walletInfo.pub_key_hash);
        console.log("typeof pub_key_hash:", typeof walletInfo.pub_key_hash); // string

        const lucid = await createLucid();
        await lucid.selectWalletFromApi(walletInfo.wallet_api);

        const authorizedDict = {};
        authorizedDict[walletInfo.pub_key_hash] = 1; // Add owner to authorized

        authorizedPKHs.forEach((pkh) => {
          authorizedDict[pkh] = 1;
        });

        let datum, metadata;
        try {
          ({ datum, metadata } = await prepareProposalDatum({
            proposalId: `p${Date.now()}`,
            proposerPubKeyHash: walletInfo.pub_key_hash,
            ownerPubKeyHash: walletInfo.pub_key_hash,
            votingStart: new Date(votingStart).getTime(),
            votingEnd: new Date(votingEnd).getTime(),
            minVotingTokens: BigInt(Number(minVotingTokens)),
            authorizedPKHs: authorizedDict,
          }));
        } catch (err) {
          console.error("Datum prep error (fee estimation):", err);
          setError(t("errorEstimatingFee") + `: (${err.message})`);
          return;
        }

        const { isEnough, walletAda, requiredAda, estimatedFee } =
          await checkWalletHasSufficientFeeFunds({
            lucid,
            walletApi: walletInfo.wallet_api,
            buildTxFn: async (lucid) =>
              await lucid
                .newTx()
                .payToContract(
                  GOV_SCRIPT_ADDRESS,
                  { Inline: datum },
                  { lovelace: 2_000_000n }
                )
                .attachMetadata(674, metadata[674])
                .commit(),
          });

        setLovelaceAmount(Number(estimatedFee || 167569n));

        if (!isEnough) {
          setError(
            t("insufficientBalanceForFee", {
              requiredAda: Number(requiredAda) / 1_000_000,
            })
          );
        } else {
          setError("");
        }
      } catch (err) {
        console.error("Fee estimation failed:", err);
        setError(t("errorEstimatingFee") + `: (${err.message})`);
      }
    };

    estimateFee();
  }, [
    title,
    description,
    votingStart,
    votingEnd,
    selectedWallet,
    minVotingTokens,
  ]);

  useEffect(() => {
    if (!endManuallySet && votingStart) {
      const start = new Date(votingStart);
      const in24h = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      setVotingEnd(in24h.toISOString().slice(0, 16));
    }
  }, [votingStart]);

  useEffect(() => {
    if (show) {
      setEndManuallySet(false);
    }
  }, [show]);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{t("submitNewProposal")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Card className="ProposalCardInput mb-3">
          <Card.Body>
            <Form.Group controlId="proposalTitle">
              <Form.Label>
                <FontAwesomeIcon icon={faHeading} /> {t("title")}
              </Form.Label>
              <Form.Control
                type="text"
                placeholder={t("enterTitle")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => handleTouched("title")}
                isInvalid={touched.title && !title}
              />
            </Form.Group>
          </Card.Body>
        </Card>

        <Card className="ProposalCardInput mb-3">
          <Card.Body>
            <Form.Group controlId="proposalDescription">
              <Form.Label>
                <FontAwesomeIcon icon={faFileAlt} /> {t("description")}
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder={t("enterDescription")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => handleTouched("description")}
                isInvalid={touched.description && !description}
              />
            </Form.Group>
          </Card.Body>
        </Card>

        <Card className="ProposalCardInput mb-3">
          <Card.Body>
            <Form.Group controlId="proposalUrl">
              <Form.Label>
                <FontAwesomeIcon icon={faLink} /> {t("discussionUrl")}{" "}
                <span className="text-muted">({t("optional")})</span>
              </Form.Label>
              <Form.Control
                type="url"
                placeholder="https://..."
                value={discussionUrl}
                onChange={(e) => setDiscussionUrl(e.target.value)}
              />
            </Form.Group>
          </Card.Body>
        </Card>

        <Card className="ProposalCardInput mb-3">
          <Card.Body>
            <Form.Label>
              <FontAwesomeIcon icon={faCoins} /> {t("minVotingTokens")}
            </Form.Label>
            <InputGroup>
              <Form.Control
                type="number"
                value={minVotingTokens}
                onChange={(e) => setMinVotingTokens(Number(e.target.value))}
                min={0}
              />
            </InputGroup>
            <Form.Range
              value={minVotingTokens}
              onChange={(e) => setMinVotingTokens(Number(e.target.value))}
              min={0}
              max={10000}
            />
          </Card.Body>
        </Card>

        <Card className="ProposalCardInput mb-3">
          <Card.Body>
            <Form.Label>
              <FontAwesomeIcon icon={faUserLock} /> {t("authorizedPKHs")}
            </Form.Label>
            <InputGroup className="mb-2">
              <Form.Control
                type="text"
                placeholder={t("enterPKH")}
                value={newPKH}
                onChange={(e) => setNewPKH(e.target.value)}
              />
              <Button variant="dark" onClick={handleAddPKH}>
                <FontAwesomeIcon icon={faPlus} /> {t("add")}
              </Button>
            </InputGroup>
            {authorizedPKHs.map((pkh) => (
              <Card
                key={pkh}
                className="mb-2 p-2 d-flex flex-row justify-content-between align-items-center"
              >
                <span>{pkh}</span>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleRemovePKH(pkh)}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </Button>
              </Card>
            ))}
          </Card.Body>
        </Card>

        <Card className="ProposalCardInput">
          <Card.Body>
            <Row>
              <Col>
                <Form.Group controlId="votingStart">
                  <Form.Label>
                    <FontAwesomeIcon icon={faCalendar} /> {t("votingStart")}
                  </Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={votingStart}
                    onChange={(e) => {
                      setVotingStart(e.target.value);
                      handleTouched("votingStart");
                    }}
                    onBlur={() => handleTouched("votingStart")}
                    isInvalid={touched.votingStart && !votingStart}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group controlId="votingEnd">
                  <Form.Label>
                    <FontAwesomeIcon icon={faCalendar} /> {t("votingEnd")}
                  </Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={votingEnd}
                    onChange={(e) => {
                      setVotingEnd(e.target.value);
                      setEndManuallySet(true); // user set it manually
                    }}
                    onBlur={() => handleTouched("votingEnd")}
                    isInvalid={
                      touched.votingEnd &&
                      (!votingEnd || votingEnd <= votingStart)
                    }
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <h6 className="mt-4">{t("connectedWallets")}</h6>
        {isLoadingWallet ? (
          <LoadingPage type="ring" />
        ) : (
          <div className="wallet-selection-grid">
            {walletSummaries.map((wallet) => (
              <div
                key={wallet.name}
                className={`wallet-option ${
                  selectedWallet?.name === wallet.name ? "active" : ""
                }`}
                onClick={() => updateSelectedWallet(wallet)}
              >
                {wallet.isLoginWallet && (
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
                  {wallet.displayADA} / {wallet.displayDFCT}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <div className="wallet-error text-danger mt-3">{error}</div>}
        {lovelaceAmount && (
          <p className="wallet-info mt-2">
            {t("estimatedFee")}: {(lovelaceAmount / 1_000_000).toFixed(2)} ADA (
            {lovelaceAmount} Lovelace)
          </p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>
          {t("cancel")}
        </Button>
        <Button variant="dark" onClick={handleSubmit} disabled={isSubmitting}>
          {t("submitProposal")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
