import { useEffect, useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import InputGroup from "react-bootstrap/InputGroup";
import LoadingPage from "./LoadingPage";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faThumbsUp,
  faThumbsDown,
  faCheckCircle,
  faCogs,
  faArrowRight,
  faLink,
  faUser,
  faCalendarAlt,
  faEdit,
  faExchangeAlt,
  faUserLock,
  faCoins,
  faPlus,
  faTrash,
  faCalendar,
} from "@fortawesome/free-solid-svg-icons";

import { useProposalUpdater } from "@/chains/cardano/useProposalUpdater";
import { getSessionWalletHandlers } from "@/chains/cardano/walletUtils";
import { useAuthRequest } from "./hooks/useAuthRequest";

import "./styles/ProposalPage.css";
import "./styles/GovernancePage.css";
import "./styles/ProposalSubmissionModal.css";
import "./styles/Wallet.css";

export default function ProposalPage() {
  const { proposalId } = useParams();
  const { t } = useTranslation();
  const { user } = useOutletContext();
  const { authRequest } = useAuthRequest(user);
  const { setLoading, loading, showToast } = useOutletContext();

  const [proposal, setProposal] = useState(null);
  const [insufficientFeeFunds, setInsufficientFeeFunds] = useState(false);
  const [showPKHModal, setShowPKHModal] = useState(false);
  const [showMinTokensModal, setShowMinTokensModal] = useState(false);
  const [showVotingPeriodModal, setShowVotingPeriodModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [voteChoice, setVoteChoice] = useState();
  const [isUpdating, setIsUpdating] = useState(false);
  const [newPKH, setNewPKH] = useState("");
  const [newPKHs, setNewPKHs] = useState({});
  const [newMinTokens, setNewMinTokens] = useState(
    proposal?.min_voting_tokens || 1
  );
  const [newVotingStart, setNewVotingStart] = useState(
    proposal?.voting_start || 0
  );
  const [newVotingEnd, setNewVotingEnd] = useState(proposal?.voting_end || 0);

  const {
    walletSummaries,
    selectedWallet,
    updateSelectedWallet,
    getWalletInfoForSelected,
    isLoadingWallet,
  } = getSessionWalletHandlers(JSON.parse(localStorage.getItem("userData")));

  const {
    optimisticProposal,
    pendingField,
    confirmUpdateMinTokens,
    confirmUpdateVotingPeriod,
    confirmUpdateAuthorizedPKHs,
    confirmVote,
    confirmFinalize,
    confirmExecute,
  } = useProposalUpdater({ user, showToast, authRequest });

  const onSubmitted = (optimisticProposal, showMsg) => {
    setProposal(optimisticProposal);
    if (showMsg) showToast(showMsg, "secondary");
  };

  const handleConfirmMinTokens = async () => {
    try {
      setIsUpdating(true);
      await confirmUpdateMinTokens({
        proposal,
        newMinTokens,
        selectedWallet,
        onSubmitted,
        setShowMinTokensModal,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmVotingPeriod = async () => {
    try {
      setIsUpdating(true);
      await confirmUpdateVotingPeriod({
        proposal,
        selectedWallet,
        newVotingStart,
        newVotingEnd,
        onSubmitted,
        setShowVotingPeriodModal,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmPKHs = async () => {
    try {
      setIsUpdating(true);
      await confirmUpdateAuthorizedPKHs({
        proposal,
        selectedWallet,
        newPKHMap: newPKHs,
        onSubmitted,
        setShowPKHModal,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVote = async (approve = true) => {
    setVoteChoice(approve);
    setShowVoteModal(true);
  };

  const handleFinalize = async () => {
    setShowFinalizeModal(true);
  };

  const handleExecute = async () => {
    setShowExecuteModal(true);
  };

  const handleConfirmVote = async () => {
    try {
      setIsUpdating(true);
      await confirmVote({
        proposal,
        voteValue: voteChoice,
        selectedWallet,
        onSubmitted,
        setShowVoteModal,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmFinalize = async () => {
    try {
      setIsUpdating(true);
      await confirmFinalize({
        proposal,
        selectedWallet,
        onSubmitted,
        setShowFinalizeModal,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmExecute = async () => {
    try {
      setIsUpdating(true);
      await confirmExecute({
        proposal,
        selectedWallet,
        onSubmitted,
        setShowExecuteModal,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        setLoading(true);
        const res = await authRequest.get(`/api/proposal/${proposalId}/status`);
        setProposal(res.body);
      } catch (err) {
        console.error("Failed to load proposal:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProposal();
  }, [proposalId]);

  const toLocalDatetimeInputString = (ms) => {
    const date = new Date(ms);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date - tzOffset).toISOString().slice(0, 16);
  };

  const truncateAddress = (val) => {
    const valStr = val ? String(val) : "";
    if (valStr.length <= 16) return valStr;
    return `${valStr.slice(0, 10)}...${valStr.slice(-5)}`;
  };

  const checkFeeFundsForSelectedWallet = async () => {
    if (!selectedWallet) return;
    const walletApi = await window.cardano[selectedWallet.name].enable();
    setInsufficientFeeFunds(false); // should check via lucid
  };

  const handleUpdatePKHs = () => {
    setNewPKHs(proposal.authorized_pkhs || {});
    setShowPKHModal(true);
  };

  const handleUpdateMinTokens = async () => {
    setNewMinTokens(proposal.min_voting_tokens || 0);
    setShowMinTokensModal(true);
    await checkFeeFundsForSelectedWallet();
  };

  const handleUpdateVotingPeriod = () => {
    setNewVotingStart(toLocalDatetimeInputString(proposal.voting_start || 0));
    setNewVotingEnd(toLocalDatetimeInputString(proposal.voting_end || 0));
    setShowVotingPeriodModal(true);
  };

  if (loading)
    return (
      <div className="ProposalPage">
        <LoadingPage />
      </div>
    );

  if (!proposal)
    return (
      <Container className="ProposalPage">
        <h4>{t("proposalNotFound")}</h4>
      </Container>
    );

  const status = proposal.status;
  const isVotingPeriod = status === 1;
  const isOwner = proposal?.submitted_by === user?.id;
  const statusLabels = {
    0: "PROPOSED",
    1: "VOTING",
    2: "APPROVED",
    3: "REJECTED",
    4: "EXECUTED",
    5: "DRAFT",
  };
  const statusColors = {
    0: "ProposalStatus-proposed",
    1: "ProposalStatus-voting",
    2: "ProposalStatus-approved",
    3: "ProposalStatus-rejected",
    4: "ProposalStatus-executed",
    5: "ProposalStatus-draft",
  };

  return (
    <div className="ProposalPage">
      <Container className="ProposalContainer">
        <div className={`ProposalStatus ${statusColors[status]}`}>
          {proposal.title}
          <br />
          {"(" + proposal.proposal_id.toUpperCase() + ")"}
        </div>

        <p className="ProposalDescription">{proposal.description}</p>

        <div className="ProposalMeta">
          <FontAwesomeIcon icon={faExchangeAlt} />{" "}
          <strong>{t("status")}:</strong>{" "}
          {t(`proposalStatus.${statusLabels[status]}`) || t("UNKNOWN")}
        </div>

        <div className="ProposalMeta">
          <span
            className={pendingField === "min_voting_tokens" ? "shimmer" : ""}
          >
            <FontAwesomeIcon icon={faCoins} />{" "}
            <strong>{t("minVotingTokens")}:</strong>{" "}
            {pendingField === "min_voting_tokens"
              ? optimisticProposal?.min_voting_tokens ??
                proposal.min_voting_tokens
              : proposal.min_voting_tokens}
          </span>
        </div>

        <div className="ProposalMeta">
          <span className={pendingField === "voting_period" ? "shimmer" : ""}>
            <FontAwesomeIcon icon={faCalendarAlt} />{" "}
            <strong>{t("votingPeriod")}:</strong>{" "}
            <span className="DatePillWrapper">
              <Badge bg="secondary" className="DatePill">
                {new Date(proposal.voting_start).toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                  day: "numeric",
                })}
                {" • "}
                {new Date(proposal.voting_start).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Badge>
              <FontAwesomeIcon
                icon={faArrowRight}
                className="mx-2 DatePillArrow"
              />
              <Badge bg="secondary" className="DatePill">
                {new Date(proposal.voting_end).toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                  day: "numeric",
                })}
                {" • "}
                {new Date(proposal.voting_end).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Badge>
            </span>
          </span>
        </div>

        <div className="ProposalMeta">
          <span className={pendingField === "authorized_pkhs" ? "shimmer" : ""}>
            <FontAwesomeIcon icon={faUserLock} />{" "}
            <strong>{t("authorizedPKHs")}:</strong>{" "}
            {Object.keys(proposal.authorized_pkhs || {}).length}
          </span>
        </div>

        <div className="ProposalMeta">
          <FontAwesomeIcon icon={faUser} /> <strong>{t("submittedBy")}:</strong>{" "}
          {truncateAddress(proposal.owner_address)}
        </div>

        <div className="ProposalMeta">
          <FontAwesomeIcon icon={faCalendarAlt} />{" "}
          <strong>{t("createdAt")}:</strong>{" "}
          {new Date(proposal.created_at).toLocaleString()}
        </div>

        {proposal.updated_at && proposal.updated_at !== proposal.created_at && (
          <div className="ProposalMeta">
            <FontAwesomeIcon icon={faEdit} /> <strong>{t("updatedAt")}:</strong>{" "}
            {new Date(proposal.updated_at).toLocaleString()}
          </div>
        )}

        <div className="ProposalMeta">
          <FontAwesomeIcon icon={faLink} />{" "}
          <strong>{t("discussionUrl")}:</strong>{" "}
          <a
            href={proposal.discussion_url}
            target="_blank"
            rel="noreferrer"
            className="TxLink"
          >
            {proposal.discussion_url}
          </a>
        </div>

        <div className="ProposalMeta">
          <FontAwesomeIcon icon={faExchangeAlt} />{" "}
          <strong>{t("transaction")}:</strong>{" "}
          <a
            href={`https://preview.cardanoscan.io/transaction/${proposal.transaction_hash}`}
            target="_blank"
            rel="noreferrer"
            className="TxLink"
          >
            {proposal.transaction_hash}
          </a>
        </div>

        {/* Proposal actions */}
        <Card className="ProposalActionsCard">
          <Card.Body>
            {status == 1 && !isVotingPeriod ? (
              <h5>{t("votingPeriodEnded")}</h5>
            ) : status == 3 ||
              status == 4 ||
              status == 5 ||
              ((status == 0 || status == 2) && !isOwner) ? (
              <h5>{t("noActionsAvailable")}</h5>
            ) : (
              <>
                <h5>{t("proposalActions")}</h5>
                <div className="ProposalActions">
                  {isVotingPeriod && (
                    <>
                      <Button
                        variant="success"
                        onClick={() => handleVote(true)}
                      >
                        <FontAwesomeIcon icon={faThumbsUp} /> {t("voteApprove")}
                      </Button>{" "}
                      <Button
                        variant="danger"
                        onClick={() => handleVote(false)}
                      >
                        <FontAwesomeIcon icon={faThumbsDown} />{" "}
                        {t("voteReject")}
                      </Button>
                    </>
                  )}

                  {isOwner && status == 1 && (
                    <Button variant="warning" onClick={handleFinalize}>
                      <FontAwesomeIcon icon={faCheckCircle} /> {t("finalize")}
                    </Button>
                  )}

                  {isOwner && status == 2 && (
                    <Button variant="info" onClick={handleExecute}>
                      <FontAwesomeIcon icon={faCogs} /> {t("execute")}
                    </Button>
                  )}

                  {isOwner && status == 0 && (
                    <>
                      <Button variant="secondary" onClick={handleUpdatePKHs}>
                        {t("updatePKHs")}
                      </Button>{" "}
                      <Button
                        variant="secondary"
                        onClick={handleUpdateMinTokens}
                      >
                        {t("updateMinVotingTokens")}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleUpdateVotingPeriod}
                      >
                        {t("updateVotingPeriod")}
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </Card.Body>
        </Card>
      </Container>
      <Modal
        show={showPKHModal}
        onHide={() => setShowPKHModal(false)}
        size="lg"
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>{t("updatePKHs")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
                <Button
                  variant="dark"
                  onClick={() => {
                    const trimmed = newPKH.trim();
                    if (trimmed && !Object.keys(newPKHs).includes(trimmed)) {
                      // setNewPKHs((prev) => ({ ...prev, [trimmed]: 1 }));
                      setNewPKHs({ ...newPKHs, [trimmed]: 1 });
                      setNewPKH("");
                    }
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} /> {t("add")}
                </Button>
              </InputGroup>
              {Object.keys(newPKHs).map((pkh) => (
                <Card
                  key={pkh}
                  className="mb-2 p-2 d-flex flex-row justify-content-between align-items-center"
                >
                  <span>{pkh}</span>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      const copy = { ...newPKHs };
                      delete copy[pkh];
                      setNewPKHs(copy);
                    }}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </Button>
                </Card>
              ))}
            </Card.Body>
          </Card>
          <div className="wallet-selection-grid">
            {walletSummaries.map((wallet) => (
              <div
                key={wallet.name}
                className={`wallet-option ${
                  selectedWallet?.name === wallet.name ? "active" : ""
                }`}
                onClick={async () => {
                  updateSelectedWallet(wallet);
                  await checkFeeFundsForSelectedWallet(); // re-check on switch
                }}
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
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPKHModal(false)}>
            {t("cancel")}
          </Button>
          <Button
            variant="dark"
            onClick={handleConfirmPKHs}
            disabled={insufficientFeeFunds || isUpdating}
            className={`ModalConfirmButton ${isUpdating ? "loading" : ""}`}
          >
            {isUpdating ? (
              <span className="ModalSpinnerWrapper">
                <LoadingPage type="ring" />
              </span>
            ) : (
              t("confirm")
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ---------------- Update MinVotingTokens Modal ---------------- */}
      <Modal
        show={showMinTokensModal}
        onHide={() => setShowMinTokensModal(false)}
        size="md"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{t("updateMinVotingTokens")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Card className="ProposalCardInput mb-3">
            <Card.Body>
              <Form.Label>
                <FontAwesomeIcon icon={faCoins} /> {t("minVotingTokens")}
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type="number"
                  value={newMinTokens}
                  onChange={(e) => setNewMinTokens(Number(e.target.value))}
                  min={0}
                />
              </InputGroup>
              <Form.Range
                value={newMinTokens}
                onChange={(e) => setNewMinTokens(Number(e.target.value))}
                min={0}
                max={10000}
              />
            </Card.Body>
          </Card>
          <div className="wallet-selection-grid">
            {walletSummaries.map((wallet) => (
              <div
                key={wallet.name}
                className={`wallet-option ${
                  selectedWallet?.name === wallet.name ? "active" : ""
                }`}
                onClick={async () => {
                  updateSelectedWallet(wallet);
                  await checkFeeFundsForSelectedWallet(); // re-check on switch
                }}
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
          {insufficientFeeFunds && (
            <div className="wallet-error">
              ⚠️ {t("insufficientBalanceForFee")}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowMinTokensModal(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="dark"
            onClick={handleConfirmMinTokens}
            disabled={insufficientFeeFunds || isUpdating}
            className={`ModalConfirmButton ${isUpdating ? "loading" : ""}`}
          >
            {isUpdating ? (
              <span className="ModalSpinnerWrapper">
                <LoadingPage type="ring" />
              </span>
            ) : (
              t("confirm")
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ---------------- Update VotingPeriod Modal ---------------- */}
      <Modal
        show={showVotingPeriodModal}
        onHide={() => setShowVotingPeriodModal(false)}
        size="md"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{t("updateVotingPeriod")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
                      value={newVotingStart}
                      onChange={(e) => setNewVotingStart(e.target.value)}
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
                      value={newVotingEnd}
                      onChange={(e) => setNewVotingEnd(e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
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
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowVotingPeriodModal(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="dark"
            onClick={handleConfirmVotingPeriod}
            disabled={insufficientFeeFunds || isUpdating}
            className={`ModalConfirmButton ${isUpdating ? "loading" : ""}`}
          >
            {isUpdating ? (
              <span className="ModalSpinnerWrapper">
                <LoadingPage type="ring" />
              </span>
            ) : (
              t("confirm")
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ---------------- Voting Modal ---------------- */}
      <Modal
        show={showVoteModal}
        onHide={() => setShowVoteModal(false)}
        size="md"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{t("confirmVote")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            {t("selectedVote")}:{" "}
            <strong>{voteChoice ? t("approve") : t("reject")}</strong>
          </p>
          <div className="wallet-selection-grid">
            {walletSummaries.map((wallet) => (
              <div
                key={wallet.name}
                className={`wallet-option ${
                  selectedWallet?.name === wallet.name ? "active" : ""
                }`}
                onClick={async () => {
                  updateSelectedWallet(wallet);
                  await checkFeeFundsForSelectedWallet();
                }}
              >
                {wallet.isLoginWallet && (
                  <FontAwesomeIcon icon={faUser} className="wallet-user-icon" />
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
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowVoteModal(false)}>
            {t("cancel")}
          </Button>
          <Button
            variant="dark"
            onClick={handleConfirmVote}
            disabled={insufficientFeeFunds || isUpdating}
            className={`ModalConfirmButton ${isUpdating ? "loading" : ""}`}
          >
            {isUpdating ? (
              <span className="ModalSpinnerWrapper">
                <LoadingPage type="ring" />
              </span>
            ) : (
              t("confirm")
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ---------------- Finalize Modal ---------------- */}
      <Modal
        show={showFinalizeModal}
        onHide={() => setShowFinalizeModal(false)}
        size="md"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{t("finalizeProposal")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t("finalizeProposalConfirm")}</p>
          <div className="wallet-selection-grid">
            {walletSummaries.map((wallet) => (
              <div
                key={wallet.name}
                className={`wallet-option ${
                  selectedWallet?.name === wallet.name ? "active" : ""
                }`}
                onClick={async () => {
                  updateSelectedWallet(wallet);
                  await checkFeeFundsForSelectedWallet();
                }}
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
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowFinalizeModal(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="dark"
            onClick={handleConfirmFinalize}
            disabled={insufficientFeeFunds || isUpdating}
            className={`ModalConfirmButton ${isUpdating ? "loading" : ""}`}
          >
            {isUpdating ? (
              <span className="ModalSpinnerWrapper">
                <LoadingPage type="ring" />
              </span>
            ) : (
              t("confirm")
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ---------------- Execute Modal ---------------- */}
      <Modal
        show={showExecuteModal}
        onHide={() => setShowExecuteModal(false)}
        size="md"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{t("executeProposal")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t("executeProposalConfirm")}</p>
          <div className="wallet-selection-grid">
            {walletSummaries.map((wallet) => (
              <div
                key={wallet.name}
                className={`wallet-option ${
                  selectedWallet?.name === wallet.name ? "active" : ""
                }`}
                onClick={async () => {
                  updateSelectedWallet(wallet);
                  await checkFeeFundsForSelectedWallet();
                }}
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
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowExecuteModal(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="dark"
            onClick={handleConfirmExecute}
            disabled={insufficientFeeFunds || isUpdating}
            className={`ModalConfirmButton ${isUpdating ? "loading" : ""}`}
          >
            {isUpdating ? (
              <span className="ModalSpinnerWrapper">
                <LoadingPage type="ring" />
              </span>
            ) : (
              t("confirm")
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
