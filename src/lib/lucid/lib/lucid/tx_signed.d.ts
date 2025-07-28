import { type Lucid, type SignerResult } from "../mod.js";
export declare class TxSigned {
    private signerResult;
    private lucid;
    constructor(lucid: Lucid, signerResult: SignerResult);
    submit(): Promise<string>;
    toWitnessSet(): string;
    toString(): string;
    toHash(): string;
}
