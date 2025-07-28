import { type ActiveDelegation, type Credential, type Network, type OutRef, type Provider, type RelevantProtocolParameters, type Utxo } from "../mod.js";
export declare class Blockfrost implements Provider {
    url: string;
    projectId: string;
    network?: Network;
    constructor(url: string, projectId?: string);
    getProtocolParameters(): Promise<RelevantProtocolParameters>;
    getUtxos(addressOrCredential: string | Credential): Promise<Utxo[]>;
    getUtxosWithUnit(addressOrCredential: string | Credential, unit: string): Promise<Utxo[]>;
    getUtxoByUnit(unit: string): Promise<Utxo>;
    getUtxosByOutRef(outRefs: OutRef[]): Promise<Utxo[]>;
    getDelegation(rewardAddress: string): Promise<ActiveDelegation>;
    getDatum(datumHash: string): Promise<string>;
    awaitTx(txHash: string, checkInterval?: number): Promise<boolean>;
    submit(tx: string): Promise<string>;
    private blockfrostUtxosToUtxos;
}
