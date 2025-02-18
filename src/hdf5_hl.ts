import type {Status, Metadata, H5Module, CompoundMember, CompoundTypeMetadata, EnumTypeMetadata, Filter} from "./hdf5_util_helpers.js";

import ModuleFactory from './hdf5_util.js';

export var Module: H5Module; //: H5WasmModule = null;
export var FS: (FS.FileSystemType | null) = null;

const ready = ModuleFactory({ noInitialRun: true }).then(result => { Module = result; FS = Module.FS; return Module });
export { ready };

export const ACCESS_MODES = {
  "r": "H5F_ACC_RDONLY",
  "a": "H5F_ACC_RDWR",
  "w": "H5F_ACC_TRUNC",
  "x": "H5F_ACC_EXCL",
  "Sw": "H5F_ACC_SWMR_WRITE",
  "Sr": "H5F_ACC_SWMR_READ"
} as const;

type ACCESS_MODESTRING = keyof typeof ACCESS_MODES;

function normalizePath(path: string) {
  if (path == "/") { return path }
  // replace multiple path separators with single
  path = path.replace(/\/(\/)+/g, '/');
  // strip end slashes
  path = path.replace(/(\/)+$/, '');
  return path;
}

function dirname(path: string) {
  // adapted from dirname function in posixpath.py
  const sep = "/";
  const sep_index = path.lastIndexOf(sep) + 1;
  let head = path.slice(0, sep_index);
  if (head && head !== sep.repeat(head.length)) {
    // strip end slashes
    head = head.replace(/(\/)+$/, '');
  }
  return head;
}

function get_attr(file_id: bigint, obj_name: string, attr_name: string, json_compatible: true): JSONCompatibleOutputData | null;
function get_attr(file_id: bigint, obj_name: string, attr_name: string, json_compatible: false): OutputData | null;
function get_attr(file_id: bigint, obj_name: string, attr_name: string, json_compatible: boolean): OutputData | JSONCompatibleOutputData | null;
function get_attr(file_id: bigint, obj_name: string, attr_name: string, json_compatible: boolean = false): OutputData | JSONCompatibleOutputData | null {
  let metadata = Module.get_attribute_metadata(file_id, obj_name, attr_name);
  if (!metadata.shape) {
    return null;
  }

  let nbytes = metadata.size * metadata.total_size;
  let data_ptr = Module._malloc(nbytes);
  var processed;
  try {
    Module.get_attribute_data(file_id, obj_name, attr_name, BigInt(data_ptr));
    let data = Module.HEAPU8.slice(data_ptr, data_ptr + nbytes);
    processed = process_data(data, metadata, json_compatible);
  } finally {
    if (metadata.vlen) {
      Module.reclaim_vlen_memory(file_id, obj_name, attr_name, BigInt(data_ptr));
    }
    Module._free(data_ptr);
  }
  if (json_compatible) {
    return processed as JSONCompatibleOutputData;
  }
  return processed;
}

function getAccessor(type: 0 | 1, size: Metadata["size"], signed: Metadata["signed"]): TypedArrayConstructor {
  if (type === 0) {
    if (size === 8) {
      return (signed) ? BigInt64Array : BigUint64Array;
    }
    else if (size === 4) {
      return (signed) ? Int32Array : Uint32Array;
    }
    else if (size === 2) {
      return (signed) ? Int16Array : Uint16Array;
    }
    else { // size === 1
      return (signed) ? Int8Array : Uint8Array;
    }
  }
  else { // type ==== 1 (float)
    if (size === 8) {
      return Float64Array;
    }
    else if (size === 4) {
      return Float32Array;
    }
    else {
      throw new Error(`Float${size * 8} not supported`);
    }
  }
}

export type OutputData = TypedArray | string | number | bigint | boolean | Reference | RegionReference | OutputData[];
export type JSONCompatibleOutputData = string | number | boolean | JSONCompatibleOutputData[];
export type Dtype = string | {compound_type: CompoundTypeMetadata} | {array_type: Metadata};
export type { Metadata, Filter, CompoundMember, CompoundTypeMetadata, EnumTypeMetadata };

function process_data(data: Uint8Array, metadata: Metadata, json_compatible: true): JSONCompatibleOutputData;
function process_data(data: Uint8Array, metadata: Metadata, json_compatible: false): OutputData;
function process_data(data: Uint8Array, metadata: Metadata, json_compatible: boolean): OutputData | JSONCompatibleOutputData;
function process_data(data: Uint8Array, metadata: Metadata, json_compatible: boolean = false): OutputData | JSONCompatibleOutputData {
    // (for data coming out of Module)
  // If an appropriate TypedArray container can be constructed, it will
  // but otherwise returns Uint8Array raw bytes as loaded.
  let output_data: OutputData;
  let { shape, type } = metadata;

  let known_type = true;
  // let length: number;
  if (type === Module.H5T_class_t.H5T_STRING.value) {
    if (metadata.vlen) {
      let output: string[] = [];
      let reader = (metadata.cset == 1) ? Module.UTF8ToString : Module.AsciiToString;
      let ptrs = new Uint32Array(data.buffer);
      for (let ptr of ptrs) {
        output.push(reader(ptr));
      }
      output_data = output;
      // length = output_data.length;
    }
    else {
      let encoding = (metadata.cset == 1) ? 'utf-8' : 'ascii';
      let decoder = new TextDecoder(encoding);
      let size = metadata.size;
      let n = Math.floor(data.byteLength / size);
      let output: string[] = [];
      for (let i = 0; i < n; i++) {
        let bytes = data.slice(i * size, (i + 1) * size);
        // truncate at first null
        const zero_match = bytes.findIndex((b) => (b === 0));
        if (zero_match > -1) {
          bytes = bytes.slice(0, zero_match);
        }
        output.push(decoder.decode(bytes));
      }
      output_data = output;
      // length = output_data.length;
    }
  }
  else if (type === Module.H5T_class_t.H5T_INTEGER.value || type === Module.H5T_class_t.H5T_FLOAT.value) {
    const { size, signed} = metadata;
    const accessor = getAccessor(type, size, signed);
    output_data = new accessor(data.buffer);
    if (json_compatible) {
      output_data = [...output_data];
      if (accessor === BigInt64Array || accessor === BigUint64Array) {
        output_data = output_data.map(Number);
      }
    }
  }

  else if (type === Module.H5T_class_t.H5T_COMPOUND.value) {
    const { size, compound_type } = <{size: Metadata["size"], compound_type: CompoundTypeMetadata}>metadata;
    let n = Math.floor(data.byteLength / size);
    let output: (OutputData | JSONCompatibleOutputData)[] = [];
    for (let i = 0; i < n; i++) {
      let row: (OutputData | JSONCompatibleOutputData)[] = [];
      let row_data = data.slice(i * size, (i + 1) * size);
      for (let member of compound_type.members) {
        let member_data = row_data.slice(member.offset, member.offset + member.size);
        row.push(process_data(member_data, member, json_compatible))
      }
      output.push(row);
    }
    output_data = output;
  }

  else if (type === Module.H5T_class_t.H5T_ARRAY.value) {
    const { array_type } = <{array_type: Metadata}>metadata;
    shape = (<number[]>shape).concat(<number[]>array_type.shape);
    array_type.shape = shape;
    // always convert ARRAY types to base JS types:
    output_data = process_data(data, array_type, true);
    if (isIterable(output_data) && typeof output_data !== "string") {
      output_data = create_nested_array(output_data as JSONCompatibleOutputData[], array_type.shape);
    }
  }

  else if (type === Module.H5T_class_t.H5T_ENUM.value) {
    const base_metadata = {...metadata};
    base_metadata.type = (base_metadata.enum_type as EnumTypeMetadata).type;
    output_data = process_data(data, base_metadata, json_compatible);
    // Following the convention of h5py, treat all enum datasets where the
    // enum members are ["FALSE", "TRUE"] as boolean arrays
    if (json_compatible && isH5PYBooleanEnum(metadata.enum_type as EnumTypeMetadata)) {
      if (isIterable(output_data)) {
        output_data = [...output_data].map((x) => !!x);
      }
      else {
        output_data = !!output_data;
      }
    }
  }

  else if (type === Module.H5T_class_t.H5T_REFERENCE.value) {
    const { ref_type, size } = metadata; // as { ref_type: 'object' | 'region', size: number };
    const cls = (ref_type === 'object') ? Reference : RegionReference;
    output_data = Array.from({ length: metadata.total_size }).map((_, i) => {
      const ref_data = data.slice(i*size, (i+1)*size);
      return new cls(ref_data);
    });
    return output_data;
  }

  else if (type === Module.H5T_class_t.H5T_VLEN.value) {
    // Data buffer holds HDF5 `hvl_t` struct
    // https://docs.hdfgroup.org/hdf5/v1_12/structhvl__t.html
    const ptr_pairs = new Uint32Array(data.buffer); // both `size_t` length and pointer are 4-byte-long
    const ptr_pairs_length = ptr_pairs.length;
    const vlen_type = metadata.vlen_type as Metadata;
    const { size } = vlen_type;

    let output: (OutputData | JSONCompatibleOutputData)[] = [];
    for (let p = 0; p < ptr_pairs_length; p += 2) {
      const length = ptr_pairs[p]; // number of elements in this vlen array
      const data_ptr = ptr_pairs[p + 1]; // pointer to this vlen array's data

      // Read vlen array data from memory
      const data_nbytes = length * size;
      const data = Module.HEAPU8.slice(data_ptr, data_ptr + data_nbytes);

      // Process this vlen array's data according to base datatype
      output.push(process_data(data, { ...vlen_type, shape: [length], total_size: length }, json_compatible));
    }

    output_data = output;
  }

  else {
    known_type = false;
    output_data = data;
  }

  // if metadata.shape.length == 0 or metadata.shape is undefined...
  if (known_type && (Array.isArray(output_data) || ArrayBuffer.isView(output_data)) && !shape?.length) {
    output_data = output_data[0];
  }

  if (json_compatible) {
    return output_data as JSONCompatibleOutputData;
  }
  return output_data as OutputData;
}

function isIterable(x: any): x is Iterable<unknown> {
  return typeof x === 'object' && x !== null && Symbol.iterator in x;
}

function isH5PYBooleanEnum(enum_type: EnumTypeMetadata) {
  return Object.keys(enum_type.members).length === 2 &&
         enum_type.members["FALSE"] === 0 &&
         enum_type.members["TRUE"] === 1;
}

const H5S_UNLIMITED = 18446744073709551615n; // not exportable by emscripten_bindings because it's outside int32 range

function prepare_data(data: any, metadata: Metadata, shape?: number[] | bigint[] | null, maxshape?: (number | null)[] | null | undefined): {data: Uint8Array | string[], shape: bigint[], maxshape: (bigint | null)[] } {
  // for data being sent to Module

  // set shape to size of array if it is not specified:
  let final_shape: bigint[];
  let final_maxshape: (bigint | null)[] | null;
  if (shape === undefined || shape === null) {
    if (data != null && data.length != null && !(typeof data === 'string')) {
      final_shape = [BigInt(data.length)];
    }
    else {
      final_shape = [];
    }
  }
  else {
    final_shape = shape.map(BigInt);
  }

  if (maxshape === undefined || maxshape === null) {
    final_maxshape = final_shape;
  }
  else {
    final_maxshape = maxshape.map((dim) => ((dim === null) ? H5S_UNLIMITED : BigInt(dim)));
  }

  data = (Array.isArray(data) || ArrayBuffer.isView(data)) ? data : [data];
  let total_size = Number(final_shape.reduce((previous, current) => current * previous, 1n));

  if (data.length != total_size) {
    throw `Error: shape ${final_shape} does not match number of elements in data`;
  }
  //assert(data.length == total_size)
  let output: Uint8Array | string[];

  if (metadata.type === Module.H5T_class_t.H5T_STRING.value) {
    if (!metadata.vlen) {
      output = new Uint8Array(total_size * metadata.size);
      let encoder = new TextEncoder();
      output.fill(0);
      let offset = 0;
      for (let s of data) {
        let encoded = encoder.encode(s);
        output.set(encoded.slice(0, metadata.size), offset);
        offset += metadata.size;
      }
    }
    else {
      output = data;
    }
  }
  else if (metadata.type === Module.H5T_class_t.H5T_INTEGER.value || metadata.type === Module.H5T_class_t.H5T_FLOAT.value) {
    const {type, size, signed} = metadata;
    const accessor = getAccessor(type, size, signed);
    let typed_array: ArrayBufferView;
    if (data instanceof accessor) {
      typed_array = data;
    }
    else {
      // convert...
      if (metadata.size > 4 && metadata.type === Module.H5T_class_t.H5T_INTEGER.value) {
        data = data.map(BigInt);
      }
      typed_array = new accessor(data);
    }
    output = new Uint8Array(typed_array.buffer);
  }
  else if (metadata.type === Module.H5T_class_t.H5T_REFERENCE.value) {
    output = new Uint8Array(metadata.size * total_size);
    (data as Reference[]).forEach((r, i) => (output as Uint8Array).set(r.ref_data, i*metadata.size));
  }
  else {
    throw new Error(`data with type ${metadata.type} can not be prepared for write`);
  }
  return {data: output, shape: final_shape, maxshape: final_maxshape}
}

function map_reverse<Key, Value>(map: Map<Key, Value>): Map<Value, Key> {
  return new Map(Array.from(map.entries()).map(([k, v]) => [v, k]));
}

const int_fmts = new Map([[1, 'b'], [2, 'h'], [4, 'i'], [8, 'q']]);
const float_fmts = new Map([[2, 'e'], [4, 'f'], [8, 'd']]);
const fmts_float = map_reverse(float_fmts);
const fmts_int = map_reverse(int_fmts);

function metadata_to_dtype(metadata: Metadata): Dtype {
  const { type, size, littleEndian, signed, compound_type, array_type, vlen } = metadata;
  if (type == Module.H5T_class_t.H5T_STRING.value) {
    let length_str = vlen ? "" : String(size);
    return `S${length_str}`;
  }
  else if (type == Module.H5T_class_t.H5T_INTEGER.value) {
    let fmt = int_fmts.get(size);
    if (fmt === undefined) {
      throw new Error(`int of size ${size} unsupported`);
    }
    if (!signed) {
      fmt = fmt.toUpperCase();
    }
    return ((littleEndian) ? "<" : ">") + fmt;
  }
  else if (type == Module.H5T_class_t.H5T_FLOAT.value) {
    let fmt = float_fmts.get(size);
    return ((littleEndian) ? "<" : ">") + fmt;
  }
  else if (type == Module.H5T_class_t.H5T_COMPOUND.value) {
    return { compound_type: compound_type as CompoundTypeMetadata};
  }
  else if (type === Module.H5T_class_t.H5T_ARRAY.value ) {
    return { array_type: array_type as Metadata }
  }
  else if (type === Module.H5T_class_t.H5T_REFERENCE.value) {
    return (metadata.ref_type === 'object') ? "Reference" : "RegionReference";
  }
  else {
    return "unknown";
  }
}

function dtype_to_metadata(dtype_str: string) {
  let metadata = { vlen: false, signed: false } as Metadata;
  if (dtype_str === "Reference" || dtype_str === "RegionReference") {
    metadata.type = Module.H5T_class_t.H5T_REFERENCE.value;
    metadata.size = (dtype_str === "Reference") ? Module.SIZEOF_OBJ_REF : Module.SIZEOF_DSET_REGION_REF;
    metadata.littleEndian = true;
  }
  else {
    let match = dtype_str.match(/^([<>|]?)([bhiqefdsBHIQS])([0-9]*)$/);
    if (match == null) {
      throw dtype_str + " is not a recognized dtype"
    }
    let [full, endianness, typestr, length] = match;
    metadata.littleEndian = (endianness != '>');
    if (fmts_int.has(typestr.toLowerCase())) {
      metadata.type = Module.H5T_class_t.H5T_INTEGER.value;
      metadata.size = (fmts_int.get(typestr.toLowerCase()) as number);
      metadata.signed = (typestr.toLowerCase() == typestr);
    }
    else if (fmts_float.has(typestr)) {
      metadata.type = Module.H5T_class_t.H5T_FLOAT.value;
      metadata.size = (fmts_float.get(typestr) as number);
    }
    else if (typestr.toUpperCase() === 'S') {
      metadata.type = Module.H5T_class_t.H5T_STRING.value;
      metadata.size = (length == "") ? 4 : parseInt(length, 10);
      metadata.vlen = (length == "");
    }
    else {
      throw "should never happen"
    }
  }
  return metadata
}

type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | BigInt64Array
  | BigUint64Array
  | Float32Array
  | Float64Array;

type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Uint8ClampedArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | BigInt64ArrayConstructor
  | BigUint64ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor;

const TypedArray_to_dtype = new Map([
  ['Uint8Array', '<B'],
  ['Uint8ClampedArray', '<B'],
  ['Uint16Array', '<H'],
  ['Uint32Array', '<I'],
  ['BigUint64Array', '<Q'],
  ['Int8Array', '<b'],
  ['Int16Array', '<h'],
  ['Int32Array', '<i'],
  ['BigInt64Array', '<q'],
  ['Float32Array', '<f'],
  ['Float64Array', '<d']
])

/**
 * Describes an array slice.
 * `[]` - all data
 * `[i0]` - select all data starting from the index `i0`
 * `[i0, i1]` - select all data in the range `i0` to `i1`
 * `[i0, i1, s]` - select every `s` values in the range `i0` to `i1`
 **/
type Slice = [] | [number|null] | [number|null,number|null] | [number|null, number|null, number|null];

export type GuessableDataTypes = TypedArray | number | number[] | string | string[] | Reference | Reference[] | RegionReference | RegionReference[];

function guess_dtype(data: GuessableDataTypes): string {
  if (ArrayBuffer.isView(data)) {
    const dtype = TypedArray_to_dtype.get(data.constructor.name);
    if (dtype === undefined) {
      throw new Error("DataView not supported directly for write")
    }
    return dtype;
  }
  else {
    // then it is an array or a single value...
    const arr_data = ((Array.isArray(data)) ? data : [data]);
    if (arr_data.every(Number.isInteger)) {
      return '<i'; // default integer type: Int32
    }
    else if (arr_data.every((d) => (typeof d == 'number'))) {
      return '<d'; // default float type: Float64
    }
    else if (arr_data.every((d) => (typeof d == 'string'))) {
      return 'S';
    }
    else if (arr_data.every((d) => d instanceof RegionReference)) {
      return 'RegionReference';
    }
    else if (arr_data.every((d) => d instanceof Reference)) {
      return 'Reference';
    }
  }
  throw new Error("unguessable type for data");
}

enum OBJECT_TYPE {
  DATASET = "Dataset",
  GROUP = "Group",
  BROKEN_SOFT_LINK = "BrokenSoftLink",
  EXTERNAL_LINK = "ExternalLink",
  DATATYPE = 'Datatype',
  REFERENCE = 'Reference',
  REGION_REFERENCE = 'RegionReference',
}

export type Entity = Dataset | Group | BrokenSoftLink | ExternalLink | Datatype | Reference | RegionReference;

export class BrokenSoftLink {
  // only used for broken links...
  target: string;
  type: OBJECT_TYPE = OBJECT_TYPE.BROKEN_SOFT_LINK;
  constructor(target: string) {
    this.target = target;
  }
}

export class ExternalLink {
  filename: string;
  obj_path: string;
  type: OBJECT_TYPE = OBJECT_TYPE.EXTERNAL_LINK;
  constructor(filename: string, obj_path: string) {
    this.filename = filename;
    this.obj_path = obj_path;
  }
}

export class Reference {
  ref_data: Uint8Array;
  constructor(ref_data: Uint8Array) {
    this.ref_data = ref_data;
  }
}

export class RegionReference extends Reference {
}

export class Attribute {
  file_id: bigint;
  path: string;
  name: string;
  metadata: Metadata;
  dtype: Dtype;
  shape: number[] | null;
  private _value?: OutputData | null;
  private _json_value?: JSONCompatibleOutputData | null;

  constructor(file_id: bigint, path: string, name: string) {
    this.file_id = file_id;
    this.path = path;
    this.name = name;
    const metadata = Module.get_attribute_metadata(file_id, path, name);
    this.metadata = metadata;
    this.dtype = metadata_to_dtype(metadata);
    this.shape = metadata.shape;
  }

  get value(): OutputData | null {
    if (typeof this._value === "undefined") {
      this._value = get_attr(this.file_id, this.path, this.name, false);
    }
    return this._value;
  }

  get json_value(): JSONCompatibleOutputData | null {
    if (typeof this._json_value === "undefined") {
      this._json_value = get_attr(this.file_id, this.path, this.name, true);
    }
    return this._json_value;
  }

  to_array(): JSONCompatibleOutputData | null {
    const { json_value, metadata } = this;
    const { shape } = metadata;
    if (!isIterable(json_value) || typeof json_value === "string") {
      return json_value;
    }
    return create_nested_array(json_value, <number[]>shape);
  }
}

abstract class HasAttrs {
  file_id!: bigint;
  path!: string;
  type!: OBJECT_TYPE;

  get attrs() {
    let attr_names = Module.get_attribute_names(this.file_id, this.path) as string[];
    let attrs: Record<string, Attribute>  = {};
    const { file_id, path } = this;
    for (let name of attr_names) {
      Object.defineProperty(attrs, name, {
        get: (): Attribute => (new Attribute(file_id, path, name)),
        enumerable: true
      });
    }
    return attrs;
  }

  get root() {
    return new Group(this.file_id, '/');
  }

  get parent(): Group {
    return this.root.get(dirname(this.path)) as Group;
  }

  get_attribute(name: string, json_compatible: true): JSONCompatibleOutputData;
  get_attribute(name: string, json_compatible: false): OutputData;
  get_attribute(name: string, json_compatible: boolean = false) {
    return get_attr(this.file_id, this.path, name, json_compatible);
  }


  create_attribute(name: string, data: GuessableDataTypes, shape?: number[] | null, dtype?: string | null) {
    const final_dtype = dtype ?? guess_dtype(data);
    let metadata = dtype_to_metadata(final_dtype);
    if (!metadata.littleEndian) {
      throw new Error("create_attribute with big-endian dtype is not supported");
    }
    const {data: prepared_data, shape: guessed_shape} = prepare_data(data, metadata, shape, shape);
    const final_shape = shape?.map(BigInt) ?? guessed_shape;
    if (metadata.vlen) {
      Module.create_vlen_str_attribute(
        this.file_id,
        this.path,
        name,
        prepared_data as string[],
        final_shape,
        metadata.type,
        metadata.size,
        metadata.signed,
        metadata.vlen
      );
    }
    else {
      let data_ptr = Module._malloc((prepared_data as Uint8Array).byteLength);
      try {
        Module.HEAPU8.set(prepared_data as Uint8Array, data_ptr);
        Module.create_attribute(
          this.file_id,
          this.path,
          name,
          BigInt(data_ptr),
          final_shape,
          metadata.type,
          metadata.size,
          metadata.signed,
          metadata.vlen
        );
      } finally {
        Module._free(data_ptr);
      }
    }
  }

  delete_attribute(name: string): number {
    // returns non-zero value if delete failed.
    return Module.delete_attribute(this.file_id, this.path, name);
  }

  create_reference(): Reference {
    const ref_data = Module.create_object_reference(this.file_id, this.path);
    return new Reference(ref_data);
  }

  dereference(ref: RegionReference): DatasetRegion;
  dereference(ref: Reference | RegionReference): DatasetRegion | Entity | null;
  dereference(ref: Reference | RegionReference): DatasetRegion | Entity | null {
    const is_region = (ref instanceof RegionReference);
    const name = Module.get_referenced_name(this.file_id, ref.ref_data, !is_region);
    const target = this.root.get(name);
    return (is_region) ? new DatasetRegion(target as Dataset, ref) : target;
  }
}

export class Datatype extends HasAttrs {
  constructor(file_id: bigint, path: string) {
    super();
    this.file_id = file_id;
    this.path = path;
    this.type = OBJECT_TYPE.DATATYPE;
  }

  get metadata() {
    return Module.get_datatype_metadata(this.file_id, this.path);
  }
}

export class Group extends HasAttrs {
  constructor(file_id: bigint, path: string) {
    super();
    this.path = path;
    this.file_id = file_id;
    this.type = OBJECT_TYPE.GROUP;
  }

  keys(): string[] {
    return Module.get_names(this.file_id, this.path, false);
  }

  * values(): Generator<Entity | null, void, never> {
    for (let name of this.keys()) {
      yield this.get(name);
    }
    return;
  }

  * items(): Generator<[string, Entity | null], void, never> {
    for (let name of this.keys()) {
      yield [name, this.get(name)];
    }
    return;
  }

  get_type(obj_path: string) {
    return Module.get_type(this.file_id, obj_path);
  }

  get_link(obj_path: string) {
    return Module.get_symbolic_link(this.file_id, obj_path);
  }

  get_external_link(obj_path: string) {
    return Module.get_external_link(this.file_id, obj_path);
  }

  get(obj_name: string): Entity | null {
    let fullpath = (/^\//.test(obj_name)) ? obj_name : this.path + "/" + obj_name;
    fullpath = normalizePath(fullpath);

    let type = this.get_type(fullpath);
    if (type === Module.H5G_GROUP) {
      return new Group(this.file_id, fullpath);
    }
    else if (type === Module.H5G_DATASET) {
      return new Dataset(this.file_id, fullpath);
    }
    else if (type === Module.H5G_LINK) {
      // if get_type succeeds, then get_link must as well
      let target = this.get_link(fullpath) as string;
      return new BrokenSoftLink(target);
    }
    else if (type === Module.H5G_UDLINK) {
      // if get_type succeeds, then get_external_link must as well
      let {filename, obj_path} = this.get_external_link(fullpath) as {filename: string, obj_path: string};
      return new ExternalLink(filename, obj_path);
    }
    else if (type === Module.H5G_TYPE) {
      return new Datatype(this.file_id, fullpath);
    }
    // unknown type or object not found
    return null
  }

  create_group(name: string, track_order: boolean = false): Group {
    Module.create_group(this.file_id, this.path + "/" + name, track_order);
    return this.get(name) as Group;
  }

  create_dataset(args: {
      name: string,
      data: GuessableDataTypes,
      shape?: number[] | null,
      dtype?: string | null,
      maxshape?: (number | null)[] | null,
      chunks?: number[] | null,
      compression?: (number | 'gzip'),
      compression_opts?: number | number[],
      track_order?: boolean,
  }): Dataset {
    const { name, data, shape, dtype, maxshape, chunks, compression, compression_opts, track_order } = args;
    const final_dtype = dtype ?? guess_dtype(data);
    let metadata = dtype_to_metadata(final_dtype);
    if (compression && !chunks) {
      throw new Error("cannot specify compression without chunks");
    }
    if (compression && metadata.vlen) {
      throw new Error("cannot specify compression with VLEN data");
    }
    if (!metadata.littleEndian) {
      throw new Error("create_dataset with big-endian dtype is not supported");
    }
    const {data: prepared_data, shape: guessed_shape, maxshape: final_maxshape} = prepare_data(data, metadata, shape, maxshape);
    const final_shape: bigint[] = shape?.map(BigInt) ?? guessed_shape;
    const final_chunks = (chunks) ? chunks.map(BigInt) : null;
    let compression_opts_out: number[];
    let compression_id: number = 0;
    if (compression && typeof compression === 'number') {
      if (typeof compression_opts === 'undefined') {
        // handle special case where no opts are given, use 'gzip'
        // and numeric value of compression as compression_opts
        compression_id = 1;
        compression_opts_out = [compression];
      }
      else {
        // promote single number to opts list.
        compression_id = compression;
        compression_opts_out = (typeof compression_opts === 'number') ? [compression_opts] : compression_opts;
      }
    }
    else if (compression === 'gzip') {
      compression_id = 1;
      if (compression_opts === undefined) {
        compression_opts_out = [4]; // default compression level
      }
      else {
        compression_opts_out = (typeof compression_opts === 'number') ? [compression_opts] : compression_opts;
      }
    }
    else {
      compression_id = 0;
      compression_opts_out = [];
    }

    if (metadata.vlen) {
      Module.create_vlen_str_dataset(
        this.file_id,
        this.path + "/" + name,
        prepared_data as string[],
        final_shape,
        final_maxshape,
        final_chunks,
        metadata.type,
        metadata.size,
        metadata.signed,
        metadata.vlen,
        track_order ?? false,
      );
    }
    else {
      let data_ptr = Module._malloc((prepared_data as Uint8Array).byteLength);
      try {
        Module.HEAPU8.set(prepared_data as Uint8Array, data_ptr);
        Module.create_dataset(
          this.file_id,
          this.path + "/" + name,
          BigInt(data_ptr),
          final_shape,
          final_maxshape,
          final_chunks,
          metadata.type,
          metadata.size,
          metadata.signed,
          metadata.vlen,
          compression_id,
          compression_opts_out,
          track_order ?? false
        );
      } finally {
        Module._free(data_ptr);
      }
    }
    return this.get(name) as Dataset;
  }

  create_soft_link(target: string, name: string) {
    // create a soft link in this group named *name* to *target* (absolute path)
    const link_name = this.path + '/' + name;
    return Module.create_soft_link(this.file_id, target, link_name);
  }

  create_hard_link(target: string, name: string) {
    // create a hard link in this group named *name* to *target* (absolute path)
    const link_name = this.path + '/' + name;
    return Module.create_hard_link(this.file_id, target, link_name);
  }

  create_external_link(file_name: string, target: string, name: string) {
    // create a soft link in this group named *name* to *target* (absolute path)
    const link_name = this.path + '/' + name;
    return Module.create_external_link(this.file_id, file_name, target, link_name);
  }

  toString() {
    return `Group(file_id=${this.file_id}, path=${this.path})`;
  }

  paths() {
    // get all paths below this group in the tree
    return Module.get_names(this.file_id, this.path, true);
  }
}

export class File extends Group {
  filename: string;
  mode: ACCESS_MODESTRING;
  constructor(filename: string, mode: ACCESS_MODESTRING = "r", track_order: boolean = false) {
    const access_mode = ACCESS_MODES[mode];
    const h5_mode = Module[access_mode];
    const file_id = Module.open(filename, h5_mode, track_order);
    super(file_id, "/");
    this.filename = filename;
    this.mode = mode;
  }

  flush() {
    Module.flush(this.file_id);
  }

  close(): Status {
    return Module.close_file(this.file_id);
  }
}

const calculateHyperslabParams = (shape: number[],ranges: Slice[]) => {
  const strides = shape.map((s, i) => BigInt(ranges?.[i]?.[2] ?? 1));
  const count = shape.map((s, i) => {
    const N = BigInt((Math.min(s, ranges?.[i]?.[1] ?? s) - Math.max(0, ranges?.[i]?.[0] ?? 0)));
    const st = strides[i];
    return N / st + ((N % st) + st - 1n)/st
  });
  const offset = shape.map((s, i) => BigInt(Math.min(s, Math.max(0, ranges?.[i]?.[0] ?? 0))));
  return {strides, count, offset}
}

export class Dataset extends HasAttrs {
  private _metadata?: Metadata;

  constructor(file_id: bigint, path: string) {
    super();
    this.path = path;
    this.file_id = file_id;
    this.type = OBJECT_TYPE.DATASET;
  }

  refresh() {
    const status = Module.refresh_dataset(this.file_id, this.path);
    if (status < 0) {
      throw new Error(`Could not refresh. Error code: ${status}`);
    }
    delete this._metadata;
  }

  get metadata() {
    if (typeof this._metadata === "undefined") {
      this._metadata = Module.get_dataset_metadata(this.file_id, this.path);
    }
    return this._metadata;
  }

  get dtype() {
    return metadata_to_dtype(this.metadata);
  }

  get shape() {
    return this.metadata.shape;
  }

  get filters(): Filter[] {
    return Module.get_dataset_filters(this.file_id, this.path);
  }

  get value(): OutputData | null {
    return this._value_getter(false);
  }

  get json_value(): JSONCompatibleOutputData | null {
    return this._value_getter(true);
  }

  slice(ranges: Slice[]): OutputData | null {
    // interpret ranges as [start, stop], with one per dim.
    const metadata = this.metadata;
    // if auto_refresh is on, getting the metadata has triggered a refresh of the dataset_id;
    const { shape } = metadata;
    if (!shape) {
      return null;
    }

    const {strides, count, offset} = calculateHyperslabParams(shape, ranges);
    const total_size = count.reduce((previous, current) => current * previous, 1n);
    const nbytes = metadata.size * Number(total_size);
    const data_ptr = Module._malloc(nbytes);
    let processed: OutputData;
    try {
      Module.get_dataset_data(this.file_id, this.path, count, offset, strides, BigInt(data_ptr));
      let data = Module.HEAPU8.slice(data_ptr, data_ptr + nbytes);
      processed = process_data(data, metadata, false);
    } finally {
      if (metadata.vlen || metadata.type === Module.H5T_class_t.H5T_VLEN.value) {
        Module.reclaim_vlen_memory(this.file_id, this.path, "", BigInt(data_ptr));
      }
      Module._free(data_ptr);
    }
    return processed;
  }

  write_slice(ranges: Slice[], data: any) {
    // interpret ranges as [start, stop], with one per dim.
    let metadata = this.metadata;
    if (!metadata.shape) {
      throw new Error("cannot write to a slice of an empty dataset");
    }
    if (metadata.vlen) {
      throw new Error("writing to a slice of vlen dtype is not implemented");
    }
    const { shape } = metadata;
    // if auto_refresh is on, getting the metadata has triggered a refresh of the dataset_id;
    const {strides, count, offset} = calculateHyperslabParams(shape, ranges);

    const { data: prepared_data, shape: guessed_shape } = prepare_data(data, metadata, count);
    let data_ptr = Module._malloc((prepared_data as Uint8Array).byteLength);
    Module.HEAPU8.set(prepared_data as Uint8Array, data_ptr);

    try {
      Module.set_dataset_data(this.file_id, this.path, count, offset, strides, BigInt(data_ptr));
    }
    finally {
      Module._free(data_ptr);
    }
  }

  create_region_reference(ranges: Slice[]) {
    const metadata = this.metadata;
    if (!metadata.shape) {
      throw new Error("cannot create region reference from empty dataset");
    }

    // interpret ranges as [start, stop], with one per dim.
    const { shape } = metadata;
    const {strides, count, offset} = calculateHyperslabParams(shape, ranges);
    const ref_data = Module.create_region_reference(this.file_id, this.path, count, offset, strides);
    return new RegionReference(ref_data);
  }

  to_array(): JSONCompatibleOutputData | null {
    const { json_value, metadata } = this;
    const { shape } = metadata;
    if (!isIterable(json_value) || typeof json_value === "string") {
      return json_value;
    }
    let nested =  create_nested_array(json_value, <number[]>shape);
    return nested;
  }

  resize(new_shape: number[]) {
    const result = Module.resize_dataset(this.file_id, this.path, new_shape.map(BigInt));
    // reset metadata, pull from file on next read.
    this._metadata = undefined;
    return result;
  }

  make_scale(scale_name: string = "") {
    // convert dataset to dimension scale
    Module.set_scale(this.file_id, this.path, scale_name);
  }

  attach_scale(index: number, scale_dset_path: string) {
    // attach a dimension scale to the "index" dimension of this dataset
    Module.attach_scale(this.file_id, this.path, scale_dset_path, index);
  }

  detach_scale(index: number, scale_dset_path: string) {
    // detach a dimension scale from the "index" dimension of this dataset
    Module.detach_scale(this.file_id, this.path, scale_dset_path, index);
  }

  get_attached_scales(index: number) {
    // get full paths to all datasets that are attached as dimension scales
    // to the specified dimension (at "index") of this dataset.
    return Module.get_attached_scales(this.file_id, this.path, index);
  }

  get_scale_name() {
    // if this dataset is a dimension scale, returns name as string
    // (returns empty string if no name defined, but it is a dimension scale)
    // else returns null if it is not set as a dimension scale
    return Module.get_scale_name(this.file_id, this.path);
  }

  set_dimension_label(index: number, label: string) {
    // label dimension at "index" of this dataset with string "label"
    Module.set_dimension_label(this.file_id, this.path, index, label)
  }

  get_dimension_labels() {
    // fetch labels for all dimensions of this dataset (null if label not defined)
    return Module.get_dimension_labels(this.file_id, this.path);
  }

  _value_getter(json_compatible?: false): OutputData | null;
  _value_getter(json_compatible: true): JSONCompatibleOutputData | null;
  _value_getter(json_compatible: boolean): OutputData | JSONCompatibleOutputData | null;
  _value_getter(json_compatible=false): OutputData | JSONCompatibleOutputData | null {
    let metadata = this.metadata;
    if (!metadata.shape) {
      return null
    }

    // if auto_refresh is on, getting the metadata has triggered a refresh of the dataset_id;
    let nbytes = metadata.size * metadata.total_size;
    let data_ptr = Module._malloc(nbytes);
    let processed: OutputData;
    try {
      Module.get_dataset_data(this.file_id, this.path, null, null, null, BigInt(data_ptr));
      let data = Module.HEAPU8.slice(data_ptr, data_ptr + nbytes);
      processed = process_data(data, metadata, json_compatible);
    } finally {
      if (metadata.vlen) {
        Module.reclaim_vlen_memory(this.file_id, this.path, "", BigInt(data_ptr));
      }
      Module._free(data_ptr);
    }
    return processed;
  }

}

export class DatasetRegion {
  source_dataset: Dataset;
  region_reference: RegionReference;
  private _metadata?: Metadata;

  constructor(source_dataset: Dataset, region_reference: RegionReference) {
    this.source_dataset = source_dataset;
    this.region_reference = region_reference;
  }

  get metadata() {
    if (typeof this._metadata === "undefined") {
      this._metadata = Module.get_region_metadata(this.source_dataset.file_id, this.region_reference.ref_data);
    }
    return this._metadata;
  }

  get value(): OutputData | null {
    return this._value_getter(false);
  }

  _value_getter(json_compatible?: false): OutputData | null;
  _value_getter(json_compatible: true): JSONCompatibleOutputData | null;
  _value_getter(json_compatible: boolean): OutputData | JSONCompatibleOutputData | null;
  _value_getter(json_compatible=false): OutputData | JSONCompatibleOutputData | null {
    let metadata = this.metadata;
    if (!metadata.shape) {
      return null;
    }

    // if auto_refresh is on, getting the metadata has triggered a refresh of the dataset_id;
    let nbytes = metadata.size * metadata.total_size;
    let data_ptr = Module._malloc(nbytes);
    let processed: OutputData;
    try {
      Module.get_region_data(this.source_dataset.file_id, this.region_reference.ref_data, BigInt(data_ptr));
      let data = Module.HEAPU8.slice(data_ptr, data_ptr + nbytes);
      processed = process_data(data, metadata, json_compatible);
    } finally {
      if (metadata.vlen) {
        Module.reclaim_vlen_memory(this.source_dataset.file_id, this.source_dataset.path, "", BigInt(data_ptr));
      }
      Module._free(data_ptr);
    }
    return processed;
  }
}

function create_nested_array(value: JSONCompatibleOutputData[], shape: number[]) {
  // check that shapes match:
  const total_length = value.length;
  const dims_product = shape.reduce((previous, current) => (previous * current), 1);
  if (total_length !== dims_product) {
    console.warn(`shape product: ${dims_product} does not match length of flattened array: ${total_length}`);
  }

  // Get reshaped output:
  let output = value;
  const subdims = shape.slice(1).reverse();
  for (let dim of subdims) {
    // in each pass, replace input with array of slices of input
    const new_output: JSONCompatibleOutputData[][] = [];
    const { length } = output;
    let cursor = 0;
    while (cursor < length) {
      new_output.push(output.slice(cursor, cursor += dim));
    }
    output = new_output;
  }
  return output;
}

export const h5wasm = {
  File,
  Group,
  Dataset,
  Datatype,
  DatasetRegion,
  ready,
  ACCESS_MODES
}

export default h5wasm;
