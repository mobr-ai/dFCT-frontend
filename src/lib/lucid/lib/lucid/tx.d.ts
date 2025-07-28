import { type Assets, type AuxMetadata, type Change, type DelegVariant, type Instruction, type Lucid, type OutputData, type PartialInstruction, type PoolRegistration, type Script, ScriptUtility, TxComplete, type Utxo } from "../mod.js";
export declare class Tx {
    private tasks;
    private lucid;
    constructor(lucid: Lucid);
    /** Read data from utxos. These utxos are only referenced and not spent. */
    readFrom(utxos: Utxo[]): Tx;
    /**
     * A public key or native script input.
     * With redeemer it's a plutus script input.
     */
    collectFrom(utxos: Utxo[], redeemer?: string): Tx;
    /**
     * All assets should be of the same policy id.
     * You can chain mint function calls together if you need to mint assets with different policy ids.
     * If the plutus script doesn't need a redeemer, you still need to specifiy the void redeemer.
     */
    mint(assets: Assets, redeemer?: string): Tx;
    /** Pay to a public key or native script address. */
    payTo(address: string | "{{own}}", assets: Assets): Tx;
    /** Pay to a public key or native script address with datum or scriptRef. */
    payToWithData(address: string | "{{own}}", outputData: string | OutputData, assets: Assets): Tx;
    /** Pay to a plutus script address with datum or scriptRef. */
    payToContract(address: string, outputData: string | OutputData, assets: Assets): Tx;
    /** Delegate to a stake pool or drep. */
    delegateTo(rewardAddress: string | "{{own}}", variant: DelegVariant, redeemer?: string): Tx;
    /** Register a reward address in order to delegate to a pool and receive rewards. */
    registerStake(rewardAddress: string | "{{own}}"): Tx;
    /** Deregister a reward address. */
    deregisterStake(rewardAddress: string | "{{own}}", redeemer?: string): Tx;
    /** Register a stake pool. A pool deposit is required. The metadataUrl needs to be hosted already before making the registration. */
    registerPool(params: PoolRegistration): Tx;
    /** Update a stake pool. No pool deposit is required. The metadataUrl needs to be hosted already before making the update. */
    updatePool(params: PoolRegistration): Tx;
    /**
     * Retire a stake pool. The epoch needs to be the greater than the current epoch + 1 and less than current epoch + eMax.
     * The pool deposit will be sent to reward address as reward after full retirement of the pool.
     */
    retirePool(poolId: string, epoch: number): Tx;
    withdraw(rewardAddress: string | "{{own}}", amount?: bigint, redeemer?: string): Tx;
    /** Add a payment or stake key hash as a required signer of the transaction. */
    addSigner(keyHash: string | "{{own.payment}}" | "{{own.delegation}}"): Tx;
    validFrom(unixTime: number): Tx;
    validTo(unixTime: number): Tx;
    attachMetadata(label: number, metadata: AuxMetadata): Tx;
    /** Converts strings to bytes if prefixed with **'0x'**. */
    attachMetadataWithConversion(label: number, metadata: AuxMetadata): Tx;
    /** Explicitely set the network id in the transaction body. */
    addNetworkId(id: number): Tx;
    attachScript(script: Script | ScriptUtility): Tx;
    withChangeTo(change: Change | Change & {
        address: "{{own}}";
    }): Tx;
    withoutCoinSelection(): Tx;
    /** Compose transactions. */
    compose(tx: Tx | null): Tx;
    commit(): Promise<TxComplete>;
    toPartialInstructions(): Promise<PartialInstruction[]>;
    toInstructions(): Promise<Instruction[]>;
}
export declare function resolveInstructions(lucid: Lucid, instructions: Array<Instruction | PartialInstruction>, forceUtxoResolution?: boolean): Promise<Instruction[]>;
