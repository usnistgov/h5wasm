const ACCESS_MODES = {
    "r": "H5F_ACC_RDONLY",
    "a": "H5F_ACC_RDWR",
    "w": "H5F_ACC_TRUNC",
    "x": "H5F_ACC_EXCL",
    "c": "H5F_ACC_CREAT",
    "Sw": "H5F_ACC_SWMR_WRITE",
    "Sr": "H5F_ACC_SWMR_READ"
}

function normalizePath(path) {
    if (path == "/") { return path }
    // replace multiple path separators with single
    path = path.replace(/\/(\/)+/g, '/');
    // strip end slashes
    path = path.replace(/(\/)+$/, '');
    return path;
}

class Attribute {
    constructor(file_id, path, name) {
        this._file_id = file_id;
        this._path = path;
        this._name = name;
    }

    get value() {
        return get_attr(this._file_id, this._path, this._name);
    }
}

function get_attr(file_id, obj_name, attr_name) {
    let metadata = Module.get_attribute_metadata(file_id, obj_name, attr_name);
    let data = Module.get_attribute_data(file_id, obj_name, attr_name);
    return process_data(data, metadata)
}

function process_data(data, metadata) {
    // (for data coming out of Module)
    // If an appropriate TypedArray container can be constructed, it will
    // but otherwise returns Uint8Array raw bytes as loaded.    
    var data;
    if (metadata.type == Module.H5T_class_t.H5T_STRING.value) {
        // if (metadata.vlen) {
        //     let output = [];
        //     let ptrs = new Uint32Array(data.buffer);
        //     for (let ptr of ptrs) {
        //         output.push(AsciiToString(ptr));
        //         //Module._H5Treclaim(BigInt(ptr));
        //     }
        //     return output;
        // }
        //return data;
        if (!metadata.vlen) {
            let decoder = new TextDecoder('utf-8');
            let size = metadata.size;
            let slices = [];
            for (let i = 0; i < metadata.total_size; i++) {
                let s = data.slice(i * size, (i + 1) * size);
                slices.push(decoder.decode(s).replace(/\u0000+$/, ''));
            }
            data = slices;
        }
    }
    else if (metadata.type == Module.H5T_class_t.H5T_INTEGER.value) {
        let accessor_name = (metadata.size > 4) ? "Big" : "";
        accessor_name += (metadata.signed) ? "Int" : "Uint";
        accessor_name += ((metadata.size) * 8).toFixed() + "Array";
        if (accessor_name in globalThis) {
            data = new globalThis[accessor_name](data.buffer);
        }
    }
    else if (metadata.type == Module.H5T_class_t.H5T_FLOAT.value) {
        let accessor_name = "Float" + ((metadata.size) * 8).toFixed() + "Array";
        if (accessor_name in globalThis) {
            data = new globalThis[accessor_name](data.buffer);
        }
    }

    return (metadata.shape.length == 0 && data.length) ? data[0] : data;
}

function prepare_data(data, metadata, shape = null) {
    // for data being sent to Module

    // set shape to size of array if it is not specified:
    var shape = shape ?? ((Array.isArray(data) || ArrayBuffer.isView(data)) ? [data.length] : []);
    var data = (Array.isArray(data) || ArrayBuffer.isView(data)) ? data : [data];
    let total_size = shape.reduce((previous, current) => current * previous, 1);

    if (data.length != total_size) {
        throw `Error: shape ${shape} does not match number of elements in data`;
    }
    //assert(data.length == total_size)
    var output;

    if (metadata.type == Module.H5T_class_t.H5T_STRING.value) {
        if (!metadata.vlen) {
            output = new Uint8Array(total_size * metadata.size);
            let encoder = new TextEncoder('utf-8');
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
    else if (metadata.type == Module.H5T_class_t.H5T_INTEGER.value) {
        let accessor_name = (metadata.size > 4) ? "Big" : "";
        accessor_name += (metadata.signed) ? "Int" : "Uint";
        accessor_name += ((metadata.size) * 8).toFixed() + "Array";
        // check to see if data is already in the right form:
        let accessor = globalThis[accessor_name];
        let typed_array;
        if (data instanceof accessor) {
            typed_array = data;
        }
        else {
            // convert...
            if (metadata.size > 4) {
                data = data.map(BigInt);
            }
            typed_array = new accessor(data);
        }
        output = new Uint8Array(typed_array.buffer);
    }
    else if (metadata.type == Module.H5T_class_t.H5T_FLOAT.value) {
        let accessor_name = "Float" + ((metadata.size) * 8).toFixed() + "Array";
        // check to see if data is already in the right form:
        let accessor = globalThis[accessor_name];
        let typed_array = (data instanceof accessor) ? data : new accessor(data);
        output = new Uint8Array(typed_array.buffer);
    }

    return [output, shape]
}

/**
 * @param {Map} map
 * @returns Map
 */
function map_reverse(map) {
    return new Map(Array.from(map.entries()).map(([k, v]) => [v, k]));
}

const int_fmts = new Map([[1, 'b'], [2, 'h'], [4, 'i'], [8, 'q']]);
const float_fmts = new Map([[2, 'e'], [4, 'f'], [8, 'd']]);
const fmts_float = map_reverse(float_fmts);
const fmts_int = map_reverse(int_fmts);

function metadata_to_dtype(metadata) {
    if (metadata.type == Module.H5T_class_t.H5T_STRING.value) {
        let length_str = metadata.vlen ? "" : String(metadata.size);
        return `S${length_str}`;
    }
    else if (metadata.type == Module.H5T_class_t.H5T_INTEGER.value) {
        let fmt = int_fmts.get(metadata.size);
        if (!metadata.signed) {
            fmt = fmt.toUpperCase();
        }
        return ((metadata.littleEndian) ? "<" : ">") + fmt;
    }
    else if (metadata.type == Module.H5T_class_t.H5T_FLOAT.value) {
        let fmt = float_fmts.get(metadata.size);
        return ((metadata.littleEndian) ? "<" : ">") + fmt;
    }
    else if (metadata.type == Module.H5T_class_t.H5T_COMPOUND.value) {
        return {compound: metadata.compound_type};
    }
    else {
        return "unknown";
    }
}

function dtype_to_metadata(dtype_str) {
    let match = dtype_str.match(/^([<>|]?)([bhiqefdsBHIQS])([0-9]*)$/);
    if (match == null) {
        throw dtype_str + " is not a recognized dtype"
    }
    let [full, endianness, typestr, length] = match;
    let metadata = { vlen: false, signed: false };
    metadata.littleEndian = (endianness != '>');
    if (fmts_int.has(typestr.toLowerCase())) {
        metadata.type = Module.H5T_class_t.H5T_INTEGER.value;
        metadata.size = fmts_int.get(typestr.toLowerCase());
        metadata.signed = (typestr.toLowerCase() == typestr);
    }
    else if (fmts_float.has(typestr)) {
        metadata.type = Module.H5T_class_t.H5T_FLOAT.value;
        metadata.size = fmts_float.get(typestr);
    }
    else if (typestr.toUpperCase() == 'S') {
        metadata.type = Module.H5T_class_t.H5T_STRING.value;
        metadata.size = (length == "") ? 4 : parseInt(length, 10);
        metadata.vlen = (length == "");
    }
    else {
        throw "should never happen"
    }
    return metadata
}

function guess_dtype(data) {
    var data = (Array.isArray(data) || ArrayBuffer.isView(data)) ? data : [data];
    if (data.every(Number.isInteger)) {
        return '<i'; // default integer type: Int32
    }
    else if (data.every((d) => (typeof d == 'number'))) {
        return '<d'; // default float type: Float64
    }
    else if (data.every((d) => (typeof d == 'string'))) {
        return 'S'
    }
    else {
        throw "unguessable type for data";
    }
}

class HasAttrs {
    get attrs() {
        let attr_names = Module.get_attribute_names(this.file_id, this.path);
        let attrs = {};
        for (let name of attr_names) {
            let metadata = Module.get_attribute_metadata(this.file_id, this.path, name);
            Object.defineProperty(attrs, name, {
                get: () => ({
                    value: get_attr(this.file_id, this.path, name),
                    shape: metadata.shape,
                    dtype: metadata_to_dtype(metadata)
                }),
                enumerable: true
            });

            //attrs[name] = get_attr(this.file_id, this.path, name);
        }
        return attrs;

    }

    get_attribute(name) {
        get_attr(this.file_id, this.path, name);
    }

    create_attribute(name, data, shape = null, dtype = null) {
        var dtype = dtype ?? guess_dtype(data);
        let metadata = dtype_to_metadata(dtype);
        let [prepared_data, guessed_shape] = prepare_data(data, metadata, shape);
        var shape = shape ?? guessed_shape;
        if (metadata.vlen) {
            Module.create_vlen_str_attribute(
                this.file_id,
                this.path,
                name,
                prepared_data,
                shape.map(BigInt),
                metadata.type,
                metadata.size,
                metadata.signed,
                metadata.vlen
            );
        }
        else {
            let data_ptr = Module._malloc(prepared_data.byteLength);
            try {
                Module.HEAPU8.set(prepared_data, data_ptr);
                Module.create_attribute(
                    this.file_id,
                    this.path,
                    name,
                    BigInt(data_ptr),
                    shape.map(BigInt),
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

}

class Group extends HasAttrs {
    constructor(file_id, path) {
        super();
        this.path = path;
        this.file_id = file_id;
    }

    keys() {
        return Module.get_names(this.file_id, this.path);
    }

    * values() {
        for (let name of this.keys()) {
            yield this.get(name);
        }
        return
    }

    * items() {
        for (let name of this.keys()) {
            yield [name, this.get(name)];
        }
        return
    }

    get_type(obj_path) {
        return Module.get_type(this.file_id, obj_path);
    }

    get(obj_name) {
        let fullpath = (/^\//.test(obj_name)) ? obj_name : this.path + "/" + obj_name;
        fullpath = normalizePath(fullpath);

        let type = this.get_type(fullpath);
        if (type == Module.H5O_TYPE_GROUP) {
            return new Group(this.file_id, fullpath);
        }
        else if (type == Module.H5O_TYPE_DATASET) {
            return new Dataset(this.file_id, fullpath);
        }
    }

    create_group(name) {
        Module.create_group(this.file_id, this.path + "/" + name);
        return this.get(name);
    }

    create_dataset(name, data, shape = null, dtype = null) {
        var dtype = dtype ?? guess_dtype(data);
        let metadata = dtype_to_metadata(dtype);
        let [prepared_data, guessed_shape] = prepare_data(data, metadata, shape);
        var shape = shape ?? guessed_shape;
        if (metadata.vlen) {
            Module.create_vlen_dataset(
                this.file_id,
                this.path,
                name,
                prepared_data,
                shape.map(BigInt),
                metadata.type,
                metadata.size,
                metadata.signed,
                metadata.vlen
            );
        }
        else {
            let data_ptr = Module._malloc(prepared_data.byteLength);
            try {
                Module.HEAPU8.set(prepared_data, data_ptr);
                Module.create_dataset(
                    this.file_id,
                    this.path + "/" + name,
                    BigInt(data_ptr),
                    shape.map(BigInt),
                    metadata.type,
                    metadata.size,
                    metadata.signed,
                    metadata.vlen
                );
            } finally {
                Module._free(data_ptr);
            }
        }
        return this.get(name);
    }
    toString() {
        return `Group(file_id=${this.file_id}, path=${this.path})`;
    }
}

class File extends Group {
    constructor(filename, mode = "r") {
        super(null, "/");
        let access_mode = ACCESS_MODES[mode];
        let h5_mode = Module[access_mode];
        if (['H5F_ACC_RDWR', 'H5F_ACC_RDONLY'].includes(access_mode)) {
            // then it's an existing file...
            this.file_id = Module.ccall("H5Fopen", "bigint", ["string", "number", "bigint"], [filename, h5_mode, 0n]);
        }
        else {
            this.file_id = Module.ccall("H5Fcreate", "bigint", ["string", "number", "bigint", "bigint"], [filename, h5_mode, 0n, 0n]);
        }
        this.filename = filename;

        this.mode = mode;
    }

    download(downloader) {
        // useful only in the browser
        Module.flush(this.file_id);
        let b = new Blob([Module.FS.readFile(this.filename)], {type: 'application/x-hdf5'});
        downloader(b, this.filename);
    }

    blob() {
        Module.flush(this.file_id);
        return new Blob([Module.FS.readFile(this.filename)], {type: 'application/x-hdf5'});
    }

    close() {
        return Module.ccall("H5Fclose", "number", ["bigint"], [this.file_id]);
    }
}


class Dataset extends HasAttrs {
    constructor(file_id, path) {
        super();
        this.path = path;
        this.file_id = file_id;
    }

    get metadata() {
        return Module.get_dataset_metadata(this.file_id, this.path);
    }

    get dtype() {
        return metadata_to_dtype(this.metadata);
    }

    get shape() {
        return this.metadata.shape;
    }

    get value() {
        let metadata = this.metadata;
        let nbytes = metadata.size * metadata.total_size;
        let data_ptr = Module._malloc(nbytes);
        var processed;
        try {
            Module.get_dataset_data(this.file_id, this.path, null, null, BigInt(data_ptr));
            let data = Module.HEAPU8.slice(data_ptr, data_ptr + nbytes);
            processed = process_data(data, metadata);
        } finally {
            Module._free(data_ptr);
        }
        return processed;
    }

    slice(ranges) {
        // interpret ranges as [start, stop], with one per dim.
        let metadata = this.metadata;
        let shape = metadata.shape;
        let ndims = shape.length;
        let count = shape.map((s, i) => BigInt(Math.min(s, ranges?.[i]?.[1] ?? s) - Math.max(0, ranges?.[i]?.[0] ?? 0)));
        let offset = shape.map((s, i) => BigInt(Math.min(s, Math.max(0, ranges?.[i]?.[0] ?? 0))));
        console.log(count, offset);
        let total_size = count.reduce((previous, current) => current * previous, 1n);
        let nbytes = metadata.size * Number(total_size);
        let data_ptr = Module._malloc(nbytes);
        var processed;
        try {
            Module.get_dataset_data(this.file_id, this.path, count, offset, BigInt(data_ptr));
            let data = Module.HEAPU8.slice(data_ptr, data_ptr + nbytes);
            processed = process_data(data, metadata);
        } finally {
            Module._free(data_ptr);
        }
        return processed;
    }
}

