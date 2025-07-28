import { type Lucid, type SignedMessage } from "../mod.js";
export declare class Message {
    lucid: Lucid;
    address: string;
    payload: string;
    constructor(lucid: Lucid, address: string, payload: string);
    /** Sign message with selected wallet. */
    sign(): Promise<SignedMessage>;
    /** Sign message with a separate private key. */
    signWithPrivateKey(privateKey: string): SignedMessage;
}
