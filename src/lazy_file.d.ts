/**
 * Lazily read `url` with HTTP Range requests on Node.js or Deno (where FS.createLazyFile, which
 * needs synchronous XHR, can't work): a worker thread fetches while the caller blocks on Atomics.wait.
 * Creates read-only `filename` in the filesystem of the default "h5wasm" build (not "h5wasm/node").
 */
export declare function create_lazy_url_file(url: string, filename: string): Promise<{
    filename: any;
    size: number;
    stats: {
        requests: number;
        bytes_fetched: number;
    };
    close: () => void;
}>;
