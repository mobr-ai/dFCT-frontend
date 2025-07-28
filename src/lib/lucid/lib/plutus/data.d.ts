import { type Exact, type Json } from "../mod.js";
export declare class Constr<T> {
    index: number;
    fields: T[];
    constructor(index: number, fields: T[]);
}
export type Data = bigint | string | Array<Data> | Map<Data, Data> | Constr<Data>;
export declare const Data: {
    Bytes: (options?: {
        minLength?: number;
        maxLength?: number;
        enum?: string[];
    } | number) => string;
    Integer: () => bigint;
    Boolean: () => boolean;
    Any: () => Data;
    Array: <T>(items: T, options?: {
        minItems?: number;
        maxItems?: number;
        uniqueItems?: boolean;
    } | number) => Array<T>;
    Map: <K, V>(keys: K, values: V, options?: {
        minItems?: number;
        maxItems?: number;
    } | number) => Map<K, V>;
    Object: <T extends Record<string, unknown>>(properties: T, options?: {
        hasConstr?: boolean;
    }) => T;
    Enum: <S extends unknown[], T extends Array<string | {
        [enum_key: string]: [...S];
    } | {
        [enum_key: string]: Record<string, unknown>;
    }>>(...items: T) => T[number];
    Tuple: <T extends unknown[]>(items: [...T], options?: {
        hasConstr?: boolean;
    }) => T;
    Nullable: <T>(item: T) => T | null;
    /**
     * Convert plutus data to cbor encoded data.\
     * Or apply a shape and convert the provided data struct to cbor encoded data.
     */
    to: <T = Data>(data: Exact<T>, type?: T) => string;
    /** Convert cbor encoded data to plutus data */
    from: <T = Data>(raw: string, type?: T) => T;
    /**
     * Note Constr cannot be used here.\
     * Strings prefixed with '0x' are not UTF-8 encoded.
     */
    fromMetadata: (json: Json) => Data;
    /**
     * Note Constr cannot be used here, also only bytes/integers as json keys.
     */
    toMetadata: (plutusData: Data) => Json;
    void: () => string;
    castFrom: <T = Data>(data: Data, type: T) => T;
    castTo: <T>(struct: Exact<T>, type: T) => Data;
};
