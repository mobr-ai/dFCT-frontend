import { type Credential, type Data, type Exact, type Lucid, type NativeScript, type Script } from "../mod.js";
export declare class ScriptUtility<T extends unknown[] = Data[]> {
    private lucid;
    script: Script;
    constructor(lucid: Lucid, script: Script | NativeScript, params?: Exact<[...T]>, type?: T);
    toHash(): string;
    toAddress(delegation?: Credential): string;
    toRewardAddress(): string;
    toString(): string;
}
