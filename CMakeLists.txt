cmake_minimum_required(VERSION 3.10)

# pre-cache the linker flags
set(CMAKE_EXE_LINKER_FLAGS_INIT "-sNODERAWFS=1 -sUSE_ZLIB=1" CACHE INTERNAL "")

# set the project name
project(H5WASM)

option(BUILD_SHARED_LIBS "Build shared libs" OFF)
option(HDF5_BUILD_EXAMPLES "Build Examples" OFF)
option(HDF5_BUILD_TOOLS "Build Tools" OFF)
option(HDF5_BUILD_UTILS "Build Utils" OFF)
option(BUILD_TESTING "Build Tests" OFF)
option(HDF5_BUILD_CPP_LIB "Build CPP libraries" ON)
option(HDF5_ENABLE_Z_LIB_SUPPORT "Enable ZLIB" ON)

set(CMAKE_INSTALL_PREFIX hdf5)
set(H5_HAVE_GETPWUID OFF)
set(H5_HAVE_SIGNAL OFF)

add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/hdf5-hdf5-1_12_1)
