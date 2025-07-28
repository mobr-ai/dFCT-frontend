import { applyParamsToScript, Codec, Hasher, } from "../mod.js";
export class ScriptUtility {
    constructor(lucid, script, params, type) {
        Object.defineProperty(this, "lucid", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "script", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.lucid = lucid;
        if (script.type && "script" in script) {
            if (script.type !== "Native" && params) {
                const scriptWithParams = applyParamsToScript(params, script.script, type);
                this.script = { type: script.type, script: scriptWithParams };
            }
            else {
                this.script = script;
            }
        }
        else {
            this.script = {
                type: "Native",
                script: Codec.encodeNativeScript(script),
            };
        }
    }
    toHash() {
        return Hasher.hashScript(this.script);
    }
    toAddress(delegation) {
        return this.lucid.utils.scriptToAddress(this.script, delegation);
    }
    toRewardAddress() {
        return this.lucid.utils.scriptToRewardAddress(this.script);
    }
    toString() {
        return this.script.script;
    }
}
