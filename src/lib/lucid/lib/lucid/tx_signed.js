import { Hasher } from "../mod.js";
export class TxSigned {
    constructor(lucid, signerResult) {
        Object.defineProperty(this, "signerResult", {
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
        this.signerResult = signerResult;
    }
    async submit() {
        const provider = this.lucid.wallet || this.lucid.provider;
        return await provider.submit(this.signerResult.tx);
    }
    toWitnessSet() {
        return this.signerResult.witnessSet;
    }
    toString() {
        return this.signerResult.tx;
    }
    toHash() {
        return Hasher.hashTransaction(this.signerResult.tx);
    }
}
