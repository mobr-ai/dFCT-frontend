import { useState } from "react";
import { useTranslation } from "react-i18next";
import { prepareProposalRedeemer } from "@/chains/cardano/prepareProposalRedeemer";
import { prepareProposalUpdateDatum } from "@/chains/cardano/prepareProposalUpdateDatum";
import { buildProposalUpdateTx } from "@/chains/cardano/buildProposalUpdateTx";
import { signAndSubmitTx } from "@/chains/cardano/signAndSubmitTx";
import { GOV_SCRIPT_ADDRESS } from "@/chains/cardano/constants";
import { createLucid } from "@/chains/cardano/useLucidClient";
import { paymentCredentialOf } from "@/lib/lucid/mod.js";

export function useProposalUpdater({ user, showToast, authRequest }) {
  const { t } = useTranslation();
  const [optimisticProposal, setOptimisticProposal] = useState(null);
  const [pendingField, setPendingField] = useState(null);

  const markProposalSync = (proposalId) =>
    sessionStorage.setItem(`dfct_proposal_syncing_${proposalId}`, "1");
  const clearProposalSync = (proposalId) =>
    sessionStorage.removeItem(`dfct_proposal_syncing_${proposalId}`);

  const pollProposalStatus = async (proposalId, onSubmitted, prevSnapshot, fieldsToWatch = []) => {
    const maxAttempts = 24;
    const delayMs = 10000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      try {
        const proposalRes = await authRequest.get(`/api/proposal/${proposalId}/status`);
        const updated = proposalRes.body;

        const changed =
          updated.updated_at !== prevSnapshot.updated_at ||
          fieldsToWatch.some((field) => JSON.stringify(updated[field]) !== JSON.stringify(prevSnapshot[field]));

        if (changed) {
          setOptimisticProposal(null);
          setPendingField(null);
          onSubmitted(updated);
          clearProposalSync(proposalId);
          showToast(t("proposalVerified").replace("{}", proposalId.toUpperCase()), "success");
          return true;
        }
      } catch (err) {
        console.warn(`Polling attempt ${attempt + 1} failed`, err);
      }
    }

    showToast(t("statusSyncTimeout"), "secondary");
    return false;
  };

  const triggerProposalValidation = async (proposal, txHash, overrideFields = {}) => {
    await authRequest.post("/api/validate_gov_tx").send({
      proposal_id: proposal.proposal_id,
      submitted_by: user.id,
      owner_address: proposal.owner_address,
      owner_pkh: proposal.owner_pkh,
      proposer_pkh: proposal.proposer_pkh,
      transaction_hash: txHash,
      title: proposal.title,
      description: proposal.description,
      discussion_url: proposal.discussion_url,
      proposal_metadata: proposal.proposal_metadata || "{}",
      fee: proposal.fee || 0,
      voting_start: overrideFields.voting_start ?? proposal.voting_start,
      voting_end: overrideFields.voting_end ?? proposal.voting_end,
      min_voting_tokens: overrideFields.min_voting_tokens ?? proposal.min_voting_tokens,
      authorized_pkhs: overrideFields.authorized_pkhs ?? proposal.authorized_pkhs,
    });
  };

  const showError = (err, src) => {
    const match = err.message?.match(/Trace (\d+)|vv(\d+)/);
    if (match) {
      const traceKey = match[1] ? `proposalPlutus.trace${match[1]}` : `proposalPlutus.vv${match[2]}`;
      showToast(t(traceKey), "danger");
    } else {
      showToast(t("proposalUpdateFailed"), "danger");
      console.error("Error updating proposal", src, err.message);
    }
  };

  const submitProposalUpdate = async ({
    proposal,
    updatedDatum,
    redeemerPlutusData,
    updatedFields,
    selectedWallet,
    onSubmitted,
    setShowModal,
    fieldKey
  }) => {
    const walletApi = await window.cardano[selectedWallet.name].enable();
    const lucid = await createLucid();
    await lucid.selectWalletFromApi(walletApi);

    const res = await authRequest
      .get(`/api/proposal/${proposal.proposal_id}/utxos`)
      .set("Accept", "application/json");

    const { matching_utxos } = res.body;
    if (!matching_utxos || matching_utxos.length === 0) {
      throw new Error(t("noMatchingUtxoFound"));
    }

    const utxo = matching_utxos[0];
    const assetMap = new Map();
    for (const { unit, quantity } of utxo.amount) {
      assetMap.set(unit, BigInt(quantity));
    }

    const tx = await buildProposalUpdateTx({
      lucid,
      walletApi,
      proposalInputUtxo: {
        txHash: utxo.tx_hash,
        outputIndex: utxo.output_index,
        datum: utxo.inline_datum,
        assets: Object.fromEntries(assetMap),
        address: utxo.address,
      },
      updatedDatum,
      redeemerPlutusData,
      outputAddress: GOV_SCRIPT_ADDRESS,
      ownerPkh: paymentCredentialOf(await lucid.wallet.address()).hash,
    });

    const txHash = await signAndSubmitTx(tx, walletApi);
    await triggerProposalValidation(proposal, txHash, updatedFields);

    const optimisticUpdate = {
      ...proposal,
      ...updatedFields,
      updated_at: new Date().toISOString(),
    };

    setPendingField(fieldKey);
    setOptimisticProposal(optimisticUpdate);

    const validatingKeyMap = {
      min_voting_tokens: "validatingMinTokens",
      authorized_pkhs: "validatingAuthorizedPkhs",
      voting_period: "validatingVotingPeriod",
    };
    const toastKey = validatingKeyMap[fieldKey];
    onSubmitted(optimisticUpdate, t(toastKey));

    markProposalSync(proposal.proposal_id);
    pollProposalStatus(proposal.proposal_id, onSubmitted, proposal, Object.keys(updatedFields));
    setShowModal(false);
  };

  const confirmUpdateMinTokens = async ({
    proposal,
    newMinTokens,
    selectedWallet,
    onSubmitted,
    setShowMinTokensModal,
  }) => {
    try {
      const walletApi = await window.cardano[selectedWallet.name].enable();
      const lucid = await createLucid();
      await lucid.selectWalletFromApi(walletApi);
      const walletAddr = await lucid.wallet.address();
      const walletPKH = paymentCredentialOf(walletAddr).hash;

      const { datum } = prepareProposalUpdateDatum({
        proposal,
        ownerPkh: walletPKH,
        proposerPkh: proposal.proposer_pkh,
        minVotingTokens: Number(newMinTokens),
        authorizedPKHs: proposal.authorized_pkhs,
        status: proposal.status,
        votingStart: proposal.voting_start,
        votingEnd: proposal.voting_end,
      });

      const redeemer = prepareProposalRedeemer({
        action: "UpdateMinVotingTokens",
        data: { minVotingTokens: Number(newMinTokens) },
      });

      await submitProposalUpdate({
        proposal,
        updatedDatum: datum,
        redeemerPlutusData: redeemer,
        updatedFields: { min_voting_tokens: Number(newMinTokens) },
        selectedWallet,
        onSubmitted,
        setShowModal: setShowMinTokensModal,
        fieldKey: "min_voting_tokens"
      });
    } catch (err) {
      showError(err, "confirmUpdateMinTokens");
    }
  };

  const confirmUpdateVotingPeriod = async ({
    proposal,
    newVotingStart,
    newVotingEnd,
    selectedWallet,
    onSubmitted,
    setShowVotingPeriodModal,
  }) => {
    try {
      const votingStart = new Date(newVotingStart).getTime();
      const votingEnd = new Date(newVotingEnd).getTime();
      const walletApi = await window.cardano[selectedWallet.name].enable();
      const lucid = await createLucid();
      await lucid.selectWalletFromApi(walletApi);
      const walletPKH = paymentCredentialOf(await lucid.wallet.address()).hash;

      const { datum } = prepareProposalUpdateDatum({
        proposal,
        ownerPkh: walletPKH,
        proposerPkh: proposal.proposer_pkh,
        minVotingTokens: proposal.min_voting_tokens,
        authorizedPKHs: proposal.authorized_pkhs,
        status: proposal.status,
        votingStart,
        votingEnd,
      });

      const redeemer = prepareProposalRedeemer({
        action: "SetVotingPeriod",
        data: {
          proposalId: proposal.proposal_id,
          votingStart,
          votingEnd,
        },
      });

      await submitProposalUpdate({
        proposal,
        updatedDatum: datum,
        redeemerPlutusData: redeemer,
        updatedFields: { voting_start: votingStart, voting_end: votingEnd },
        selectedWallet,
        onSubmitted,
        setShowModal: setShowVotingPeriodModal,
        fieldKey: "voting_period",
      });
    } catch (err) {
      showError(err, "confirmUpdateVotingPeriod");
    }
  };

  const confirmUpdateAuthorizedPKHs = async ({
    proposal,
    newPKHMap,
    selectedWallet,
    onSubmitted,
    setShowPKHModal,
  }) => {
    try {
      const walletApi = await window.cardano[selectedWallet.name].enable();
      const lucid = await createLucid();
      await lucid.selectWalletFromApi(walletApi);
      const walletPKH = paymentCredentialOf(await lucid.wallet.address()).hash;

      const { datum } = prepareProposalUpdateDatum({
        proposal,
        ownerPkh: walletPKH,
        proposerPkh: proposal.proposer_pkh,
        minVotingTokens: proposal.min_voting_tokens,
        authorizedPKHs: newPKHMap,
        status: proposal.status,
        votingStart: proposal.voting_start,
        votingEnd: proposal.voting_end,
      });

      const redeemer = prepareProposalRedeemer({
        action: "UpdateAuthorizedPKHs",
        data: { newPKHs: newPKHMap },
      });

      await submitProposalUpdate({
        proposal,
        updatedDatum: datum,
        redeemerPlutusData: redeemer,
        updatedFields: { authorized_pkhs: newPKHMap },
        selectedWallet,
        onSubmitted,
        setShowModal: setShowPKHModal,
        fieldKey: "authorized_pkhs",
      });
    } catch (err) {
      showError(err, "confirmUpdateAuthorizedPKHs");
    }
  };

  const confirmVote = async ({ proposal, voteValue, selectedWallet, onSubmitted, setShowVoteModal }) => {
    try {
      const walletApi = await window.cardano[selectedWallet.name].enable();
      const lucid = await createLucid();
      await lucid.selectWalletFromApi(walletApi);
      const walletPKH = paymentCredentialOf(await lucid.wallet.address()).hash;

      const { datum } = prepareProposalUpdateDatum({
        proposal,
        ownerPkh: proposal.owner_pkh,
        proposerPkh: walletPKH,
        minVotingTokens: proposal.min_voting_tokens,
        authorizedPKHs: proposal.authorized_pkhs,
        status: proposal.status,
        votingStart: proposal.voting_start,
        votingEnd: proposal.voting_end,
      });

      const redeemer = prepareProposalRedeemer({
        action: "Vote",
        data: { vote: voteValue }
      });

      await submitProposalUpdate({
        proposal,
        updatedDatum: datum,
        redeemerPlutusData: redeemer,
        updatedFields: {}, // no db change expected directly
        selectedWallet,
        onSubmitted,
        setShowModal: setShowVoteModal,
        fieldKey: "vote",
      });
    } catch (err) {
      showError(err, "confirmVote");
    }
  };

  const confirmFinalize = async ({ proposal, selectedWallet, onSubmitted, setShowFinalizeModal }) => {
    try {
      const redeemer = prepareProposalRedeemer({ action: "Finalize", data: {} });

      await submitProposalUpdate({
        proposal,
        updatedDatum: proposal.datum, // optional or re-derived if needed
        redeemerPlutusData: redeemer,
        updatedFields: { status: "finalized" },
        selectedWallet,
        onSubmitted,
        setShowModal: setShowFinalizeModal,
        fieldKey: "finalize",
      });
    } catch (err) {
      showError(err, "confirmFinalize");
    }
  };

  const confirmExecute = async ({ proposal, selectedWallet, onSubmitted, setShowExecuteModal }) => {
    try {
      const redeemer = prepareProposalRedeemer({ action: "Execute", data: {} });

      await submitProposalUpdate({
        proposal,
        updatedDatum: proposal.datum,
        redeemerPlutusData: redeemer,
        updatedFields: { status: "executed" },
        selectedWallet,
        onSubmitted,
        setShowModal: setShowExecuteModal,
        fieldKey: "execute",
      });
    } catch (err) {
      showError(err, "confirmExecute");
    }
  };


  return {
    optimisticProposal,
    pendingField,
    confirmUpdateMinTokens,
    confirmUpdateVotingPeriod,
    confirmUpdateAuthorizedPKHs,
    confirmVote,
    confirmFinalize,
    confirmExecute
  };
}
