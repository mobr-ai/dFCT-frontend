import { type ActiveDelegation, type Credential, Data, type Exact, type Instruction, type Json, Message, type NativeScript, type Network, type OutRef, type PartialInstruction, type Provider, type ReadOnlyWallet, type Script, ScriptUtility, type SignedMessage, Tx, TxComplete, type Utxo, type Wallet, type WalletApi, type WalletSelection } from "../mod.js";
export declare class Lucid {
    wallet: Wallet;
    provider: Provider;
    network: Network;
    utils: {
        scriptToAddress: (script: Script, delegation?: Credential | undefined) => string;
        credentialToAddress: (payment: Credential, delegation?: Credential | undefined) => string;
        credentialToRewardAddress: (delegation: Credential) => string;
        scriptToRewardAddress: (script: Script) => string;
        unixTimeToSlots: (unixTime: number) => number;
        slotsToUnixTime: (slots: number) => number;
    };
    constructor({ provider, network, wallet }?: {
        provider?: Provider;
        network?: Network;
        wallet?: WalletSelection;
    });
    newScript<T extends unknown[] = Data[]>(script: Script | NativeScript, params?: Exact<[...T]>, type?: T): ScriptUtility;
    newTx(): Tx;
    fromTx(tx: string): Promise<TxComplete>;
    fromInstructions(instructions: Array<Instruction | PartialInstruction>, forceUtxoResolution?: boolean): Promise<TxComplete>;
    /** Signs a message. Expects the payload to be Hex encoded. */
    newMessage(address: string, payload: string): Message;
    /** Verify a message. Expects the payload to be Hex encoded. */
    verifyMessage(address: string, payload: string, signedMessage: SignedMessage): boolean;
    utxosAt(addressOrCredential: string | Credential): Promise<Utxo[]>;
    utxosAtWithUnit(addressOrCredential: string | Credential, unit: string): Promise<Utxo[]>;
    /** Unit needs to be an NFT (or optionally the entire supply in one UTxO). */
    utxoByUnit(unit: string): Promise<Utxo>;
    utxosByOutRef(outRefs: Array<OutRef>): Promise<Utxo[]>;
    delegationAt(rewardAddress: string): Promise<ActiveDelegation>;
    awaitTx(txHash: string, checkInterval?: number): Promise<boolean>;
    datumOf<T = Data>(utxo: Utxo, type?: T): Promise<T>;
    /** Query CIP-0068 metadata for a specifc asset. */
    metadataOf(unit: string): Promise<Json>;
    /**
     * Only an Enteprise address (without stake credential) is derived.
     */
    selectWalletFromPrivateKey(privateKey: string): Lucid;
    selectWalletFromApi(api: WalletApi): Lucid;
    /**
     * If utxos are not set, utxos are fetched from the provided address.
     */
    selectReadOnlyWallet({ address, rewardAddress, utxos, }: ReadOnlyWallet): Lucid;
    /**
     * Select wallet from a seed phrase (e.g. 15 or 24 words). You have the option to choose between a Base address (with stake credential)
     * and Enterprise address (without stake credential). You can also decide which account index to derive. By default account 0 is derived.
     */
    selectWalletFromSeed(seed: string, options?: {
        addressType?: "Base" | "Enterprise";
        index?: number;
    }): Lucid;
}
