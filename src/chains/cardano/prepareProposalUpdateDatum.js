import { fromText, Constr } from "@/lib/lucid/mod.js";

export function prepareProposalUpdateDatum({
    proposal,
    ownerPkh,
    minVotingTokens,
    authorizedPKHs = {},
    vote,
    voterPkh,
    dfcAmount,
    status,
    votingStart,
    votingEnd,
}) {
    if (!proposal?.proposal_id || !proposal?.proposer_pkh) {
        throw new Error("Proposal object missing required fields.");
    }

    // === 1. Governance Parameters (GovParams)
    const authorizedPKHsMap = new Map(Object.entries(authorizedPKHs).map(([pkh, weight]) => [pkh, BigInt(weight)]));

    const govParams = new Constr(0, [
        ownerPkh,
        BigInt(minVotingTokens ?? 0n),
        authorizedPKHsMap,
    ]);

    // === 2. Vote Tally Map 
    const voteTallyEntries = Object.entries(proposal.vote_tally || {}).map(
        ([pkh, amt]) => [pkh, BigInt(amt ?? 0)]
    );

    if (vote !== undefined && voterPkh && dfcAmount > 0) {
        voteTallyEntries.push([voterPkh, BigInt(dfcAmount)]);
    }

    const voteTallyMap = new Map(voteTallyEntries);

    // === 3. Proposal Outcome
    const proposalOutcome =
        status === 2 ? 1n : status === 3 ? 0n : 2n; // APPROVED = 1, REJECTED = 0, ONGOING = 2

    // === 4. Updated Proposal
    const updatedProposal = new Constr(0, [
        fromText(proposal.proposal_id),
        proposal.proposer_pkh,
        BigInt(votingStart ?? proposal.voting_start ?? 0n),
        BigInt(votingEnd ?? proposal.voting_end ?? 0n),
        voteTallyMap,
        proposalOutcome,
    ]);

    // === 5. Maybe Proposal (Some updatedProposal)
    const maybeProposal = new Constr(0, [updatedProposal]);

    // === 6. Status (as constructor index)
    const statusConstr = new Constr(Number(status ?? proposal.status ?? 0), []);

    // === 7. Final Datum
    const finalDatum = new Constr(0, [govParams, maybeProposal, statusConstr]);

    // === 8. Metadata
    const metadata = {
        674: {
            proposalId: proposal.proposal_id,
            proposerPubKeyHash: proposal.proposer_pkh,
            proposalUri: `${window.location.origin}/proposal/${proposal.proposal_id}`,
            version: 2,
        },
    };

    return { datum: finalDatum, metadata };
}
