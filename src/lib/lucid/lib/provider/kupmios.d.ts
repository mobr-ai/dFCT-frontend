import { type ActiveDelegation, type Credential, type Network, type OutRef, type Provider, type RelevantProtocolParameters, type Utxo } from "../mod.js";
export declare class Kupmios implements Provider {
    kupoUrl: string;
    ogmiosUrl: string;
    network?: Network;
    /**
     * @param kupoUrl: http(s)://localhost:1442
     * @param ogmiosUrl: ws(s)://localhost:1337
     */
    constructor({ kupoUrl, ogmiosUrl, network }: {
        kupoUrl: string;
        ogmiosUrl: string;
        network: Network;
    });
    getProtocolParameters(): Promise<RelevantProtocolParameters>;
    getUtxos(addressOrCredential: string | Credential): Promise<Utxo[]>;
    getUtxosWithUnit(addressOrCredential: string | Credential, unit: string): Promise<Utxo[]>;
    getUtxoByUnit(unit: string): Promise<Utxo>;
    getUtxosByOutRef(outRefs: Array<OutRef>): Promise<Utxo[]>;
    getDelegation(rewardAddress: string): Promise<ActiveDelegation>;
    getDatum(datumHash: string): Promise<string>;
    awaitTx(txHash: string, checkInterval?: number): Promise<boolean>;
    submit(tx: string): Promise<string>;
    private kupmiosUtxosToUtxos;
    private rpc;
}
