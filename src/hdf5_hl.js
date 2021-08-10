import ModuleFactory from './hdf5_util.js';

export var Module = null;
export const ready = ModuleFactory({noInitialRun: true}).then((result) => { Module = result });

export const UPLOADED_FILES = [];

export function upload_file() {
    let file = this.files[0]; // only one file allowed
    let datafilename = file.name;
    let reader = new FileReader();
    reader.onloadend = function (evt) {
        let data = evt.target.result;
        FS.writeFile(datafilename, new Uint8Array(data));
        if (!UPLOADED_FILES.includes(datafilename)) {
            UPLOADED_FILES.push(datafilename);
            console.log("file loaded:", datafilename);
        }
        else {
            console.log("file updated: ", datafilename)
        }
    }
    reader.readAsArrayBuffer(file);
    this.value = "";
}


export const ACCESS_MODES = {
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
            let decoder = new TextDecoder();
            let size = metadata.size;
            let slices = [];
            for (let i=0; i<metadata.total_size; i++) {
                let s = data.slice(i*size, (i+1)*size);
                slices.push(decoder.decode(s).replace(/\u0000+$/,''));
            }
            data = slices;
        }
    }
    else if (metadata.type == Module.H5T_class_t.H5T_INTEGER.value) {
        let accessor = (metadata.size > 4) ? "Big" : "";
        accessor += (metadata.signed) ? "Int" : "Uint";
        accessor += ((metadata.size) * 8).toFixed() + "Array";
        data = new globalThis[accessor](data.buffer);

    }
    else if (metadata.type == Module.H5T_class_t.H5T_FLOAT.value) {
        let accessor = "Float" + ((metadata.size) * 8).toFixed() + "Array";
        data = new globalThis[accessor](data.buffer);
    }
    
    return (metadata.shape.length == 0 && data.length) ? data[0] : data;

}


const int_fmts = new Map([[1, 'b'], [2, 'h'], [4, 'i'], [8, 'q']]);
const float_fmts = new Map([[2, 'e'], [4, 'f'], [8, 'd']]);

function metadata_to_dtype(metadata) {
    if (metadata.type == Module.H5T_class_t.H5T_STRING.value) {
        let length_str = metadata.vlen ? "" : String(metadata.size);
        return `${length_str}S`;
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
    else {
        return "unknown";
    }
}   

class HasAttrs {
    get attrs() {
        let attr_names = Module.get_attribute_names(this.file_id, this.path);
        let attrs = {};
        for (let name of attr_names) {
            //let metadata = Module.get_attribute_metadata(this.file_id, this.path, name);
            /*Object.defineProperty(attrs, name, {
                get: () => ({
                    value: get_attr(this.file_id, this.path, name)
                    //dtype: metadata_to_dtype(metadata)
                }),
                enumerable: true
            });
            */
           attrs[name] = get_attr(this.file_id, this.path, name);
        }
        return attrs;
        
    }

    get_attribute(name) {
        get_attr(this.file_id, this.path, name);
    }

}

export class Group extends HasAttrs {
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

    toString() {
        return `Group(file_id=${this.file_id}, path=${this.path})`;
    }
}

export class File extends Group {
    constructor(filename, mode = "r") {
        super(null, "/");
        let h5_mode = Module[ACCESS_MODES[mode]];
        this.file_id = Module.ccall("H5Fopen", "bigint", ["string", "number", "bigint"], [filename, h5_mode, 0n]);
        this.filename = filename;
        this.mode = mode;
    }

    close() {
        return Module.ccall("H5Fclose", "number", ["bigint"], [this.file_id]);
    }
}



export class Dataset extends HasAttrs {
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
        let data = Module.get_dataset_data(this.file_id, this.path, null, null);
        return process_data(data, metadata);
    }

    slice(ranges) {
        // interpret ranges as [start, stop], with one per dim.
        let metadata = this.metadata;
        let shape = metadata.shape;
        let ndims = shape.length;
        let count = shape.map((s, i) => BigInt(Math.min(s, ranges?.[i]?.[1] ?? s) - Math.max(0, ranges?.[i]?.[0] ?? 0)));
        let offset = shape.map((s, i) => BigInt(Math.min(s, Math.max(0, ranges?.[i]?.[0] ?? 0))));
        //let count_array = new BigUint64Array(count);
        //let offset_array = new BigUint64Array(offset);
        //let count_ptr = Module._malloc(count_array.byteLength);
        //let offset_ptr = Module._malloc(offset_array.byteLength);
        //Module.HEAPU8.set(new Uint8Array(count_array.buffer), count_ptr);
        //Module.HEAPU8.set(new Uint8Array(offset_array.buffer), offset_ptr);
        //console.log(count, count_array, count_ptr);
        //console.log(offset, offset_array, offset_ptr);
        //let data = Module.get_dataset_data(this.file_id, this.path, count_ptr, offset_ptr);
        console.log(count, offset);
        let data = Module.get_dataset_data(this.file_id, this.path, count, offset);
        //Module._free(count_ptr);
        //Module._free(offset_ptr);
        return process_data(data, metadata);
    }
}
