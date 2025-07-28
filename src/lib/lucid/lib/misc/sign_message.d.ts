import { type SignedMessage } from "../mod.js";
export declare function signMessage(address: string, payload: string, privateKey: string): SignedMessage;
export declare function verifyMessage(address: string, payload: string, signedMessage: SignedMessage): boolean;
