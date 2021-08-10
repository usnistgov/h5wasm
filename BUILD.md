# Instructions to build
uses https://github.com/attilaolah/wasm

adding zlib support with this patch:
```diff
diff --git a/lib/hdf5/BUILD.bazel b/lib/hdf5/BUILD.bazel
index 4237419..62ba401 100644
--- a/lib/hdf5/BUILD.bazel
+++ b/lib/hdf5/BUILD.bazel
@@ -23,6 +23,9 @@ CACHE_ENTRIES = {
     "CMAKE_C_FLAGS": C_FLAGS,
     "HDF5_BUILD_EXAMPLES": False,
     "HDF5_BUILD_TOOLS": False,
+    "HDF5_ENABLE_Z_LIB_SUPPORT": True,
+    "ZLIB_INCLUDE_DIR": "${EXT_BUILD_DEPS}/z_lib/include",
+    "ZLIB_LIBRARY": "${EXT_BUILD_DEPS}/z_lib/lib/libz.a",
 }
 
 CACHE_ENTRIES_WASM = dict(CACHE_ENTRIES.items() + {
@@ -40,6 +43,9 @@ cmake_lib(
         "//config:wasm": CACHE_ENTRIES_WASM,
         "//conditions:default": CACHE_ENTRIES,
     },
+    deps = [
+        "//lib/z",
+    ],
 )
 
 bzl_library(
```
connect to the docker instance:

```sh
$ docker build -t wasm docker
$ docker run -it -v "${PWD}:/build" --cpus="2" wasm

root@b848a9fecbe2:/build# bazel build //lib/hdf5 --cpu=wasm32
Extracting Bazel installation...
Starting local Bazel server and connecting to it...
INFO: SHA256 (https://golang.org/dl/?mode=json&include=all) = d573d58086c9a6f4c46d15275a00b7afde756da22a7de3f17ab24a44a71a24f0
INFO: Analyzed target //lib/hdf5:hdf5 (248 packages loaded, 36121 targets configured).
INFO: Found 1 target...
Target //lib/hdf5:hdf5 up-to-date:
  bazel-bin/lib/hdf5/hdf5_lib/include
  bazel-bin/lib/hdf5/hdf5_lib/lib/libhdf5.a
  bazel-bin/lib/hdf5/copy_hdf5_lib/hdf5_lib
INFO: Elapsed time: 1007.715s, Critical Path: 775.34s
INFO: 25 processes: 17 internal, 8 processwrapper-sandbox.
INFO: Build completed successfully, 25 total actions
root@b848a9fecbe2:/build# cp -r bazel-bin/lib/hdf5/copy_hdf5_lib/hdf5_lib/ .

```

now in the wasm folder there is a copy of the hdf library, including .a files in hdf5_lib/lib and includes in hdf5_lib/include

For an automatic build, put build_copy.sh in your wasm directory and run

```sh
~/dev/wasm$ docker run --rm -v "${PWD}:/build" wasm ./build_copy.sh
```

build your own libraries against it with emscripten:

```sh
emcc hdf5_lib/lib/libhdf5.a hdf5_util.cc -o dist/hdf5_util.html \
         -I./hdf5_lib/include \
         --bind  \
         -s ALLOW_TABLE_GROWTH=1 \
         -s ALLOW_MEMORY_GROWTH=1 \
         -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']" \
         -s WASM_BIGINT -s USE_ZLIB=1 \
         -s EXPORTED_FUNCTIONS="['_H5Fopen', '_H5Fclose']"
```
or
```sh
emcc hdf5_lib/lib/libhdf5.a hdf5_lib/lib/libhdf5_hl.a hdf5_lib/lib/libhdf5_cpp.a h5js_lib.cpp -o dist/h5js_module.js \
         -I./hdf5_lib/include \
         --bind  \
         -s EXPORT_ES6=1 \
         -s MODULARIZE=1 \
         -s FORCE_FILESYSTEM=1 \
         -s ALLOW_TABLE_GROWTH=1 \
         -s ALLOW_MEMORY_GROWTH=1 \
         -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'FS']" \
         -s WASM_BIGINT -s USE_ZLIB=1 \

```