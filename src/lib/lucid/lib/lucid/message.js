import { Addresses, Crypto } from "../mod.js";
import { signMessage } from "../misc/sign_message.js";
export class Message {
    constructor(lucid, address, payload) {
        Object.defineProperty(this, "lucid", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "address", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payload", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.lucid = lucid;
        this.address = address;
        this.payload = payload;
    }
    /** Sign message with selected wallet. */
    sign() {
        return this.lucid.wallet.signMessage(this.address, this.payload);
    }
    /** Sign message with a separate private key. */
    signWithPrivateKey(privateKey) {
        const { payment, delegation } = Addresses.inspect(this.address);
        const keyHash = payment?.hash || delegation?.hash;
        const { credential: { hash } } = Crypto.privateKeyToDetails(privateKey);
        if (!keyHash || keyHash !== hash) {
            throw new Error(`Cannot sign message for address: ${this.address}.`);
        }
        return signMessage(this.address, this.payload, privateKey);
    }
}
