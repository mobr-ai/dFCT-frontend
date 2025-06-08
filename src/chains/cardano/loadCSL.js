// chains/cardano/loadCSL.js

let CSL = null;

export async function loadCSL() {
    if (!CSL) {
        CSL = await import("@emurgo/cardano-serialization-lib-browser");
    }
    return CSL;
}