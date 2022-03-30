import type { Status, Metadata, H5Module } from "./hdf5_util_helpers";
export declare var Module: H5Module;
export default Module;
export declare var FS: FS.FileSystemType;
declare const ready: Promise<void>;
export { ready };
export declare const ACCESS_MODES: {
    readonly r: "H5F_ACC_RDONLY";
    readonly a: "H5F_ACC_RDWR";
    readonly w: "H5F_ACC_TRUNC";
    readonly x: "H5F_ACC_EXCL";
    readonly c: "H5F_ACC_CREAT";
    readonly Sw: "H5F_ACC_SWMR_WRITE";
    readonly Sr: "H5F_ACC_SWMR_READ";
};
declare type ACCESS_MODESTRING = keyof typeof ACCESS_MODES;
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
declare class HasAttrs {
    file_id: bigint;
    path: string;
    type: OBJECT_TYPE;
    get attrs(): {};
    get_attribute(name: any): void;
    create_attribute(name: any, data: any, shape?: any, dtype?: any): void;
}
export declare class Group extends HasAttrs {
    constructor(file_id: any, path: any);
    keys(): Array<string>;
    values(): Generator<BrokenSoftLink | ExternalLink | Group | Dataset, void, unknown>;
    items(): Generator<(string | BrokenSoftLink | ExternalLink | Group | Dataset)[], void, unknown>;
    get_type(obj_path: string): number;
    get_link(obj_path: string): string;
    get_external_link(obj_path: string): {
        filename: string;
        obj_path: string;
    };
    get(obj_name: string): BrokenSoftLink | ExternalLink | Group | Dataset;
    create_group(name: string): Group;
    create_dataset(name: string, data: any, shape?: Array<number>, dtype?: string): Dataset;
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
    constructor(file_id: any, path: any);
    get metadata(): Metadata;
    get dtype(): string | {
        compound: any;
    };
    get shape(): number[];
    get value(): any;
    slice(ranges: Array<Array<number>>): any;
}
