import { type ActiveDelegation, type Assets, type Credential, type Network, type OutputData, type OutRef, type Provider, type RelevantProtocolParameters, type Utxo } from "../mod.js";
export declare class Emulator implements Provider {
    network?: Network;
    private state;
    constructor(accounts: {
        address: string;
        assets: Assets;
        outputData?: OutputData;
    }[]);
    getDatum(datumHash: string): Promise<string>;
    getProtocolParameters(): Promise<RelevantProtocolParameters>;
    getDelegation(rewardAddress: string): Promise<ActiveDelegation>;
    getUtxoByUnit(unit: string): Promise<Utxo>;
    getUtxos(addressOrCredential: string | Credential): Promise<Utxo[]>;
    getUtxosByOutRef(outRefs: Array<OutRef>): Promise<Utxo[]>;
    getUtxosWithUnit(addressOrCredential: string | Credential, unit: string): Promise<Utxo[]>;
    awaitTx(txHash: string): Promise<boolean>;
    submit(tx: string): Promise<string>;
    distributeRewards(rewards: bigint): void;
    awaitBlock(height?: number): void;
    awaitSlot(slot?: number): void;
    now(): number;
}
export declare const PROTOCOL_PARAMETERS_DEFAULT: RelevantProtocolParameters;
