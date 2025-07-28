import { Addresses, Codec, Crypto, Data, fromUnit, InstructionBuilder, InstructionSigner, Message, resolveInstructions, ScriptUtility, toUnit, Tx, TxComplete, } from "../mod.js";
import { signMessage, verifyMessage } from "../misc/sign_message.js";
export class Lucid {
    constructor({ provider, network, wallet } = {}) {
        Object.defineProperty(this, "wallet", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "provider", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "network", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "utils", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        if (provider)
            this.provider = provider;
        this.network = provider?.network || network || "Mainnet";
        const slotConfig = (() => {
            switch (this.network) {
                case "Mainnet":
                    return {
                        zeroTime: 1596059091000,
                        zeroSlot: 4492800,
                        slotLength: 1000,
                    };
                case "Preprod":
                    return {
                        zeroTime: 1655769600000,
                        zeroSlot: 86400,
                        slotLength: 1000,
                    };
                case "Preview":
                    return {
                        zeroTime: 1666656000000,
                        zeroSlot: 0,
                        slotLength: 1000,
                    };
                default:
                    return {
                        zeroTime: this.network.Emulator,
                        zeroSlot: 0,
                        slotLength: 1000,
                    };
            }
        })();
        this.utils = {
            scriptToAddress: Addresses.scriptToAddress.bind(null, this.network),
            credentialToAddress: Addresses.credentialToAddress.bind(null, this.network),
            credentialToRewardAddress: Addresses.credentialToRewardAddress.bind(null, this.network),
            scriptToRewardAddress: Addresses.scriptToRewardAddress.bind(null, this.network),
            unixTimeToSlots: (unixTime) => {
                return Math.floor((unixTime - slotConfig.zeroTime) / slotConfig.slotLength) + slotConfig.zeroSlot;
            },
            slotsToUnixTime: (slots) => {
                return slotConfig.zeroTime +
                    (slots - slotConfig.zeroSlot) * slotConfig.slotLength;
            },
        };
        if (wallet) {
            if ("PrivateKey" in wallet) {
                this.selectWalletFromPrivateKey(wallet.PrivateKey);
            }
            else if ("Seed" in wallet) {
                this.selectWalletFromSeed(wallet.Seed.seed, wallet.Seed.options);
            }
            else if ("Api" in wallet) {
                this.selectWalletFromApi(wallet.Api);
            }
            else if ("ReadOnly" in wallet) {
                this.selectReadOnlyWallet(wallet.ReadOnly);
            }
        }
    }
    newScript(script, params, type) {
        return new ScriptUtility(this, script, params, type);
    }
    newTx() {
        return new Tx(this);
    }
    async fromTx(tx) {
        const utxos = this.wallet ? await this.wallet.getUtxos() : [];
        return new TxComplete(this, InstructionSigner.fromTx(tx, utxos));
    }
    async fromInstructions(instructions, forceUtxoResolution) {
        if (!this.wallet || !this.provider) {
            throw new Error("Wallet or provider not set");
        }
        const utxos = await this.wallet.getUtxos();
        const protocolParameters = await this.provider
            .getProtocolParameters();
        const address = await this.wallet.address();
        const resolvedInstructions = await resolveInstructions(this, instructions, forceUtxoResolution);
        const instructionSigner = new InstructionBuilder(this.network, protocolParameters, utxos, { address }).commit(resolvedInstructions);
        return new TxComplete(this, instructionSigner);
    }
    /** Signs a message. Expects the payload to be Hex encoded. */
    newMessage(address, payload) {
        return new Message(this, address, payload);
    }
    /** Verify a message. Expects the payload to be Hex encoded. */
    verifyMessage(address, payload, signedMessage) {
        return verifyMessage(address, payload, signedMessage);
    }
    utxosAt(addressOrCredential) {
        return this.provider.getUtxos(addressOrCredential);
    }
    utxosAtWithUnit(addressOrCredential, unit) {
        return this.provider.getUtxosWithUnit(addressOrCredential, unit);
    }
    /** Unit needs to be an NFT (or optionally the entire supply in one UTxO). */
    utxoByUnit(unit) {
        return this.provider.getUtxoByUnit(unit);
    }
    utxosByOutRef(outRefs) {
        return this.provider.getUtxosByOutRef(outRefs);
    }
    delegationAt(rewardAddress) {
        return this.provider.getDelegation(rewardAddress);
    }
    awaitTx(txHash, checkInterval = 3000) {
        return this.provider.awaitTx(txHash, checkInterval);
    }
    async datumOf(utxo, type) {
        if (!utxo.datum) {
            if (!utxo.datumHash) {
                throw new Error("This UTxO does not have a datum hash.");
            }
            utxo.datum = await this.provider.getDatum(utxo.datumHash);
        }
        return Data.from(utxo.datum, type);
    }
    /** Query CIP-0068 metadata for a specifc asset. */
    async metadataOf(unit) {
        const { policyId, name, label } = fromUnit(unit);
        switch (label) {
            case 222:
            case 333:
            case 444: {
                const utxo = await this.utxoByUnit(toUnit(policyId, name, 100));
                const metadata = await this.datumOf(utxo);
                return Data.toMetadata(metadata.fields[0]);
            }
            default:
                throw new Error("No variant matched.");
        }
    }
    /**
     * Only an Enteprise address (without stake credential) is derived.
     */
    selectWalletFromPrivateKey(privateKey) {
        const { credential } = Crypto.privateKeyToDetails(privateKey);
        const address = this.utils.credentialToAddress(credential);
        this.wallet = {
            address: () => address,
            rewardAddress: () => null,
            getUtxos: async () => {
                return await this.utxosAt(credential);
            },
            getDelegation: () => {
                return { poolId: null, rewards: 0n };
            },
            sign: (instructionSigner) => {
                return instructionSigner
                    .signWithKey(privateKey)
                    .getPartialWitnessSet();
            },
            signMessage: (address, payload) => {
                const { payment } = Addresses.inspect(address);
                if (payment?.hash !== credential.hash) {
                    throw new Error(`Cannot sign message for address: ${address}.`);
                }
                return signMessage(address, payload, privateKey);
            },
            submit: async (tx) => {
                return await this.provider.submit(tx);
            },
        };
        return this;
    }
    selectWalletFromApi(api) {
        const getAddressRaw = async () => {
            const [addressRaw] = await api.getUsedAddresses();
            if (addressRaw)
                return addressRaw;
            const [unusedAddressRaw] = await api.getUnusedAddresses();
            return unusedAddressRaw;
        };
        this.wallet = {
            address: async () => Addresses.inspect(await getAddressRaw()).address,
            rewardAddress: async () => {
                const [rewardAddressRaw] = await api.getRewardAddresses();
                const rewardAddress = rewardAddressRaw
                    ? Addresses.inspect(rewardAddressRaw).address
                    : null;
                return rewardAddress;
            },
            getUtxos: async () => {
                const utxos = ((await api.getUtxos()) || []).map((utxo) => {
                    return Codec.decodeUtxo(utxo);
                });
                return utxos;
            },
            getDelegation: async () => {
                const rewardAddress = await this.wallet.rewardAddress();
                return rewardAddress
                    ? await this.delegationAt(rewardAddress)
                    : { poolId: null, drep: null, rewards: 0n };
            },
            sign: async (instructionSigner) => {
                const { tx } = instructionSigner.commit();
                const witnessSet = await api.signTx(tx, true);
                instructionSigner.signWithWitnessSet(witnessSet);
                return witnessSet;
            },
            signMessage: async (address, payload) => {
                const { addressRaw } = Addresses.inspect(address);
                return await api.signData(addressRaw, payload);
            },
            submit: async (tx) => {
                const txHash = await api.submitTx(tx);
                return txHash;
            },
        };
        return this;
    }
    /**
     * If utxos are not set, utxos are fetched from the provided address.
     */
    selectReadOnlyWallet({ address, rewardAddress, utxos, }) {
        const { payment, delegation } = Addresses.inspect(address);
        this.wallet = {
            address: () => address,
            rewardAddress: () => {
                return (rewardAddress
                    ? rewardAddress
                    : delegation
                        ? this.utils.credentialToRewardAddress(delegation)
                        : null);
            },
            getUtxos: async () => {
                return utxos ? utxos : await this.utxosAt(payment);
            },
            getDelegation: async () => {
                const rewardAddress = await this.wallet.rewardAddress();
                return rewardAddress
                    ? await this.delegationAt(rewardAddress)
                    : { poolId: null, drep: null, rewards: 0n };
            },
            sign: () => {
                throw new Error("Wallet is read only");
            },
            signMessage: () => {
                throw new Error("Wallet is read only");
            },
            submit: async (tx) => {
                return await this.provider.submit(tx);
            },
        };
        return this;
    }
    /**
     * Select wallet from a seed phrase (e.g. 15 or 24 words). You have the option to choose between a Base address (with stake credential)
     * and Enterprise address (without stake credential). You can also decide which account index to derive. By default account 0 is derived.
     */
    selectWalletFromSeed(seed, options) {
        const index = options?.index || 0;
        if (index < 0)
            throw new Error("Index cannot be negative");
        const paymentDetails = Crypto.seedToDetails(seed, index, "Payment");
        const delegationDetails = options?.addressType === "Enterprise"
            ? null
            : Crypto.seedToDetails(seed, options?.index || 0, "Delegation");
        const address = this.utils.credentialToAddress(paymentDetails.credential, delegationDetails?.credential);
        const rewardAddress = delegationDetails
            ? this.utils.credentialToRewardAddress(delegationDetails.credential)
            : null;
        const paymentKeyHash = paymentDetails.credential.hash;
        const delegationKeyHash = delegationDetails?.credential.hash || "";
        const privKeyMap = {
            [paymentKeyHash]: paymentDetails.privateKey,
            [delegationKeyHash]: delegationDetails?.privateKey,
        };
        this.wallet = {
            address: () => address,
            rewardAddress: () => rewardAddress,
            getUtxos: () => this.utxosAt(paymentDetails.credential),
            getDelegation: async () => {
                const rewardAddress = await this.wallet.rewardAddress();
                return rewardAddress
                    ? await this.delegationAt(rewardAddress)
                    : { poolId: null, drep: null, rewards: 0n };
            },
            sign: (instructionSigner) => {
                return instructionSigner
                    .signWithSeed(seed, index)
                    .getPartialWitnessSet();
            },
            signMessage: (address, payload) => {
                const { payment, delegation, } = Addresses.inspect(address);
                const keyHash = payment?.hash || delegation?.hash;
                const privateKey = privKeyMap[keyHash];
                if (!privateKey) {
                    throw new Error(`Cannot sign message for address: ${address}.`);
                }
                return signMessage(address, payload, privateKey);
            },
            submit: async (tx) => {
                return await this.provider.submit(tx);
            },
        };
        return this;
    }
}
