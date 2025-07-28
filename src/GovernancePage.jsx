import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import React, { useState, useEffect, Suspense } from "react";
import {
  useOutletContext,
  useNavigate,
  useLoaderData,
  Await,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./styles/GovernancePage.css";
import LoadingPage from "./LoadingPage";
import ProposalSubmissionModal from "./components/ProposalSubmissionModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileArrowUp, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { useAuthRequest } from "./hooks/useAuthRequest";

const statusColors = {
  0: "ProposalStatus-proposed",
  1: "ProposalStatus-voting",
  2: "ProposalStatus-approved",
  3: "ProposalStatus-rejected",
  4: "ProposalStatus-executed",
  5: "ProposalStatus-draft",
};

const statusLabels = {
  0: "PROPOSED",
  1: "VOTING",
  2: "APPROVED",
  3: "REJECTED",
  4: "EXECUTED",
  5: "DRAFT",
};

export default function GovernancePage() {
  const [proposals, setProposals] = useState([]);
  const [sortKey, setSortKey] = useState("created_at");
  const [showModal, setShowModal] = useState(false);
  const { user, setLoading, showToast } = useOutletContext();
  const { govProposalsPromise } = useLoaderData();
  const { t } = useTranslation();
  const { authRequest } = useAuthRequest(user);
  const navigate = useNavigate();

  // --- Helper: mark & clear syncing ---
  const markProposalSync = (proposalId) =>
    sessionStorage.setItem(`dfct_proposal_syncing_${proposalId}`, "1");
  const clearProposalSync = (proposalId) =>
    sessionStorage.removeItem(`dfct_proposal_syncing_${proposalId}`);
  const isSyncing = (proposalId) =>
    sessionStorage.getItem(`dfct_proposal_syncing_${proposalId}`) === "1";

  // --- Poll a draft proposal by id ---
  const pollDraftProposal = async (proposalId) => {
    const maxAttempts = 24;
    const delayMs = 10000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, delayMs));
      try {
        const statusRes = await authRequest.get(
          `/api/proposal/${proposalId}/status`
        );
        const proposal = statusRes.body;
        if (proposal?.status && proposal.status !== 5) {
          mergeProposal(proposal);
          clearProposalSync(proposalId);

          return true;
        }
      } catch (err) {
        console.warn(`Polling ${proposalId} failed:`, err);
      }
    }
    showToast(t("statusSyncTimeout"), "secondary");
    return false;
  };

  // --- Initialize proposals, auto-poll DRAFTs ---
  useEffect(() => {
    govProposalsPromise.then((loaded) => {
      const updated = [...loaded];
      let foundDrafts = [];

      // Check localStorage for syncing keys
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("dfct_proposal_syncing_")) {
          const proposalId = key.replace("dfct_proposal_syncing_", "");
          const inLoaded = loaded.find((p) => p.proposal_id === proposalId);
          if (inLoaded) {
            // Found: clear syncing
            clearProposalSync(proposalId);
          } else {
            // Not found: push a placeholder DRAFT & poll
            const fakeDraft = {
              proposal_id: proposalId,
              status: 5,
              title: "(Pending Proposal)",
              submitted_by: "Unknown",
              created_at: new Date().toISOString(),
            };
            updated.unshift(fakeDraft);
            foundDrafts.push(proposalId);
          }
        }
      }

      setProposals(updated);
      setLoading(false);

      // Start polling for each missing draft
      foundDrafts.forEach((id) => pollDraftProposal(id));
    });
  }, [govProposalsPromise, setLoading]);

  const mergeProposal = (newProposal) => {
    setProposals((prev) => {
      const index = prev.findIndex(
        (p) => p.proposal_id === newProposal.proposal_id
      );
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...newProposal };
        showToast(
          t("proposalVerified").replace(
            "{}",
            newProposal.proposal_id.toUpperCase()
          ),
          "success"
        );
        return updated;
      } else {
        return [newProposal, ...prev];
      }
    });
  };

  const truncateTitle = (string = "", maxLength = 40) => {
    return string.length > maxLength
      ? `${string.substring(0, maxLength)}…`
      : string;
  };

  const truncateAddress = (val) => {
    const valStr = val ? String(val) : "";
    if (valStr.length <= 16) return valStr;
    return `${valStr.slice(0, 10)}...${valStr.slice(-5)}`;
  };

  const sortedProposals = [...proposals].sort((a, b) => {
    if (sortKey === "created_at") {
      return new Date(b.created_at) - new Date(a.created_at);
    }
    if (sortKey === "status") {
      return a.status - b.status;
    }
    if (sortKey === "voting_start") {
      return (
        new Date(a.voting_start).getTime() - new Date(b.voting_start).getTime()
      );
    }
    if (sortKey === "voting_end") {
      return (
        new Date(a.voting_end).getTime() - new Date(b.voting_end).getTime()
      );
    }
    return 0;
  });

  if (!user) return null;

  return (
    <Suspense
      fallback={
        <div className="GovernancePage">
          <LoadingPage />
        </div>
      }
    >
      <Await resolve={govProposalsPromise}>
        {() => (
          <div className="GovernancePage">
            <h3 className="GovernanceTitle">{t("governanceProposals")}</h3>

            <ProposalSubmissionModal
              user={user}
              show={showModal}
              onHide={() => setShowModal(false)}
              onSubmitted={mergeProposal}
              showToast={showToast}
            />

            <Button
              variant="dark"
              className="ProposalButton mb-3"
              onClick={() => setShowModal(true)}
            >
              <FontAwesomeIcon icon={faFileArrowUp} /> {t("newProposal")}
            </Button>

            {sortedProposals.length > 0 ? (
              <Container className="GovernanceContainer">
                <div id="proposalSorting" className="ProposalControls">
                  <select
                    className="ProposalSortSelect"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                  >
                    <option value="created_at">{t("sortByCreatedAt")}</option>
                    <option value="status">{t("sortByStatus")}</option>
                    <option value="voting_start">
                      {t("sortByVotingStart")}
                    </option>
                    <option value="voting_end">{t("sortByVotingEnd")}</option>
                  </select>
                </div>
                <div className="ProposalGrid">
                  {sortedProposals.map((p) => (
                    <div
                      className={`ProposalCard ${
                        p.status === 5 || isSyncing(p.proposal_id)
                          ? "DraftShimmer"
                          : ""
                      }`}
                      key={p.proposal_id}
                      onClick={
                        p.status === 5 || isSyncing(p.proposal_id)
                          ? ""
                          : () => navigate(`/proposal/${p.proposal_id}`)
                      }
                    >
                      <div
                        className={`ProposalStatus ${statusColors[p.status]}`}
                      >
                        {p.proposal_id.toUpperCase()}
                        <br />
                        {"(" +
                          t(
                            "proposalStatus." + statusLabels[p.status] ||
                              t("UNKNOWN")
                          ) +
                          ")"}
                      </div>
                      <div className="ProposalBody">
                        <div className="ProposalTitle">
                          {truncateTitle(p.title)}
                          <span className="DatePillWrapper">
                            {p.voting_start && p.voting_end ? (
                              <>
                                <Badge bg="secondary" className="DatePill">
                                  {new Date(p.voting_start).toLocaleDateString(
                                    undefined,
                                    {
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )}
                                  {" • "}
                                  {new Date(p.voting_start).toLocaleTimeString(
                                    undefined,
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </Badge>
                                <FontAwesomeIcon
                                  icon={faArrowRight}
                                  className="mx-2"
                                  style={{ verticalAlign: "middle" }}
                                />
                                <Badge bg="secondary" className="DatePill">
                                  {new Date(p.voting_end).toLocaleDateString(
                                    undefined,
                                    {
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )}
                                  {" • "}
                                  {new Date(p.voting_end).toLocaleTimeString(
                                    undefined,
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </Badge>
                              </>
                            ) : (
                              "N/A"
                            )}
                          </span>
                        </div>
                        <br />
                        <strong>{t("submittedBy")}:</strong>{" "}
                        {truncateAddress(p.owner_address) || "unknown"}
                        <br />
                        <strong>{t("createdAt")}:</strong>{" "}
                        {new Date(p.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        <br />
                        {p.transaction_hash && (
                          <a
                            href={`https://preview.cardanoscan.io/transaction/${p.transaction_hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="TxLink"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t("viewTransaction")}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Container>
            ) : (
              <Container className="GovernanceContainer">
                <span className="EmptyState">{t("noProposals")}</span>
              </Container>
            )}
          </div>
        )}
      </Await>
    </Suspense>
  );
}
