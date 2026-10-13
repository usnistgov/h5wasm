import type { File as H5WasmFile } from './hdf5_hl.js';
export declare const UPLOADED_FILES: string[];
export declare function uploader(event: Event): Promise<void>;
export declare const downloader: (data: any, fileName: string) => void;
export declare function to_blob(hdf5_file: H5WasmFile): Promise<Blob>;
export declare function download(hdf5_file: H5WasmFile): Promise<void>;
export declare function dirlisting(path: string, FS: FS.FileSystemType): {
    files: string[];
    subfolders: string[];
} | {};
