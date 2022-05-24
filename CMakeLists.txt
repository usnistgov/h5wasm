cmake_minimum_required(VERSION 3.14)
include(FetchContent)

project(H5WASM
    DESCRIPTION "High level HDF5 read/write library"
    LANGUAGES CXX C
)

FetchContent_Declare(
  libhdf5-wasm
#  URL file:///home/brian/dev/libhdf5-wasm/libhdf5-wasm.tar.gz
   URL https://github.com/usnistgov/libhdf5-wasm/releases/download/v0.1.1/libhdf5-1_12_1-wasm.tar.gz
   URL_HASH SHA256=e9bb11d89c4f26fa79b9cf1dab6159640c7b184ebf00dc97b098cd4f6de49bfe
)
FetchContent_MakeAvailable(libhdf5-wasm)

add_executable(hdf5_util src/hdf5_util.cc)
target_link_libraries(hdf5_util hdf5-wasm)

# Optional flags to set when building your project
set_target_properties(hdf5_util PROPERTIES
    LINK_FLAGS "-O3 --bind  \
    -lidbfs.js \
    -s ALLOW_TABLE_GROWTH=1 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s WASM_BIGINT \
    -s ENVIRONMENT=web,worker \
    -s SINGLE_FILE \
    -s EXPORT_ES6=1 \
    -s FORCE_FILESYSTEM=1 \
    -s USE_ZLIB=1 \
    -s EXPORTED_RUNTIME_METHODS=\"['ccall', 'cwrap', 'FS', 'AsciiToString', 'UTF8ToString']\" \
    -s EXPORTED_FUNCTIONS=\"['_H5Fopen', '_H5Fclose', '_H5Fcreate']\""
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist/esm
    RUNTIME_OUTPUT_NAME hdf5_util
)

add_executable(hdf5_util_node src/hdf5_util.cc)
target_link_libraries(hdf5_util_node hdf5-wasm)
set_target_properties(hdf5_util_node PROPERTIES
    LINK_FLAGS "-O3 --bind  \
    --extern-pre-js ${CMAKE_CURRENT_SOURCE_DIR}/src/node_esm_shim.js \
    -s ALLOW_TABLE_GROWTH=1 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s WASM_BIGINT \
    -s NODERAWFS=1 \
    -s FORCE_FILESYSTEM=1 \
    -s ENVIRONMENT=node \
    -s SINGLE_FILE \
    -s EXPORT_ES6=1 \
    -s USE_ZLIB=1 \
    -s ASSERTIONS=1 \
    -s EXPORTED_RUNTIME_METHODS=\"['ccall', 'cwrap', 'FS', 'AsciiToString', 'UTF8ToString']\" \
    -s EXPORTED_FUNCTIONS=\"['_H5Fopen', '_H5Fclose', '_H5Fcreate']\""
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist/node
    RUNTIME_OUTPUT_NAME hdf5_util
)
