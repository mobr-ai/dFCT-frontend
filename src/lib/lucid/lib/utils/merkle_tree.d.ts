import { concat, equals } from "../../deps/jsr.io/@std/bytes/1.0.4/mod.js";
type Hash = Uint8Array;
type MerkleProof = Array<{
    left?: Hash;
    right?: Hash;
}>;
export declare class MerkleTree {
    private root;
    /** Construct Merkle tree from data, which get hashed with sha256 */
    constructor(data: Uint8Array[]);
    /** Construct Merkle tree from sha256 hashes */
    static fromHashes(hashes: Hash[]): MerkleTree;
    private build;
    rootHash(): Hash;
    getProof(data: Uint8Array): MerkleProof;
    size(): number;
    static verify(data: Uint8Array, rootHash: Hash, proof: MerkleProof): boolean;
    toString(): string;
}
export { concat, equals };
export declare function sha256(data: Uint8Array): Hash;
export declare function combineHash(hash1: Hash, hash2: Hash): Hash;
