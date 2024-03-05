import * as h5wasm from '../dist/esm/hdf5_hl';

const WORKERFS_MOUNT = '/workerfs';

async function save_to_workerfs(file: File) {
  const { FS, WORKERFS, mount } = await workerfs_promise;
  const { name: filename, size } = file;
  const output_path = `${WORKERFS_MOUNT}/${filename}`;
  if (FS.analyzePath(output_path).exists) {
    console.warn(`File ${output_path} already exists. Overwriting...`);
  }
  const outfile = WORKERFS.createNode(mount, filename, WORKERFS.FILE_MODE, 0, file);
  return output_path;
}

async function save_bytes_to_memfs(filename: string, bytes: Uint8Array) {
  const { FS } = await h5wasm.ready;
  const output_path = filename;
  if (FS.analyzePath(output_path).exists) {
    console.warn(`File ${output_path} already exists. Overwriting...`);
  }
  FS.writeFile(output_path, bytes);
  return output_path;
}

async function save_to_memfs(file: File) {
  const { name: filename } = file;
  const ab = await file.arrayBuffer();
  return save_bytes_to_memfs(filename, new Uint8Array(ab));
}

async function _mount_workerfs() {
  const { FS } = await h5wasm.ready;
  const { filesystems: { WORKERFS } } = FS;
  if (!FS.analyzePath(WORKERFS_MOUNT).exists) {
    FS.mkdir(WORKERFS_MOUNT);
  }
  const mount = FS.mount(WORKERFS, {}, WORKERFS_MOUNT);
  return { FS, WORKERFS, mount };
}

const workerfs_promise = _mount_workerfs();

export const api = {
  ready: h5wasm.ready,
  save_to_workerfs,
  save_to_memfs,
  save_bytes_to_memfs,
  H5WasmFile: h5wasm.File,
  Dataset: h5wasm.Dataset,
  Group: h5wasm.Group,
  Datatype: h5wasm.Datatype,
  BrokenSoftLink: h5wasm.BrokenSoftLink,
}

