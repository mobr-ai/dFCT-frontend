import { Codec, fromHex, fromText, toHex, } from "../mod.js";
export class Constr {
    constructor(index, fields) {
        Object.defineProperty(this, "index", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "fields", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.index = index;
        this.fields = fields;
    }
}
export const Data = {
    Bytes: (options) => {
        const bytes = { dataType: "bytes" };
        if (typeof options === "number") {
            bytes.minLength = options;
            bytes.maxLength = options;
        }
        else if (options) {
            Object.entries(options).forEach(([key, value]) => {
                bytes[key] = value;
            });
        }
        return bytes;
    },
    Integer: () => ({ dataType: "integer" }),
    Boolean: () => ({
        anyOf: [
            {
                title: "False",
                dataType: "constructor",
                index: 0,
                fields: [],
            },
            {
                title: "True",
                dataType: "constructor",
                index: 1,
                fields: [],
            },
        ],
    }),
    Any: () => ({ description: "Any Data." }),
    Array: (items, options) => {
        const array = { dataType: "list", items };
        if (typeof options === "number") {
            array.minItems = options;
            array.maxItems = options;
        }
        else if (options) {
            Object.entries(options).forEach(([key, value]) => {
                array[key] = value;
            });
        }
        return array;
    },
    Map: (keys, values, options) => {
        const map = {
            dataType: "map",
            keys,
            values,
        };
        if (typeof options === "number") {
            map.minItems = options;
            map.maxItems = options;
        }
        else if (options) {
            Object.entries(options).forEach(([key, value]) => {
                map[key] = value;
            });
        }
        return map;
    },
    Object: (properties, options) => {
        const object = {
            anyOf: [{
                    dataType: "constructor",
                    index: 0,
                    fields: Object.entries(properties).map(([title, p]) => {
                        if (title[0] !== title[0].toLowerCase()) {
                            throw new Error(`Object requires lower case properties: found ${title}, expected ${title[0].toLowerCase() + title.slice(1)}`);
                        }
                        return { ...p, title };
                    }),
                }],
        };
        object.anyOf[0].hasConstr = typeof options?.hasConstr === "undefined" ||
            options.hasConstr;
        return object;
    },
    Enum: (...items) => {
        const union = {
            anyOf: items.flatMap((item, index) => {
                if (typeof item === "string") {
                    if (item[0] !== item[0].toUpperCase()) {
                        throw new Error(`Enum requires upper case: found ${item}, expected ${item[0].toUpperCase() + item.slice(1)}`);
                    }
                    return { dataType: "constructor", title: item, index, fields: [] };
                }
                else {
                    return Object.entries(item).map(([title, fields], subIndex) => {
                        if (title[0] !== title[0].toUpperCase()) {
                            throw new Error(`Enum requires upper case: found ${title}, expected ${title[0].toUpperCase() + title.slice(1)}`);
                        }
                        return {
                            dataType: "constructor",
                            title,
                            index: index + subIndex,
                            fields: (fields instanceof Array)
                                ? fields
                                : Object.entries(fields).map(([title, value]) => {
                                    if (title[0] !== title[0].toLowerCase()) {
                                        throw new Error(`Enum requires lower case args: found ${title}, expected ${title[0].toUpperCase() + title.slice(1)}`);
                                    }
                                    return { ...value, title };
                                }),
                        };
                    });
                }
            }),
        };
        return union;
    },
    Tuple: (items, options) => {
        const tuple = {
            dataType: "list",
            items,
        };
        if (options) {
            Object.entries(options).forEach(([key, value]) => {
                tuple[key] = value;
            });
        }
        return tuple;
    },
    Nullable: (item) => {
        return {
            anyOf: [
                {
                    title: "Some",
                    description: "An optional value.",
                    dataType: "constructor",
                    index: 0,
                    fields: [
                        item,
                    ],
                },
                {
                    title: "None",
                    description: "Nothing.",
                    dataType: "constructor",
                    index: 1,
                    fields: [],
                },
            ],
        };
    },
    /**
     * Convert plutus data to cbor encoded data.\
     * Or apply a shape and convert the provided data struct to cbor encoded data.
     */
    to: (data, type) => {
        function dataToJson(data) {
            if (typeof data === "bigint")
                return { int: data };
            if (typeof data === "string")
                return { bytes: data };
            if (data instanceof Array)
                return { list: data.map(dataToJson) };
            if (data instanceof Map) {
                return {
                    map: (() => {
                        const map = [];
                        for (const [key, value] of data.entries()) {
                            map.push({ k: dataToJson(key), v: dataToJson(value) });
                        }
                        return map;
                    })(),
                };
            }
            return { constructor: data.index, fields: data.fields.map(dataToJson) };
        }
        const d = type ? Data.castTo(data, type) : data;
        return Codec.encodeData(dataToJson(d));
    },
    /** Convert cbor encoded data to plutus data */
    from: (raw, type) => {
        function jsonToData(json) {
            if ("int" in json)
                return json.int;
            if ("bytes" in json)
                return json.bytes;
            if ("list" in json)
                return json.list.map(jsonToData);
            if ("map" in json) {
                return new Map(json.map.map(({ k, v }) => [jsonToData(k), jsonToData(v)]));
            }
            return new Constr(json.constructor, json.fields.map(jsonToData));
        }
        const data = jsonToData(Codec.decodeData(raw));
        return type ? Data.castFrom(data, type) : data;
    },
    /**
     * Note Constr cannot be used here.\
     * Strings prefixed with '0x' are not UTF-8 encoded.
     */
    fromMetadata: (json) => {
        function toData(json) {
            if (typeof json === "string") {
                return json.startsWith("0x")
                    ? toHex(fromHex(json.slice(2)))
                    : fromText(json);
            }
            if (typeof json === "number")
                return BigInt(json);
            if (typeof json === "bigint")
                return json;
            if (json instanceof Array)
                return json.map((v) => toData(v));
            if (json instanceof Object) {
                const tempMap = new Map();
                Object.entries(json).forEach(([key, value]) => {
                    tempMap.set(toData(key), toData(value));
                });
                return tempMap;
            }
            throw new Error("Unsupported type");
        }
        return toData(json);
    },
    /**
     * Note Constr cannot be used here, also only bytes/integers as json keys.
     */
    toMetadata: (plutusData) => {
        function fromData(data) {
            if (typeof data === "bigint" ||
                typeof data === "number" ||
                (typeof data === "string" &&
                    !isNaN(parseInt(data)) &&
                    data.slice(-1) === "n")) {
                const bigint = typeof data === "string"
                    ? BigInt(data.slice(0, -1))
                    : data;
                return parseInt(bigint.toString());
            }
            if (typeof data === "string") {
                try {
                    return new TextDecoder(undefined, { fatal: true }).decode(fromHex(data));
                }
                catch (_) {
                    return "0x" + toHex(fromHex(data));
                }
            }
            if (data instanceof Array)
                return data.map((v) => fromData(v));
            if (data instanceof Map) {
                const tempJson = {};
                data.forEach((value, key) => {
                    const convertedKey = fromData(key);
                    if (typeof convertedKey !== "string" &&
                        typeof convertedKey !== "number") {
                        throw new Error("Unsupported type (Note: Only bytes or integers can be keys of a JSON object)");
                    }
                    tempJson[convertedKey] = fromData(value);
                });
                return tempJson;
            }
            throw new Error("Unsupported type (Note: Constructor cannot be converted to JSON)");
        }
        return fromData(plutusData);
    },
    void: () => {
        return "d87980";
    },
    castFrom: (data, type) => {
        const schema = type;
        if (!schema)
            throw new Error("Could not type cast data.");
        const { shape, definitions } = schema.definitions
            ? schema
            : { shape: schema, definitions: {} };
        function castFromHelper(data, type) {
            const shape = type;
            if (!shape)
                throw new Error("Could not type cast data.");
            const shapeType = (shape.anyOf ? "enum" : shape["$ref"] ? "$ref" : "") ||
                shape.dataType;
            switch (shapeType) {
                case "$ref": {
                    const definition = definitions[shape["$ref"].split("#/definitions/")[1]];
                    return castFromHelper(data, definition);
                }
                case "integer": {
                    if (typeof data !== "bigint") {
                        throw new Error("Could not type cast to integer.");
                    }
                    integerConstraints(data, shape);
                    return data;
                }
                case "bytes": {
                    if (typeof data !== "string") {
                        throw new Error("Could not type cast to bytes.");
                    }
                    bytesConstraints(data, shape);
                    return data;
                }
                case "constructor": {
                    if (isVoid(shape)) {
                        if (!(data instanceof Constr) || data.index !== 0 ||
                            data.fields.length !== 0) {
                            throw new Error("Could not type cast to void.");
                        }
                        return undefined;
                    }
                    else if (data instanceof Constr && data.index === shape.index &&
                        (shape.hasConstr || shape.hasConstr === undefined)) {
                        const fields = {};
                        if (shape.fields.length !== data.fields.length) {
                            throw new Error("Could not type cast to object. Fields do not match.");
                        }
                        shape.fields.forEach((field, fieldIndex) => {
                            const title = field.title || "wrapper";
                            if ((/[A-Z]/.test(title[0]))) {
                                throw new Error("Could not type cast to object. Object properties need to start with a lowercase letter.");
                            }
                            fields[title] = castFromHelper(data.fields[fieldIndex], field);
                        });
                        return fields;
                    }
                    else if (data instanceof Array && !shape.hasConstr &&
                        shape.hasConstr !== undefined) {
                        const fields = {};
                        if (shape.fields.length !== data.length) {
                            throw new Error("Could not ype cast to object. Fields do not match.");
                        }
                        shape.fields.forEach((field, fieldIndex) => {
                            const title = field.title || "wrapper";
                            if ((/[A-Z]/.test(title[0]))) {
                                throw new Error("Could not type cast to object. Object properties need to start with a lowercase letter.");
                            }
                            fields[title] = castFromHelper(data[fieldIndex], field);
                        });
                        return fields;
                    }
                    throw new Error("Could not type cast to object.");
                }
                case "enum": {
                    // When enum has only one entry it's a single constructor/record object
                    if (shape.anyOf.length === 1) {
                        return castFromHelper(data, shape.anyOf[0]);
                    }
                    if (!(data instanceof Constr)) {
                        throw new Error("Could not type cast to enum.");
                    }
                    const enumShape = shape.anyOf.find((entry) => entry.index === data.index);
                    if (!enumShape || enumShape.fields.length !== data.fields.length) {
                        throw new Error("Could not type cast to enum.");
                    }
                    if (isBoolean(shape)) {
                        if (data.fields.length !== 0) {
                            throw new Error("Could not type cast to boolean.");
                        }
                        switch (data.index) {
                            case 0:
                                return false;
                            case 1:
                                return true;
                        }
                        throw new Error("Could not type cast to boolean.");
                    }
                    else if (isNullable(shape)) {
                        switch (data.index) {
                            case 0: {
                                if (data.fields.length !== 1) {
                                    throw new Error("Could not type cast to nullable object.");
                                }
                                return castFromHelper(data.fields[0], shape.anyOf[0].fields[0]);
                            }
                            case 1: {
                                if (data.fields.length !== 0) {
                                    throw new Error("Could not type cast to nullable object.");
                                }
                                return null;
                            }
                        }
                        throw new Error("Could not type cast to nullable object.");
                    }
                    switch (enumShape.dataType) {
                        case "constructor": {
                            if (enumShape.fields.length === 0) {
                                if (/[A-Z]/.test(enumShape.title[0])) {
                                    return enumShape.title;
                                }
                                throw new Error("Could not type cast to enum.");
                            }
                            else {
                                if (!(/[A-Z]/.test(enumShape.title))) {
                                    throw new Error("Could not type cast to enum. Enums need to start with an uppercase letter.");
                                }
                                if (enumShape.fields.length !== data.fields.length) {
                                    throw new Error("Could not type cast to enum.");
                                }
                                // check if named args
                                const args = enumShape.fields[0].title
                                    ? Object.fromEntries(enumShape.fields.map((field, index) => [
                                        field.title,
                                        castFromHelper(data.fields[index], field),
                                    ]))
                                    : enumShape.fields.map((field, index) => castFromHelper(data.fields[index], field));
                                return {
                                    [enumShape.title]: args,
                                };
                            }
                        }
                    }
                    throw new Error("Could not type cast to enum.");
                }
                case "list": {
                    if (shape.items instanceof Array) {
                        // tuple
                        if (data instanceof Constr &&
                            data.index === 0 &&
                            shape.hasConstr) {
                            return data.fields.map((field, index) => castFromHelper(field, shape.items[index]));
                        }
                        else if (data instanceof Array && !shape.hasConstr) {
                            return data.map((field, index) => castFromHelper(field, shape.items[index]));
                        }
                        throw new Error("Could not type cast to tuple.");
                    }
                    else {
                        // array
                        if (!(data instanceof Array)) {
                            throw new Error("Could not type cast to array.");
                        }
                        listConstraints(data, shape);
                        return data.map((field) => castFromHelper(field, shape.items));
                    }
                }
                case "map": {
                    if (!(data instanceof Map)) {
                        throw new Error("Could not type cast to map.");
                    }
                    mapConstraints(data, shape);
                    const map = new Map();
                    for (const [key, value] of data
                        .entries()) {
                        map.set(castFromHelper(key, shape.keys), castFromHelper(value, shape.values));
                    }
                    return map;
                }
                case undefined: {
                    return data;
                }
            }
            throw new Error("Could not type cast data.");
        }
        return castFromHelper(data, shape);
    },
    castTo: (struct, type) => {
        const schema = type;
        if (!schema)
            throw new Error("Could not type cast data.");
        const { shape, definitions } = schema.definitions
            ? schema
            : { shape: schema, definitions: {} };
        function castToHelper(struct, type) {
            const shape = type;
            if (!shape)
                throw new Error("Could not type cast struct.");
            const shapeType = (shape.anyOf ? "enum" : shape["$ref"] ? "$ref" : "") ||
                shape.dataType;
            switch (shapeType) {
                case "$ref": {
                    const definition = definitions[shape["$ref"].split("#/definitions/")[1]];
                    return castToHelper(struct, definition);
                }
                case "integer": {
                    if (typeof struct !== "bigint") {
                        throw new Error("Could not type cast to integer.");
                    }
                    integerConstraints(struct, shape);
                    return struct;
                }
                case "bytes": {
                    if (typeof struct !== "string") {
                        throw new Error("Could not type cast to bytes.");
                    }
                    bytesConstraints(struct, shape);
                    return struct;
                }
                case "constructor": {
                    if (isVoid(shape)) {
                        if (struct !== undefined) {
                            throw new Error("Could not type cast to void.");
                        }
                        return new Constr(0, []);
                    }
                    else if (typeof struct !== "object" || struct === null ||
                        shape.fields.length !== Object.keys(struct).length) {
                        throw new Error("Could not type cast to constructor.");
                    }
                    const fields = shape.fields.map((field) => castToHelper(struct[field.title || "wrapper"], field));
                    return (shape.hasConstr || shape.hasConstr === undefined)
                        ? new Constr(shape.index, fields)
                        : fields;
                }
                case "enum": {
                    // When enum has only one entry it's a single constructor/record object
                    if (shape.anyOf.length === 1) {
                        return castToHelper(struct, shape.anyOf[0]);
                    }
                    if (isBoolean(shape)) {
                        if (typeof struct !== "boolean") {
                            throw new Error("Could not type cast to boolean.");
                        }
                        return new Constr(struct ? 1 : 0, []);
                    }
                    else if (isNullable(shape)) {
                        if (struct === null)
                            return new Constr(1, []);
                        else {
                            const fields = shape.anyOf[0].fields;
                            if (fields.length !== 1) {
                                throw new Error("Could not type cast to nullable object.");
                            }
                            return new Constr(0, [
                                castToHelper(struct, fields[0]),
                            ]);
                        }
                    }
                    switch (typeof struct) {
                        case "string": {
                            if (!(/[A-Z]/.test(struct[0]))) {
                                throw new Error("Could not type cast to enum. Enum needs to start with an uppercase letter.");
                            }
                            const enumIndex = shape.anyOf.findIndex((s) => s.dataType === "constructor" &&
                                s.fields.length === 0 &&
                                s.title === struct);
                            if (enumIndex === -1) {
                                throw new Error("Could not type cast to enum.");
                            }
                            return new Constr(enumIndex, []);
                        }
                        case "object": {
                            if (struct === null) {
                                throw new Error("Could not type cast to enum.");
                            }
                            const structTitle = Object.keys(struct)[0];
                            if (!(/[A-Z]/.test(structTitle))) {
                                throw new Error("Could not type cast to enum. Enum needs to start with an uppercase letter.");
                            }
                            const enumEntry = shape.anyOf.find((s) => s.dataType === "constructor" &&
                                s.title === structTitle);
                            if (!enumEntry)
                                throw new Error("Could not type cast to enum.");
                            const args = struct[structTitle];
                            return new Constr(enumEntry.index, 
                            // check if named args
                            args instanceof Array
                                ? args.map((item, index) => castToHelper(item, enumEntry.fields[index]))
                                : enumEntry.fields.map((entry) => {
                                    const [_, item] = Object.entries(args)
                                        .find(([title]) => title === entry.title);
                                    return castToHelper(item, entry);
                                }));
                        }
                    }
                    throw new Error("Could not type cast to enum.");
                }
                case "list": {
                    if (!(struct instanceof Array)) {
                        throw new Error("Could not type cast to array/tuple.");
                    }
                    if (shape.items instanceof Array) {
                        // tuple
                        const fields = struct.map((item, index) => castToHelper(item, shape.items[index]));
                        return shape.hasConstr ? new Constr(0, fields) : fields;
                    }
                    else {
                        // array
                        listConstraints(struct, shape);
                        return struct.map((item) => castToHelper(item, shape.items));
                    }
                }
                case "map": {
                    if (!(struct instanceof Map)) {
                        throw new Error("Could not type cast to map.");
                    }
                    mapConstraints(struct, shape);
                    const map = new Map();
                    for (const [key, value] of struct
                        .entries()) {
                        map.set(castToHelper(key, shape.keys), castToHelper(value, shape.values));
                    }
                    return map;
                }
                case undefined: {
                    return struct;
                }
            }
            throw new Error("Could not type cast struct.");
        }
        return castToHelper(struct, shape);
    },
};
function integerConstraints(integer, shape) {
    if (shape.minimum && integer < BigInt(shape.minimum)) {
        throw new Error(`Integer ${integer} is below the minimum ${shape.minimum}.`);
    }
    if (shape.maximum && integer > BigInt(shape.maximum)) {
        throw new Error(`Integer ${integer} is above the maxiumum ${shape.maximum}.`);
    }
    if (shape.exclusiveMinimum && integer <= BigInt(shape.exclusiveMinimum)) {
        throw new Error(`Integer ${integer} is below the exclusive minimum ${shape.exclusiveMinimum}.`);
    }
    if (shape.exclusiveMaximum && integer >= BigInt(shape.exclusiveMaximum)) {
        throw new Error(`Integer ${integer} is above the exclusive maximum ${shape.exclusiveMaximum}.`);
    }
}
function bytesConstraints(bytes, shape) {
    if (shape.enum && !shape.enum.some((keyword) => keyword === bytes))
        throw new Error(`None of the keywords match with '${bytes}'.`);
    if (shape.minLength && bytes.length / 2 < shape.minLength) {
        throw new Error(`Bytes need to have a length of at least ${shape.minLength} bytes.`);
    }
    if (shape.maxLength && bytes.length / 2 > shape.maxLength) {
        throw new Error(`Bytes can have a length of at most ${shape.minLength} bytes.`);
    }
}
function listConstraints(list, shape) {
    if (shape.minItems && list.length < shape.minItems) {
        throw new Error(`Array needs to contain at least ${shape.minItems} items.`);
    }
    if (shape.maxItems && list.length > shape.maxItems) {
        throw new Error(`Array can contain at most ${shape.maxItems} items.`);
    }
    if (shape.uniqueItems && (new Set(list)).size !== list.length) {
        // Note this only works for primitive types like string and bigint.
        throw new Error("Array constains duplicates.");
    }
}
function mapConstraints(map, shape) {
    if (shape.minItems && map.size < shape.minItems) {
        throw new Error(`Map needs to contain at least ${shape.minItems} items.`);
    }
    if (shape.maxItems && map.size > shape.maxItems) {
        throw new Error(`Map can contain at most ${shape.maxItems} items.`);
    }
}
function isBoolean(shape) {
    return shape.anyOf && shape.anyOf[0]?.title === "False" &&
        shape.anyOf[1]?.title === "True";
}
function isVoid(shape) {
    return shape.index === 0 && shape.fields.length === 0;
}
function isNullable(shape) {
    return shape.anyOf && shape.anyOf[0]?.title === "Some" &&
        shape.anyOf[1]?.title === "None";
}
