#!/usr/bin/env node

import { strict as assert } from 'assert';
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { Worker } from 'worker_threads';
import h5wasm_node from 'h5wasm/node';
import h5wasm from 'h5wasm';
import { create_lazy_url_file } from 'h5wasm/lazy_file';

// Serves workerData.file (Range only at /ranges.h5) and counts bytes sent. It runs
// in its own thread because lazy reads block the main thread.
const SERVER_SOURCE = `import("node:worker_threads").then(async ({ parentPort, workerData: { file, sent } }) => {
  const fs = await import("node:fs"), http = await import("node:http");
  const server = http.createServer((req, res) => {
    const { size } = fs.statSync(file);
    const range = req.url === "/ranges.h5" && /^bytes=(\\d+)-(\\d+)$/.exec(req.headers.range);
    const start = range ? Number(range[1]) : 0, end = range ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(range ? 206 : 200, range ? { "Content-Range": "bytes " + start + "-" + end + "/" + size } : {});
    new Float64Array(sent)[0] += end - start + 1;
    fs.createReadStream(file, { start, end }).pipe(res);
  });
  server.listen(0, "127.0.0.1", () => parentPort.postMessage(server.address().port));
});`;

async function lazy_url_file_test() {
  await h5wasm.ready;
  await h5wasm_node.ready;
  mkdirSync("test/tmp", { recursive: true });
  const filename = resolve("test/tmp/lazy_url_big.h5");
  const write_file = new h5wasm_node.File(filename, "w");
  write_file.create_dataset({ name: "big", data: Float64Array.from({ length: 2 ** 23 }, (_, i) => i) }); // 64 MiB
  write_file.create_dataset({ name: "small", data: new Int32Array([1, 2, 3, 4]) });
  write_file.close();

  const sent = new Float64Array(new SharedArrayBuffer(8));
  const server = new Worker(SERVER_SOURCE, { eval: true, workerData: { file: filename, sent: sent.buffer } });
  try {
    const port = await new Promise((resolve, reject) => server.once("message", resolve).once("error", reject));
    await assert.rejects(create_lazy_url_file(`http://127.0.0.1:${port}/no_ranges.h5`, "no_ranges.h5"), /does not support HTTP Range/);

    sent[0] = 0;
    const lazy = await create_lazy_url_file(`http://127.0.0.1:${port}/ranges.h5`, "ranges.h5");
    const f = new h5wasm.File(lazy.filename, "r");
    assert.deepEqual([...f.get("small").value], [1, 2, 3, 4]);
    assert.deepEqual([...f.get("big").slice([[1_000_000, 1_000_003]])], [1_000_000, 1_000_001, 1_000_002]);
    f.close();
    lazy.close();
    assert(sent[0] < lazy.size / 100, `fetched ${sent[0]} of ${lazy.size} bytes`);
  }
  finally {
    await server.terminate();
  }
}

export const tests = [
  {
    description: "Lazy URL file reads a dataset slice with a few Range requests",
    test: lazy_url_file_test
  },
];

export default tests;
