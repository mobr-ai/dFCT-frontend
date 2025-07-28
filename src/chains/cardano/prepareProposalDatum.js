import { Data, fromText } from "@/lib/lucid/mod.js";

function ensureBigInt(val) {
    return typeof val === "bigint" ? val : BigInt(val);
}

export async function prepareProposalDatum({
    proposalId,
    proposerPubKeyHash,
    ownerPubKeyHash,
    votingStart,
    votingEnd,
    minVotingTokens,
    authorizedPKHs = {},
}) {
    // Step 1: Build Map<Data.Bytes, Data.Integer>
    const authorizedMap = new Map(
        Object.entries(authorizedPKHs).map(([pkh, weight]) => [
            pkh, // raw string
            ensureBigInt(weight ?? 1n), // raw bigint
        ])
    );

    // Step 2: Build DFCTGovernanceParams
    const govParams = {
        index: 0,
        fields: [
            ownerPubKeyHash, // raw bytes string
            ensureBigInt(minVotingTokens),
            authorizedMap,
        ],
    };

    // Step 3: Build DFCTProposal
    const proposal = {
        index: 0,
        fields: [
            fromText(proposalId),
            proposerPubKeyHash,
            ensureBigInt(votingStart),
            ensureBigInt(votingEnd),
            new Map(), // empty voteTally
            2n, // proposalOutcome = Ongoing
        ],
    };

    // Step 4: Wrap in Just constructor
    const maybeProposal = {
        index: 0, // Just
        fields: [proposal],
    };

    // Step 5: Status
    const proposalStatus = {
        index: 0, // Proposed
        fields: [],
    };

    // Step 6: Encode datum once at the top level
    const fullDatum = Data.to({
        index: 0,
        fields: [govParams, maybeProposal, proposalStatus],
    });

    const metadata = {
        674: {
            proposalId,
            proposerPubKeyHash,
            proposalUri: `${window.location.origin}/proposal/${proposalId}`,
            version: 2,
        },
    };

    return { datum: fullDatum, metadata };
}
