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
    chunks: number[] | null,
    compound_type?: CompoundTypeMetadata,
    cset?: number,
    enum_type?: EnumTypeMetadata,
    vlen_type?: Metadata,
    littleEndian: boolean,
    maxshape: number[] | null,
    ref_type?: 'object' | 'region',
    shape: number[] | null,
    signed: boolean,
    size: number,
    strpad?: number,
    total_size: number,
    type: number,
    virtual_sources?: VirtualSource[],
    vlen: boolean,
}

export interface CompoundMember extends Metadata {
    name: string;
    offset: number;
}

export interface CompoundTypeMetadata {
    members: CompoundMember[]
    nmembers: number;
}

export interface EnumTypeMetadata {
    members: {[key: string]: number};
    nmembers: number;
    type: number;
}

export interface VirtualSource {
    file_name: string;
    dset_name: string;
}

export interface H5Module extends EmscriptenModule {
    open(filename: string, mode?: number, track_order?: boolean): bigint;
    close_file(file_id: bigint): number;
    create_dataset(file_id: bigint, arg1: string, arg2: bigint, shape: bigint[], maxshape: (bigint | null)[], chunks: bigint[] | null, type: number, size: number, signed: boolean, vlen: boolean, compression_id: number, compression_opts: number[], track_order?: boolean): number;
    create_soft_link(file_id: bigint, link_target: string, link_name: string): number;
    create_hard_link(file_id: bigint, link_target: string, link_name: string): number;
    create_external_link(file_id: bigint, file_name: string, link_target: string, link_name: string): number;
    get_type(file_id: bigint, obj_path: string): number;
    get_symbolic_link(file_id: bigint, obj_path: string): string;
    get_external_link(file_id: bigint, obj_path: string): {filename: string, obj_path: string};
    H5O_TYPE_DATASET: number;
    H5O_TYPE_GROUP: number;
    SIZEOF_OBJ_REF: number;
    SIZEOF_DSET_REGION_REF: number;
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
    H5Z_FILTER_NONE: 0;
    H5Z_FILTER_DEFLATE: 1;
    H5Z_FILTER_SHUFFLE: 2;
    H5Z_FILTER_FLETCHER32: 3;
    H5Z_FILTER_SZIP: 4;
    H5Z_FILTER_NBIT: 5;
    H5Z_FILTER_SCALEOFFSET: 6;
    H5Z_FILTER_RESERVED: 256;
    H5Z_FILTER_MAX: 65535;
    create_group(file_id: bigint, name: string, track_order?: boolean): number;
    create_vlen_str_dataset(file_id: bigint, dset_name: string, prepared_data: any, shape: bigint[], maxshape: (bigint | null)[], chunks: bigint[] | null, type: number, size: number, signed: boolean, vlen: boolean, track_order?: boolean): number;
    get_dataset_data(file_id: bigint, path: string, count: bigint[] | null, offset: bigint[] | null, strides: bigint[] | null, rdata_ptr: bigint): number;
    set_dataset_data(file_id: bigint, path: string, count: bigint[] | null, offset: bigint[] | null, strides: bigint[] | null, wdata_ptr: bigint): number;
    refresh_dataset(file_id: bigint, path: string): number;
    resize_dataset(file_id: bigint, path: string, new_size: bigint[]): number;
    get_dataset_metadata(file_id: bigint, path: string): Metadata;
    get_datatype_metadata(file_id: bigint, path: string): Metadata;
    get_dataset_filters(file_id: bigint, path: string): Filter[];
    flush(file_id: bigint): number;
    ccall: typeof ccall;
    get_names(file_id: bigint, path: string, recursive: boolean): string[];
    create_attribute(file_id: bigint, path: string, name: any, arg3: bigint, arg4: any, type: number, size: number, signed: boolean, vlen: boolean): number;
    delete_attribute(file_id: bigint, path: string, name: string): number;
    create_vlen_str_attribute(file_id: bigint, path: string, name: any, prepared_data: any, shape: bigint[], type: number, size: number, signed: boolean, vlen: boolean): number;
    get_attribute_names(file_id: any, path: any): string[];
    // things from ModuleFactory:
    UTF8ToString(ptr: number): string,
    AsciiToString(ptr: number): string,
    H5T_class_t: H5T_class_t,
    reclaim_vlen_memory(file_id: BigInt, obj_name: string, attr_name: string, data_ptr: bigint): Status;
    get_attribute_data(file_id: BigInt, obj_name: string, attr_name: string, arg3: bigint): Status;
    FS: FS.FileSystemType,
    get_keys_vector(group_id: bigint, H5_index_t?: number): string[],
    get_attribute_metadata(loc_id: bigint, group_name_string: string, attribute_name_string: string): Metadata,
    get_plugin_search_paths(): string[],
    insert_plugin_search_path(search_path: string, index: number): number,
    remove_plugin_search_path(index: number): number,
    set_scale(loc_id: bigint, dset_name: string, dim_name: string): number,
    attach_scale(loc_id: bigint, target_dset_name: string, dimscale_dset_name: string, index: number): number,
    detach_scale(loc_id: bigint, target_dset_name: string, dimscale_dset_name: string, index: number): number,
    get_scale_name(loc_id: bigint, dimscale_dset_name: string): string | null,
    get_attached_scales(loc_id: bigint, target_dset_name: string, index: number): string[],
    set_dimension_label(loc_id: bigint, target_dset_name: string, index: number, label: string): number,
    get_dimension_labels(loc_id: bigint, target_dset_name: string): (string | null)[],
    create_object_reference(loc_id: bigint, target_name: string): Uint8Array,
    create_region_reference(file_id: bigint, path: string, count: bigint[] | null, offset: bigint[] | null, strides: bigint[] | null): Uint8Array,
    get_referenced_name(loc_id: bigint, ref_ptr: Uint8Array, is_object: boolean): string;
    get_region_metadata(loc_id: bigint, ref_ptr: Uint8Array): Metadata;
    get_region_data(loc_id: bigint, ref_data: Uint8Array, rdata_ptr: bigint): number;
    activate_throwing_error_handler(): number;
    deactivate_throwing_error_handler(): number;
}

export declare type Filter = {
    id: number; 
    name: string;
    cd_values: number[];
}
