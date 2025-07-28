import { type InstructionSigner, type Lucid, TxSigned } from "../mod.js";
export declare class TxComplete {
    private instructionSigner;
    private tasks;
    private lucid;
    constructor(lucid: Lucid, instructionSigner: InstructionSigner);
    sign(): TxComplete;
    signWithPrivateKey(privateKey: string): TxComplete;
    signWithSeed(seed: string, index?: number): TxComplete;
    /** vkey witness */
    signWithWitness(witness: string): TxComplete;
    partialSign(): Promise<string>;
    partialSignWithPrivateKey(privateKey: string): string;
    partialSignWithSeed(seed: string, index: number): string;
    assemble(witnessSets: string[]): TxComplete;
    commit(): Promise<TxSigned>;
    toString(): string;
    toHash(): string;
}
