import { Constr, Data, fromText } from "@/lib/lucid/mod.js";

/**
 * Prepare the appropriate redeemer for governance proposal actions.
 * Returns a CBOR hex string (via Data.to), as required by Lucid's `.collectFrom(..., redeemer)`
 */
export function prepareProposalRedeemer({ action, data }) {
    console.log("Preparing redeemer for action", action, data);

    let redeemer;

    switch (action) {
        case "UpdateAuthorizedPKHs": {
            if (!data.newPKHs) throw new Error("Missing newPKHs");

            const authMap = new Map(
                Object.entries(data.newPKHs).map(([pkh, weight]) => [
                    pkh,
                    BigInt(weight ?? 1n),
                ])
            );

            redeemer = new Constr(2, [authMap]);
            break;
        }

        case "UpdateMinVotingTokens": {
            if (data.minVotingTokens === undefined)
                throw new Error("Missing minVotingTokens");

            redeemer = new Constr(3, [BigInt(data.minVotingTokens)]);
            break;
        }

        case "SetVotingPeriod": {
            const { proposalId, votingStart, votingEnd } = data;
            if (!proposalId || votingStart === undefined || votingEnd === undefined)
                throw new Error("Missing fields for SetVotingPeriod");

            redeemer = new Constr(4, [
                fromText(String(proposalId)),
                BigInt(votingStart),
                BigInt(votingEnd),
            ]);
            break;
        }

        case "VoteOnProposal": {
            const { proposalId, vote, dfcAmount } = data;
            if (!proposalId || vote === undefined || dfcAmount === undefined)
                throw new Error("Missing fields for VoteOnProposal");

            redeemer = new Constr(1, [
                fromText(String(proposalId)),
                BigInt(vote),
                BigInt(dfcAmount),
            ]);
            break;
        }

        case "FinalizeProposal": {
            const { proposalId, outcome } = data;
            if (!proposalId || outcome === undefined)
                throw new Error("Missing fields for FinalizeProposal");

            redeemer = new Constr(5, [
                fromText(String(proposalId)),
                BigInt(outcome),
            ]);
            break;
        }

        case "ExecuteProposal": {
            if (!data.proposalId)
                throw new Error("Missing proposalId for ExecuteProposal");

            redeemer = new Constr(6, [fromText(String(data.proposalId))]);
            break;
        }

        default:
            throw new Error(`Unknown action "${action}"`);
    }

    console.log("Redeemer raw Constr:", redeemer);

    const cbor = Data.to(redeemer);

    if (typeof cbor !== "string" || cbor.length % 2 !== 0) {
        throw new Error("Invalid CBOR: odd-length hex string: " + cbor);
    }

    console.log("Redeemer CBOR:", cbor);
    return cbor;
}
