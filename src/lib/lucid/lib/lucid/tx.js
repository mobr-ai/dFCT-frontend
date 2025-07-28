import { Addresses, Data, Hasher, InstructionBuilder, ScriptUtility, toHex, TxComplete, } from "../mod.js";
export class Tx {
    constructor(lucid) {
        Object.defineProperty(this, "tasks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "lucid", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.lucid = lucid;
        this.tasks = [];
    }
    /** Read data from utxos. These utxos are only referenced and not spent. */
    readFrom(utxos) {
        this.tasks.push(async ({ lucid }) => {
            for (const utxo of utxos) {
                if (utxo.datumHash && !utxo.datum) {
                    utxo.datum = Data.to(await lucid.datumOf(utxo));
                }
            }
            return { type: "ReadFrom", utxos };
        });
        return this;
    }
    /**
     * A public key or native script input.
     * With redeemer it's a plutus script input.
     */
    collectFrom(utxos, redeemer) {
        this.tasks.push(async ({ lucid }) => {
            for (const utxo of utxos) {
                if (utxo.datumHash && !utxo.datum) {
                    utxo.datum = Data.to(await lucid.datumOf(utxo));
                }
            }
            return { type: "CollectFrom", utxos, redeemer };
        });
        return this;
    }
    /**
     * All assets should be of the same policy id.
     * You can chain mint function calls together if you need to mint assets with different policy ids.
     * If the plutus script doesn't need a redeemer, you still need to specifiy the void redeemer.
     */
    mint(assets, redeemer) {
        this.tasks.push(() => ({ type: "Mint", assets, redeemer }));
        return this;
    }
    /** Pay to a public key or native script address. */
    payTo(address, assets) {
        this.tasks.push(() => ({ type: "PayTo", address, assets }));
        return this;
    }
    /** Pay to a public key or native script address with datum or scriptRef. */
    payToWithData(address, outputData, assets) {
        this.tasks.push(() => {
            const { scriptRef, ...datumVariant } = typeof outputData === "string"
                ? { AsHash: outputData }
                : outputData;
            return {
                type: "PayTo",
                address,
                assets,
                datumVariant: Object.keys(datumVariant).length > 0
                    ? datumVariant
                    : undefined,
                scriptRef,
            };
        });
        return this;
    }
    /** Pay to a plutus script address with datum or scriptRef. */
    payToContract(address, outputData, assets) {
        this.tasks.push(() => {
            const { scriptRef, ...datumVariant } = typeof outputData === "string"
                ? { AsHash: outputData }
                : outputData;
            return {
                type: "PayToContract",
                address,
                assets,
                datumVariant: datumVariant,
                scriptRef,
            };
        });
        return this;
    }
    /** Delegate to a stake pool or drep. */
    delegateTo(rewardAddress, variant, redeemer) {
        this.tasks.push(() => ({
            type: "DelegateTo",
            delegation: {
                rewardAddress,
                variant,
            },
            redeemer,
        }));
        return this;
    }
    /** Register a reward address in order to delegate to a pool and receive rewards. */
    registerStake(rewardAddress) {
        this.tasks.push(() => ({ type: "RegisterStake", rewardAddress }));
        return this;
    }
    /** Deregister a reward address. */
    deregisterStake(rewardAddress, redeemer) {
        this.tasks.push(() => ({
            type: "DeregisterStake",
            rewardAddress,
            redeemer,
        }));
        return this;
    }
    /** Register a stake pool. A pool deposit is required. The metadataUrl needs to be hosted already before making the registration. */
    registerPool(params) {
        this.tasks.push(async () => {
            if (params.metadataUrl && !params.metadataHash) {
                const metadata = await fetch(params.metadataUrl)
                    .then((res) => res.arrayBuffer());
                const metadataHash = Hasher.hashWithBlake2b256(toHex(new Uint8Array(metadata)));
                params.metadataHash = metadataHash;
            }
            return { type: "RegisterPool", ...params };
        });
        return this;
    }
    /** Update a stake pool. No pool deposit is required. The metadataUrl needs to be hosted already before making the update. */
    updatePool(params) {
        this.tasks.push(async () => {
            if (params.metadataUrl && !params.metadataHash) {
                const metadata = await fetch(params.metadataUrl)
                    .then((res) => res.arrayBuffer());
                const metadataHash = Hasher.hashWithBlake2b256(toHex(new Uint8Array(metadata)));
                params.metadataHash = metadataHash;
            }
            return { type: "UpdatePool", ...params };
        });
        return this;
    }
    /**
     * Retire a stake pool. The epoch needs to be the greater than the current epoch + 1 and less than current epoch + eMax.
     * The pool deposit will be sent to reward address as reward after full retirement of the pool.
     */
    retirePool(poolId, epoch) {
        this.tasks.push(() => ({ type: "RetirePool", poolId, epoch }));
        return this;
    }
    withdraw(rewardAddress, amount, redeemer) {
        this.tasks.push(() => {
            const rewards = typeof amount !== "undefined"
                ? Number(amount)
                : undefined;
            return {
                type: "Withdraw",
                withdrawal: { rewardAddress, amount: rewards },
                redeemer,
            };
        });
        return this;
    }
    /** Add a payment or stake key hash as a required signer of the transaction. */
    addSigner(keyHash) {
        this.tasks.push(() => ({ type: "AddSigner", keyHash }));
        return this;
    }
    validFrom(unixTime) {
        this.tasks.push(() => ({ type: "ValidFrom", unixTime }));
        return this;
    }
    validTo(unixTime) {
        this.tasks.push(() => ({ type: "ValidTo", unixTime }));
        return this;
    }
    attachMetadata(label, metadata) {
        this.tasks.push(() => ({
            type: "AttachMetadata",
            metadata: [label, metadata],
        }));
        return this;
    }
    /** Converts strings to bytes if prefixed with **'0x'**. */
    attachMetadataWithConversion(label, metadata) {
        this.tasks.push(() => ({
            type: "AttachMetadataWithConversion",
            metadata: [label, metadata],
        }));
        return this;
    }
    /** Explicitely set the network id in the transaction body. */
    addNetworkId(id) {
        this.tasks.push(() => ({ type: "AddNetworkId", id }));
        return this;
    }
    attachScript(script) {
        this.tasks.push(() => ({
            type: "AttachScript",
            script: script instanceof ScriptUtility ? script.script : script,
        }));
        return this;
    }
    withChangeTo(change) {
        this.tasks.push(() => ({
            type: "WithChangeTo",
            address: change.address,
            datumVariant: change.datumVariant,
        }));
        return this;
    }
    withoutCoinSelection() {
        this.tasks.push(() => ({ type: "WithoutCoinSelection" }));
        return this;
    }
    /** Compose transactions. */
    compose(tx) {
        if (tx)
            this.tasks = this.tasks.concat(tx.tasks);
        return this;
    }
    async commit() {
        const instructions = await this.toInstructions();
        const utxos = await this.lucid.wallet.getUtxos();
        const protocolParameters = await this.lucid.provider
            .getProtocolParameters();
        const address = await this.lucid.wallet.address();
        const instructionSigner = new InstructionBuilder(this.lucid.network, protocolParameters, utxos, { address }).commit(instructions);
        return new TxComplete(this.lucid, instructionSigner);
    }
    async toPartialInstructions() {
        const instructions = await Promise.all(this.tasks.map(async (task) => {
            const instruction = await task(this);
            if (instruction.type === "CollectFrom") {
                instruction.utxos = instruction.utxos.map(({ txHash, outputIndex }) => ({
                    txHash,
                    outputIndex,
                }));
            }
            if (instruction.type === "ReadFrom") {
                instruction.utxos = instruction.utxos.map(({ txHash, outputIndex }) => ({
                    txHash,
                    outputIndex,
                }));
            }
            return instruction;
        }));
        return instructions;
    }
    async toInstructions() {
        const instructions = await Promise.all(this.tasks.map((task) => task(this))).then((instructions) => resolveInstructions(this.lucid, instructions, false));
        return instructions;
    }
}
export function resolveInstructions(lucid, instructions, forceUtxoResolution) {
    return Promise.all(instructions.map(async (instruction) => {
        switch (instruction.type) {
            case "CollectFrom":
            case "ReadFrom": {
                if (forceUtxoResolution) {
                    const utxos = await lucid.utxosByOutRef(instruction.utxos);
                    instruction.utxos = utxos;
                }
                else {
                    const outRefs = instruction.utxos.filter((utxo) => !("address" in utxo));
                    const utxos = [
                        ...instruction.utxos.filter((utxo) => "address" in utxo),
                        ...await lucid.utxosByOutRef(outRefs),
                    ];
                    instruction.utxos = utxos;
                }
                return instruction;
            }
            case "PayTo":
            case "WithChangeTo": {
                if (instruction.address === "{{own}}") {
                    instruction.address = await lucid.wallet.address();
                }
                return instruction;
            }
            case "RegisterStake":
            case "DeregisterStake": {
                if (instruction.rewardAddress === "{{own}}") {
                    const rewardAddress = await lucid.wallet.rewardAddress();
                    if (!rewardAddress) {
                        throw new Error("Wallet does not have a reward address");
                    }
                    instruction.rewardAddress = rewardAddress;
                }
                return instruction;
            }
            case "DelegateTo": {
                if (instruction.delegation.rewardAddress === "{{own}}") {
                    const rewardAddress = await lucid.wallet.rewardAddress();
                    if (!rewardAddress) {
                        throw new Error("Wallet does not have a reward address");
                    }
                    instruction.delegation.rewardAddress = rewardAddress;
                }
                return instruction;
            }
            case "Withdraw": {
                if (instruction.withdrawal.rewardAddress === "{{own}}") {
                    const rewardAddress = await lucid.wallet.rewardAddress();
                    if (!rewardAddress) {
                        throw new Error("Wallet does not have a reward address");
                    }
                    instruction.withdrawal.rewardAddress = rewardAddress;
                }
                if (typeof instruction.withdrawal.amount === "undefined") {
                    instruction.withdrawal.amount = Number((await lucid.delegationAt(instruction.withdrawal.rewardAddress))
                        .rewards);
                }
                return instruction;
            }
            case "AddSigner": {
                const { payment, delegation } = Addresses.inspect(await lucid.wallet.address());
                if (instruction.keyHash === "{{own.payment}}") {
                    instruction.keyHash = payment.hash;
                }
                if (instruction.keyHash === "{{own.delegation}}") {
                    if (!delegation?.hash) {
                        throw new Error("Wallet does not have a reward address");
                    }
                    instruction.keyHash = delegation.hash;
                }
                return instruction;
            }
            default: {
                return instruction;
            }
        }
    }));
}
