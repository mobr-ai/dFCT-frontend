import { Hasher, TxSigned, } from "../mod.js";
export class TxComplete {
    constructor(lucid, instructionSigner) {
        Object.defineProperty(this, "instructionSigner", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
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
        this.instructionSigner = instructionSigner;
        this.tasks = [];
    }
    sign() {
        this.tasks.push(() => {
            return this.lucid.wallet.sign(this.instructionSigner);
        });
        return this;
    }
    signWithPrivateKey(privateKey) {
        this.tasks.push(() => {
            this.instructionSigner.signWithKey(privateKey);
        });
        return this;
    }
    signWithSeed(seed, index) {
        this.tasks.push(() => {
            this.instructionSigner.signWithSeed(seed, index || 0);
        });
        return this;
    }
    /** vkey witness */
    signWithWitness(witness) {
        this.tasks.push(() => {
            this.instructionSigner.signWithWitness(witness);
        });
        return this;
    }
    async partialSign() {
        const witnessSet = await this.lucid.wallet.sign(this.instructionSigner);
        return witnessSet;
    }
    partialSignWithPrivateKey(privateKey) {
        return this.instructionSigner
            .signWithKey(privateKey)
            .getPartialWitnessSet();
    }
    partialSignWithSeed(seed, index) {
        return this.instructionSigner
            .signWithSeed(seed, index)
            .getPartialWitnessSet();
    }
    assemble(witnessSets) {
        this.tasks.push(() => {
            for (const witnessSet of witnessSets) {
                this.instructionSigner.signWithWitnessSet(witnessSet);
            }
        });
        return this;
    }
    async commit() {
        for (const task of this.tasks) {
            await task();
        }
        return new TxSigned(this.lucid, this.instructionSigner.commit());
    }
    toString() {
        return this.instructionSigner.commit().tx;
    }
    toHash() {
        return Hasher.hashTransaction(this.instructionSigner.commit().tx);
    }
}
