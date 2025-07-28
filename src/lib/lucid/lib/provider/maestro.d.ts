import { type ActiveDelegation, type Credential, type Network, type OutRef, type Provider, type RelevantProtocolParameters, type Utxo } from "../mod.js";
export type MaestroSupportedNetworks = "Mainnet" | "Preprod" | "Preview";
export interface MaestroConfig {
    network: MaestroSupportedNetworks;
    apiKey: string;
    turboSubmit?: boolean;
}
export declare class Maestro implements Provider {
    url: string;
    apiKey: string;
    turboSubmit: boolean;
    network?: Network;
    constructor({ network, apiKey, turboSubmit }: MaestroConfig);
    getProtocolParameters(): Promise<RelevantProtocolParameters>;
    private getUtxosInternal;
    getUtxos(addressOrCredential: string | Credential): Promise<Utxo[]>;
    getUtxosWithUnit(addressOrCredential: string | Credential, unit: string): Promise<Utxo[]>;
    getUtxoByUnit(unit: string): Promise<Utxo>;
    getUtxosByOutRef(outRefs: OutRef[]): Promise<Utxo[]>;
    getDelegation(rewardAddress: string): Promise<ActiveDelegation>;
    getDatum(datumHash: string): Promise<string>;
    awaitTx(txHash: string, checkInterval?: number): Promise<boolean>;
    submit(tx: string): Promise<string>;
    private commonHeaders;
    private maestroUtxoToUtxo;
    private getAllPagesData;
}
