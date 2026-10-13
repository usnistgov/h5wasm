import { ready } from "./hdf5_hl.js";

const BLOCK_SIZE = 64 * 1024;
const CACHE_BLOCKS = 256;
const MAX_BLOCKS = 128; // per request
const TIMEOUT = 30000; // ms per request

const WORKER_SOURCE = `import("node:worker_threads").then(({ parentPort, workerData: { url, size, state, data } }) => {
    state = new Int32Array(state), data = new Uint8Array(data);
    parentPort.on("message", async ({ start, end }) => {
        let status = 2;
        try {
            const response = await fetch(url, { headers: { Range: "bytes=" + start + "-" + end, "Accept-Encoding": "identity" }, signal: AbortSignal.timeout(${TIMEOUT}) });
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (response.status === 206 && response.headers.get("Content-Range") === "bytes " + start + "-" + end + "/" + size && bytes.length === end - start + 1) {
                data.set(bytes), status = 1;
            }
        } catch {}
        Atomics.store(state, 0, status);
        Atomics.notify(state, 0);
    });
});`;

/**
 * Lazily read `url` with HTTP Range requests on Node.js or Deno (where FS.createLazyFile, which
 * needs synchronous XHR, can't work): a worker thread fetches while the caller blocks on Atomics.wait.
 * Creates read-only `filename` in the filesystem of the default "h5wasm" build (not "h5wasm/node").
 */
export async function create_lazy_url_file(url: string, filename: string) {
    const FS: any = (await ready).FS;
    // a one-byte GET rather than HEAD, because presigned URLs are only valid for GET
    const probe = await fetch(url, { headers: { Range: "bytes=0-0", "Accept-Encoding": "identity" }, signal: AbortSignal.timeout(TIMEOUT) });
    await probe.body?.cancel();
    const size = Number(probe.headers.get("Content-Range")?.match(/^bytes 0-0\/([1-9]\d*)$/)?.[1]);
    if (probe.status !== 206 || !size) {
        throw new Error(`${url} does not support HTTP Range requests (status ${probe.status})`);
    }

    const slash = filename.lastIndexOf("/");
    const node = FS.createFile(slash < 0 ? FS.cwd() : filename.slice(0, slash) || "/", filename.slice(slash + 1), {}, true, false);
    const path = FS.getPath(node);
    const { Worker } = await import("node:worker_threads" as string);
    const state = new Int32Array(new SharedArrayBuffer(4));
    const data = new Uint8Array(new SharedArrayBuffer(MAX_BLOCKS * BLOCK_SIZE));
    const worker = new Worker(WORKER_SOURCE, { eval: true, workerData: { url, size, state: state.buffer, data: data.buffer } });
    worker.unref();
    const stats = { requests: 0, bytes_fetched: 0 };
    const cache = new Map<number, Uint8Array>();
    let failed = false;

    // fetch block `first` and any missing blocks after it, up to `last`, into the cache
    function fetch_blocks(first: number, last: number) {
        let count = 1;
        while (first + count <= last && count < MAX_BLOCKS && !cache.has(first + count)) count++;
        const start = first * BLOCK_SIZE, end = Math.min((first + count) * BLOCK_SIZE, size) - 1;
        Atomics.store(state, 0, 0);
        worker.postMessage({ start, end });
        if (Atomics.wait(state, 0, 0, TIMEOUT + 5000) === "timed-out") {
            failed = true; // a late reply could be mistaken for the next request's
            worker.terminate();
        }
        if (failed || state[0] !== 1) {
            throw new FS.ErrnoError(29); // EIO
        }
        stats.requests += 1;
        stats.bytes_fetched += end - start + 1;
        for (let i = 0; i < count; i++) {
            cache.set(first + i, data.slice(i * BLOCK_SIZE, Math.min((i + 1) * BLOCK_SIZE, end - start + 1)));
        }
    }

    node.usedBytes = size;
    node.stream_ops = {
        ...node.stream_ops,
        read(_stream: unknown, buffer: Int8Array, offset: number, length: number, position: number) {
            const n = Math.min(length, size - position);
            if (n <= 0) return 0;
            const last = Math.floor((position + n - 1) / BLOCK_SIZE);
            for (let index = Math.floor(position / BLOCK_SIZE); index <= last; index++) {
                if (!cache.has(index)) fetch_blocks(index, last);
                const block = cache.get(index)!, start = index * BLOCK_SIZE, from = Math.max(position, start);
                cache.delete(index); // move to the most recently used end
                cache.set(index, block);
                buffer.set(block.subarray(from - start, Math.min(position + n, start + block.length) - start), offset + from - position);
            }
            while (cache.size > CACHE_BLOCKS) cache.delete(cache.keys().next().value!);
            return n;
        },
    };

    return { filename: path, size, stats, close: () => { worker.terminate(); FS.unlink(path); } };
}
