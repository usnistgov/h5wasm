/// <reference path="./emscripten.d.ts" />

export type Status = number;

export interface H5T_class_t {
    H5T_NO_CLASS: {value: -1},     // = -1  /**< error                                   */
    H5T_INTEGER: {value: 0},       // = 0,  /**< integer types                           */
    H5T_FLOAT: {value: 1},         // = 1,  /**< floating-point types                    */
    H5T_TIME: {value: 2},          // = 2,  /**< date and time types                     */
    H5T_STRING: {value: 3},        // = 3,  /**< character string types                  */
    H5T_BITFIELD: {value: 4},      // = 4,  /**< bit field types                         */
    H5T_OPAQUE: {value: 5},        // = 5,  /**< opaque types                            */
    H5T_COMPOUND: {value: 6},      // = 6,  /**< compound types                          */
    H5T_REFERENCE: {value: 7},     // = 7,  /**< reference types                         */
    H5T_ENUM: {value: 8},          // = 8,  /**< enumeration types                       */
    H5T_VLEN: {value: 9},          // = 9,  /**< variable-Length types                   */
    H5T_ARRAY: {value: 10}         // = 10, /**< array types                             */
}

export interface Metadata {
    array_type?: Metadata,
    compound_type?: CompoundTypeMetadata,
    cset: number,
    enum_type?: EnumTypeMetadata,
    littleEndian: boolean,
    shape: Array<number>,
    signed: boolean,
    size: number,
    total_size: number,
    type: number,
    vlen: boolean,
}

export interface CompoundMember extends Metadata {
    name: string;
    offset: number;
}

export interface CompoundTypeMetadata {
    members: Array<CompoundMember>
    nmembers: number;
}

export interface EnumTypeMetadata {
    members: {[key: string]: number};
    nmembers: number;
    type: number;
}

export interface H5Module extends EmscriptenModule {
    create_dataset(file_id: bigint, arg1: string, arg2: bigint, arg3: bigint[], type: number, size: number, signed: boolean, vlen: boolean): number;
    get_type(file_id: bigint, obj_path: string): number;
    get_symbolic_link(file_id: bigint, obj_path: string): string;
    get_external_link(file_id: bigint, obj_path: string): {filename: string, obj_path: string};
    H5O_TYPE_DATASET: number;
    H5O_TYPE_GROUP: number;
    H5G_GROUP: number;
    H5G_DATASET: number;
    H5G_TYPE: number;
    H5G_LINK: number;
    H5G_UDLINK: number;
    H5F_ACC_RDONLY: 0;
    H5F_ACC_RDWR: 1;
    H5F_ACC_TRUNC: 2;
    H5F_ACC_EXCL: 4;
    H5F_ACC_CREAT: 16;
    H5F_ACC_SWMR_WRITE: 32;
    H5F_ACC_SWMR_READ: 64;
    create_group(file_id: bigint, name: string): number;
    create_vlen_str_dataset(file_id: bigint, dset_name: string, prepared_data: any, arg3: any, type: number, size: number, signed: boolean, vlen: boolean): number;
    get_dataset_data(file_id: bigint, path: string, arg2: bigint[] | null, arg3: bigint[] | null, arg4: bigint): number;
    refresh_dataset(file_id: bigint, path: string): number;
    get_dataset_metadata(file_id: bigint, path: string): Metadata;
    flush(file_id: bigint): number;
    ccall: typeof ccall;
    get_names(file_id: bigint, path: string): string[];
    create_attribute(file_id: bigint, path: string, name: any, arg3: bigint, arg4: any, type: number, size: number, signed: boolean, vlen: boolean): number;
    create_vlen_str_attribute(file_id: bigint, path: string, name: any, prepared_data: any, arg4: any, type: number, size: number, signed: boolean, vlen: boolean): number;
    get_attribute_names(file_id: any, path: any): string[];
    // things from ModuleFactory:
    UTF8ToString(ptr: number): string,
    AsciiToString(ptr: number): string,
    H5T_class_t: H5T_class_t,
    reclaim_vlen_memory(file_id: BigInt, obj_name: string, attr_name: string, data_ptr: bigint): Status;
    get_attribute_data(file_id: BigInt, obj_name: string, attr_name: string, arg3: bigint): Status;
    FS: FS.FileSystemType,
    get_keys_vector(group_id: bigint, H5_index_t: number): Array<string>,
    get_attribute_metadata(loc_id: bigint, group_name_string: string, attribute_name_string: string): Metadata
}
