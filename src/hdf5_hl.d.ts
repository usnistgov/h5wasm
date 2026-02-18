import type { Status, Metadata, H5Module, CompoundMember, CompoundTypeMetadata, EnumTypeMetadata, Filter } from "./hdf5_util_helpers.js";
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
type ACCESS_MODESTRING = keyof typeof ACCESS_MODES;
export declare const LIBVER_BOUNDS_MAP: {
    readonly earliest: "H5F_LIBVER_EARLIEST";
    readonly v108: "H5F_LIBVER_V18";
    readonly v110: "H5F_LIBVER_V110";
    readonly v112: "H5F_LIBVER_V112";
    readonly v114: "H5F_LIBVER_V114";
    readonly v200: "H5F_LIBVER_V200";
    readonly latest: "H5F_LIBVER_LATEST";
};
export type LIBVER_BOUND = keyof typeof LIBVER_BOUNDS_MAP;
export type LIBVER_BOUNDS = LIBVER_BOUND | [LIBVER_BOUND, LIBVER_BOUND];
export declare function convertToLibverString(value: number): LIBVER_BOUND;
export type OutputData = TypedArray | string | number | bigint | boolean | Reference | RegionReference | OutputData[];
export type JSONCompatibleOutputData = string | number | boolean | JSONCompatibleOutputData[];
export type Dtype = string | {
    compound_type: CompoundTypeMetadata;
} | {
    array_type: Metadata;
};
export type { Metadata, Filter, CompoundMember, CompoundTypeMetadata, EnumTypeMetadata };
type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | BigInt64Array | BigUint64Array | Float32Array | Float64Array;
/**
 * Describes an array slice.
 * `[]` - all data
 * `[i0]` - select all data starting from the index `i0`
 * `[i0, i1]` - select all data in the range `i0` to `i1`
 * `[i0, i1, s]` - select every `s` values in the range `i0` to `i1`
 **/
type SliceElement = number | null;
type Slice = [] | [SliceElement] | [SliceElement, SliceElement] | [SliceElement, SliceElement, SliceElement];
export type GuessableDataTypes = TypedArray | number | number[] | string | string[] | Reference | Reference[] | RegionReference | RegionReference[];
declare enum OBJECT_TYPE {
    DATASET = "Dataset",
    GROUP = "Group",
    BROKEN_SOFT_LINK = "BrokenSoftLink",
    EXTERNAL_LINK = "ExternalLink",
    DATATYPE = "Datatype",
    REFERENCE = "Reference",
    REGION_REFERENCE = "RegionReference"
}
export type Entity = Dataset | Group | BrokenSoftLink | ExternalLink | Datatype | Reference | RegionReference;
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
export declare class Reference {
    ref_data: Uint8Array;
    constructor(ref_data: Uint8Array);
}
export declare class RegionReference extends Reference {
}
export declare class Attribute {
    file_id: bigint;
    path: string;
    name: string;
    metadata: Metadata;
    dtype: Dtype;
    shape: number[] | null;
    private _value?;
    private _json_value?;
    constructor(file_id: bigint, path: string, name: string);
    get value(): OutputData | null;
    get json_value(): JSONCompatibleOutputData | null;
    to_array(): JSONCompatibleOutputData | null;
}
declare abstract class HasAttrs {
    file_id: bigint;
    path: string;
    type: OBJECT_TYPE;
    get attrs(): Record<string, Attribute>;
    get root(): Group;
    get parent(): Group;
    get_attribute(name: string, json_compatible: true): JSONCompatibleOutputData;
    get_attribute(name: string, json_compatible: false): OutputData;
    create_attribute(name: string, data: GuessableDataTypes, shape?: number[] | null, dtype?: string | null): void;
    delete_attribute(name: string): number;
    create_reference(): Reference;
    dereference(ref: RegionReference): DatasetRegion;
    dereference(ref: Reference | RegionReference): DatasetRegion | Entity | null;
}
export declare class Datatype extends HasAttrs {
    constructor(file_id: bigint, path: string);
    get metadata(): Metadata;
}
export declare class Group extends HasAttrs {
    constructor(file_id: bigint, path: string);
    keys(): string[];
    values(): Generator<Entity | null, void, never>;
    items(): Generator<[string, Entity | null], void, never>;
    get_type(obj_path: string): number;
    get_link(obj_path: string): string;
    get_external_link(obj_path: string): {
        filename: string;
        obj_path: string;
    };
    get(obj_name: string): Entity | null;
    create_group(name: string, track_order?: boolean): Group;
    create_dataset(args: {
        name: string;
        data: GuessableDataTypes;
        shape?: number[] | null;
        dtype?: string | null;
        maxshape?: (number | null)[] | null;
        chunks?: number[] | null;
        compression?: (number | 'gzip');
        compression_opts?: number | number[];
        track_order?: boolean;
    }): Dataset;
    create_soft_link(target: string, name: string): number;
    create_hard_link(target: string, name: string): number;
    create_external_link(file_name: string, target: string, name: string): number;
    toString(): string;
    paths(): string[];
}
export interface FileOptions {
    track_order?: boolean;
    libver?: LIBVER_BOUNDS;
}
export declare class File extends Group {
    filename: string;
    mode: ACCESS_MODESTRING;
    constructor(filename: string, mode?: ACCESS_MODESTRING, options?: FileOptions);
    /** @deprecated Use the `FileOptions` object overload instead: `new File(filename, mode, { track_order })` */
    constructor(filename: string, mode?: ACCESS_MODESTRING, track_order?: boolean);
    get libver(): [LIBVER_BOUND, LIBVER_BOUND];
    flush(): void;
    close(): Status;
}
export declare class Dataset extends HasAttrs {
    private _metadata?;
    constructor(file_id: bigint, path: string);
    refresh(): void;
    get metadata(): Metadata;
    get dtype(): Dtype;
    get shape(): number[] | null;
    get filters(): Filter[];
    get value(): OutputData | null;
    get json_value(): JSONCompatibleOutputData | null;
    slice(ranges: Slice[]): OutputData | null;
    write_slice(ranges: Slice[], data: any): void;
    create_region_reference(ranges: Slice[]): RegionReference;
    to_array(): JSONCompatibleOutputData | null;
    resize(new_shape: number[]): number;
    make_scale(scale_name?: string): void;
    attach_scale(index: number, scale_dset_path: string): void;
    detach_scale(index: number, scale_dset_path: string): void;
    get_attached_scales(index: number): string[];
    get_scale_name(): string | null;
    set_dimension_label(index: number, label: string): void;
    get_dimension_labels(): (string | null)[];
    _value_getter(json_compatible?: false): OutputData | null;
    _value_getter(json_compatible: true): JSONCompatibleOutputData | null;
    _value_getter(json_compatible: boolean): OutputData | JSONCompatibleOutputData | null;
}
export declare class DatasetRegion {
    source_dataset: Dataset;
    region_reference: RegionReference;
    private _metadata?;
    constructor(source_dataset: Dataset, region_reference: RegionReference);
    get metadata(): Metadata;
    get value(): OutputData | null;
    _value_getter(json_compatible?: false): OutputData | null;
    _value_getter(json_compatible: true): JSONCompatibleOutputData | null;
    _value_getter(json_compatible: boolean): OutputData | JSONCompatibleOutputData | null;
}
export declare const h5wasm: {
    File: typeof File;
    Group: typeof Group;
    Dataset: typeof Dataset;
    Datatype: typeof Datatype;
    DatasetRegion: typeof DatasetRegion;
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
