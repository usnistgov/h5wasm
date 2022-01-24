/// <reference path="../dist/esm/hdf5_util.d.ts" />
export declare var Module: Module;
declare const ready: any;
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
    GROUP = "Group"
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
    keys(): any;
    values(): Generator<Group | Dataset, void, unknown>;
    items(): Generator<any[], void, unknown>;
    get_type(obj_path: string): any;
    get(obj_name: string): Group | Dataset;
    create_group(name: string): Group | Dataset;
    create_dataset(name: string, data: any, shape?: Array<number>, dtype?: string): Group | Dataset;
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
    get metadata(): any;
    get dtype(): string | {
        compound: any;
    };
    get shape(): any;
    get value(): any;
    slice(ranges: any): any;
}
