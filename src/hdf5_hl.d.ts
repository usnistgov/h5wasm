import type { Status, Metadata, H5Module, CompoundTypeMetadata } from "./hdf5_util_helpers";
export declare var Module: H5Module;
export declare var FS: (FS.FileSystemType | null);
declare const ready: Promise<H5Module>;
export { ready };
export declare const ACCESS_MODES: {
    readonly r: "H5F_ACC_RDONLY";
    readonly a: "H5F_ACC_RDWR";
    readonly w: "H5F_ACC_TRUNC";
    readonly x: "H5F_ACC_EXCL";
    readonly Sw: "H5F_ACC_SWMR_WRITE";
    readonly Sr: "H5F_ACC_SWMR_READ";
};
declare type ACCESS_MODESTRING = keyof typeof ACCESS_MODES;
export declare type OutputData = TypedArray | string | number | bigint | boolean | OutputData[];
export declare type JSONCompatibleOutputData = string | number | boolean | JSONCompatibleOutputData[];
export declare type Dtype = string | {
    compound_type: CompoundTypeMetadata;
} | {
    array_type: Metadata;
};
export type { Metadata };
declare type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | BigInt64Array | BigUint64Array | Float32Array | Float64Array;
export declare type GuessableDataTypes = TypedArray | number | number[] | string | string[];
declare enum OBJECT_TYPE {
    DATASET = "Dataset",
    GROUP = "Group",
    BROKEN_SOFT_LINK = "BrokenSoftLink",
    EXTERNAL_LINK = "ExternalLink"
}
export declare class BrokenSoftLink {
    target: string;
    type: OBJECT_TYPE;
    constructor(target: string);
}
export declare class ExternalLink {
    filename: string;
    obj_path: string;
    type: OBJECT_TYPE;
    constructor(filename: string, obj_path: string);
}
export declare class Attribute {
    file_id: bigint;
    path: string;
    name: string;
    metadata: Metadata;
    dtype: Dtype;
    shape: number[];
    private _value?;
    private _json_value?;
    constructor(file_id: bigint, path: string, name: string);
    get value(): OutputData;
    get json_value(): JSONCompatibleOutputData;
    to_array(): string | number | boolean | JSONCompatibleOutputData[];
}
declare abstract class HasAttrs {
    file_id: bigint;
    path: string;
    type: OBJECT_TYPE;
    get attrs(): {
        [key: string]: Attribute;
    };
    get_attribute(name: string, json_compatible: true): JSONCompatibleOutputData;
    get_attribute(name: string, json_compatible: false): OutputData;
    create_attribute(name: string, data: GuessableDataTypes, shape?: number[] | null, dtype?: string | null): void;
}
export declare class Group extends HasAttrs {
    constructor(file_id: bigint, path: string);
    keys(): Array<string>;
    values(): Generator<BrokenSoftLink | ExternalLink | Group | Dataset | null, void, unknown>;
    items(): Generator<(string | BrokenSoftLink | ExternalLink | Group | Dataset | null)[], void, unknown>;
    get_type(obj_path: string): number;
    get_link(obj_path: string): string;
    get_external_link(obj_path: string): {
        filename: string;
        obj_path: string;
    };
    get(obj_name: string): BrokenSoftLink | ExternalLink | Group | Dataset | null;
    create_group(name: string): Group;
    create_dataset(name: string, data: GuessableDataTypes, shape?: number[] | null, dtype?: string | null): Dataset;
    toString(): string;
}
export declare class File extends Group {
    filename: string;
    mode: ACCESS_MODESTRING;
    constructor(filename: string, mode?: ACCESS_MODESTRING);
    flush(): void;
    close(): Status;
}
export declare class Dataset extends HasAttrs {
    private _metadata?;
    constructor(file_id: bigint, path: string);
    refresh(): void;
    get metadata(): Metadata;
    get dtype(): Dtype;
    get shape(): number[];
    get value(): OutputData;
    get json_value(): JSONCompatibleOutputData;
    slice(ranges: Array<Array<number>>): OutputData;
    to_array(): string | number | boolean | JSONCompatibleOutputData[];
    _value_getter(json_compatible?: boolean): OutputData;
}
export declare const h5wasm: {
    File: typeof File;
    Group: typeof Group;
    Dataset: typeof Dataset;
    ready: Promise<H5Module>;
    ACCESS_MODES: {
        readonly r: "H5F_ACC_RDONLY";
        readonly a: "H5F_ACC_RDWR";
        readonly w: "H5F_ACC_TRUNC";
        readonly x: "H5F_ACC_EXCL";
        readonly Sw: "H5F_ACC_SWMR_WRITE";
        readonly Sr: "H5F_ACC_SWMR_READ";
    };
};
export default h5wasm;
