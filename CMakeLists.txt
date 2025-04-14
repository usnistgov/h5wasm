cmake_minimum_required(VERSION 3.24)
include(FetchContent)

project(H5WASM
    DESCRIPTION "High level HDF5 read/write library"
    LANGUAGES CXX C
)

set (BASE_URL "https://github.com/usnistgov/libhdf5-wasm/releases/download/v0.4.6_3.1.68" CACHE STRING "")
# set (BASE_URL "$ENV{HOME}/dev/libhdf5-wasm" CACHE STRING "")

FetchContent_Declare(
  libhdf5-wasm
  URL ${BASE_URL}/HDF5-1.14.6-Emscripten.tar.gz
  URL_HASH SHA256=0c5de36a3c81e3854e57593c55274d89a43db3f8a7bbe6a0d9d5c560e9c222b1
)
if (NOT libhdf5-wasm_POPULATED)
  FetchContent_MakeAvailable(libhdf5-wasm)
endif()

set(HDF5_DIR ${libhdf5-wasm_SOURCE_DIR}/cmake)
find_package(HDF5 REQUIRED CONFIG)

add_executable(hdf5_util src/hdf5_util.cc)
target_link_libraries(hdf5_util hdf5_hl-static)

set (EXPORTED_FUNCTIONS)
list (APPEND EXPORTED_FUNCTIONS
    H5Fopen H5Fclose H5Fcreate H5open 
    malloc calloc free memset memcpy memmove
    htonl htons ntohl ntohs 
    H5allocate_memory H5free_memory 
    pthread_mutex_init posix_memalign strcmp getenv 
    stdin stdout stderr
    H5Epush2 siprintf getTempRet0 __wasm_setjmp
    H5E_ERR_CLS_g H5E_PLINE_g H5E_CANTINIT_g H5E_CANTGET_g H5E_CANTFILTER_g 
    H5E_BADTYPE_g H5E_BADVALUE_g H5E_ARGS_g H5E_CALLBACK_g H5E_CANTREGISTER_g 
    H5E_RESOURCE_g H5E_NOSPACE_g H5E_OVERFLOW_g H5E_READERROR_g 
    H5T_NATIVE_UINT_g H5T_STD_U32BE_g H5T_STD_U32LE_g H5T_NATIVE_UINT32_g 
    H5T_STD_U64BE_g H5T_NATIVE_UINT64_g H5T_STD_U64LE_g H5P_CLS_DATASET_CREATE_ID_g 
    ldexpf __THREW__ __threwValue
)
list (TRANSFORM EXPORTED_FUNCTIONS PREPEND "'_")
list (TRANSFORM EXPORTED_FUNCTIONS APPEND "'")
list(JOIN EXPORTED_FUNCTIONS ", " EXPORTED_FUNCTIONS_STRING)


# Optional flags to set when building your project
set_target_properties(hdf5_util PROPERTIES
    LINK_FLAGS "-O3 --bind  \
    -lidbfs.js \
    -lworkerfs.js \
    -s MAIN_MODULE=2 \
    -s ALLOW_TABLE_GROWTH=1 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s WASM_BIGINT \
    -s ENVIRONMENT=web,worker \
    -s SINGLE_FILE \
    -s EXPORT_ES6=1 \
    -s USE_ES6_IMPORT_META=0 \
    -s FORCE_FILESYSTEM=1 \
    -s EXPORTED_RUNTIME_METHODS=\"['ccall', 'cwrap', 'FS', 'AsciiToString', 'UTF8ToString']\" \
    -s EXPORTED_FUNCTIONS=\"${EXPORTED_FUNCTIONS_STRING}\""
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist/esm
    RUNTIME_OUTPUT_NAME hdf5_util
    POSITION_INDEPENDENT_CODE ON
)

add_executable(hdf5_util_node src/hdf5_util.cc)
target_link_libraries(hdf5_util_node hdf5_hl-static)
set_target_properties(hdf5_util_node PROPERTIES
    LINK_FLAGS "-O3 --bind  \
    -s MAIN_MODULE=2 \
    -s NODEJS_CATCH_EXIT=0 \
    -s NODEJS_CATCH_REJECTION=0 \
    -s ALLOW_TABLE_GROWTH=1 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s WASM_BIGINT \
    -s NODERAWFS=1 \
    -s FORCE_FILESYSTEM=1 \
    -s ENVIRONMENT=node \
    -s SINGLE_FILE \
    -s EXPORT_ES6=1 \
    -s ASSERTIONS=1 \
    -s EXPORTED_RUNTIME_METHODS=\"['ccall', 'cwrap', 'FS', 'AsciiToString', 'UTF8ToString']\" \
    -s EXPORTED_FUNCTIONS=\"${EXPORTED_FUNCTIONS_STRING}\""
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist/node
    RUNTIME_OUTPUT_NAME hdf5_util
    POSITION_INDEPENDENT_CODE ON
)
