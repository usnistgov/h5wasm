/// <reference path="./emscripten.d.ts" />

export type Status = number;

export interface H5T_class_t {
    H5T_NO_CLASS: {value: -1},     // = -1 /**< error                                   */
    H5T_INTEGER: {value: 0},       //   = 0,  /**< integer types                           */
    H5T_FLOAT: {value: 1},         //     = 1,  /**< floating-point types                    */
    H5T_TIME: {value: 2},          //      = 2,  /**< date and time types                     */
    H5T_STRING: {value: 3},        //    = 3,  /**< character string types                  */
    H5T_BITFIELD: {value: 4},      //  = 4,  /**< bit field types                         */
    H5T_OPAQUE: {value: 5},        //    = 5,  /**< opaque types                            */
    H5T_COMPOUND: {value: 6},      //  = 6,  /**< compound types                          */
    H5T_REFERENCE: {value: 7},     // = 7,  /**< reference types                         */
    H5T_ENUM: {value: 8},          //      = 8,  /**< enumeration types                       */
    H5T_VLEN: {value: 9},          //      = 9,  /**< variable-Length types                   */
    H5T_ARRAY: {value: 10}          //     = 10, /**< array types                             */
}

export interface Metadata {
    signed: boolean,
    cset: number,
    compound_type?: CompoundType,
    vlen: boolean,
    littleEndian: boolean,
    type: number,
    size: number,
    shape?: Array<number>,
    total_size: number
}

export interface CompoundType {
    name: string,
    offset: number,
    members: Array<Metadata>
}

export interface H5Module extends EmscriptenModule {
    create_dataset(file_id: bigint, arg1: string, arg2: bigint, arg3: bigint[], type: number, size: number, signed: boolean, vlen: boolean);
    get_type(file_id: bigint, obj_path: string): number;
    H5O_TYPE_DATASET: number;
    H5O_TYPE_GROUP: number;
    create_group(file_id: bigint, name: string);
    create_vlen_str_dataset(file_id: bigint, dset_name: string, prepared_data: any, arg3: any, type: number, size: number, signed: boolean, vlen: boolean);
    get_dataset_data(file_id: bigint, path: string, arg2: bigint[], arg3: bigint[], arg4: bigint);
    get_dataset_metadata(file_id: bigint, path: string): Metadata;
    flush(file_id: bigint);
    ccall: typeof ccall;
    get_names(file_id: bigint, path: string);
    create_attribute(file_id: bigint, path: string, name: any, arg3: bigint, arg4: any, type: number, size: number, signed: boolean, vlen: boolean);
    create_vlen_str_attribute(file_id: bigint, path: string, name: any, prepared_data: any, arg4: any, type: number, size: number, signed: boolean, vlen: boolean);
    get_attribute_names(file_id: any, path: any);
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
