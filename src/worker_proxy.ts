import * as Comlink from 'comlink';
import type { api } from './lib_worker.ts';
// @ts-ignore (esbuild-plugin-inline-worker will rewrite this import)
import DedicatedWorker from './h5wasm.worker.ts';

import { ACCESS_MODES } from './hdf5_hl.ts';
import type { File as H5WasmFile, Group, Dataset, Datatype, BrokenSoftLink } from './hdf5_hl.ts';
export type { H5WasmFile, Group, Dataset, Datatype, BrokenSoftLink };

type ACCESS_MODESTRING = keyof typeof ACCESS_MODES;

const worker = new DedicatedWorker(); // new Worker('./worker.js');
const remote = Comlink.wrap(worker) as Comlink.Remote<typeof api>;

export class GroupProxy {
  proxy: Comlink.Remote<Group>;
  file_id: bigint;
  constructor(proxy: Comlink.Remote<Group>, file_id: bigint) {
    this.proxy = proxy;
    this.file_id = file_id;
  }

  async keys() {
    return await this.proxy.keys();
  }

  async paths() {
    return await this.proxy.paths();
  } 

  async get(name: string = "/") {
    const dumb_obj = await this.proxy.get(name);
    // convert to a proxy of the object:
    if (dumb_obj?.type === "Group") {
      const new_group_proxy = await new remote.Group(dumb_obj.file_id, dumb_obj.path);
      return new GroupProxy(new_group_proxy, this.file_id);
    }
    else if (dumb_obj?.type === "Dataset") {
      return new remote.Dataset(dumb_obj.file_id, dumb_obj.path);
    }
    else if (dumb_obj?.type === "Datatype") {
      return new remote.Datatype();
    }
    else if (dumb_obj?.type === "BrokenSoftLink") {
      return new remote.BrokenSoftLink(dumb_obj?.target);
    }
    return 
  }
}

export class FileProxy extends GroupProxy {
  filename: string;
  mode: ACCESS_MODESTRING;
  constructor(proxy: Comlink.Remote<H5WasmFile>, file_id: bigint, filename: string, mode: ACCESS_MODESTRING = 'r') {
    super(proxy, file_id);
    this.filename = filename;
    this.mode = mode;
  }
}

export async function get_file_proxy(filename: string, mode: ACCESS_MODESTRING = 'r') {
  const file_proxy = await new remote.H5WasmFile(filename, mode);
  const file_id = await file_proxy.file_id;
  return new FileProxy(file_proxy, file_id, filename, mode);
}

export async function save_to_workerfs(file: File) {
  const { name, lastModified, size } = file;
  console.log(`Saving file ${name} of size ${lastModified} to workerfs...`);
  return await remote.save_to_workerfs(file);
}

export async function save_to_memfs(file: File) {
  const { name, lastModified, size } = file;
  console.log(`Saving file ${name} of size ${lastModified} to memfs...`);
  return await remote.save_to_memfs(file);
}

export async function save_bytes_to_memfs(filename: string, bytes: Uint8Array) {
  console.log(`Saving bytes to memfs...`);
  return await remote.save_bytes_to_memfs(filename, bytes);
}