WASM_BUILD_DIR = wasm_build
WASM_LIB_DIR = $(WASM_BUILD_DIR)/hdf5/lib
WASM_INCLUDE_DIR = $(WASM_BUILD_DIR)/hdf5/include
WASM_LIBS = $(WASM_LIB_DIR)/libhdf5.a $(WASM_LIB_DIR)/libhdf5_hl.a 

#WASM_LIBS = libhdf5.a
HDF5_VER = hdf5-1_12_1
HDF5_SRC = hdf5-$(HDF5_VER)

HDF5_DOWNLOAD_URL = https://github.com/HDFGroup/hdf5/archive/refs/tags/$(HDF5_VER).tar.gz
HDF5_DOWNLOAD_HASH = e6dde173c2d243551922d23a0387a79961205b018502e6a742acb30b61bc2d5f
SRC = src
APP_DIR = dist
APP_WASM = $(APP_DIR)/esm/hdf5_util.js $(APP_DIR)/node/hdf5_util.js
LIBHDF5 = $(APP_DIR)/libhdf5.js $(APP_DIR)/libhdf5_sa.wasm

app: $(APP_WASM)
all: $(HDF5_SRC) $(APP_WASM) 
wasm: $(WASM_LIBS)
wasm_tar: libhdf5_wasm.tgz

$(HDF5_SRC):
	curl -L $(HDF5_DOWNLOAD_URL) -o hdf5_src.tgz;
	echo "$(HDF5_DOWNLOAD_HASH)  hdf5_src.tgz" | shasum -a 256 --check -;
	tar -xzf hdf5_src.tgz;

C_FLAGS = \
   -Wno-incompatible-pointer-types-discards-qualifiers \
   -Wno-misleading-indentation \
   -Wno-missing-braces \
   -Wno-self-assign \
   -Wno-sometimes-uninitialized \
   -Wno-unknown-warning-option \
   -Wno-unused-but-set-variable \
   -Wno-unused-function \
   -Wno-unused-variable \

$(WASM_LIBS): $(HDF5_SRC)
	mkdir -p $(WASM_BUILD_DIR);
	cd $(WASM_BUILD_DIR) && emcmake cmake ../
	cd $(WASM_BUILD_DIR) && emmake make -j8 install;

wasm_tar: $(WASM_LIBS)
	tar -C $(WASM_BUILD_DIR)/hdf5/ -czf libhdf5_wasm.tgz include lib

$(LIBHDF5): $(WASM_LIBS)
	emcc -O3 $(WASM_LIBS) \
	  -o $(APP_DIR)/libhdf5.html \
	  -I$(WASM_INCLUDE_DIR)/src \
	  -s WASM_BIGINT \
	  -s FORCE_FILESYSTEM=1 \
	  -s USE_ZLIB=1 \
	  -s EXPORT_ALL=1 \
	  -s LINKABLE=1 \
	  -s INCLUDE_FULL_LIBRARY=1 \
	  -s EXTRA_EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'FS']"


#	  -s EXTRA_EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'FS']"

$(APP_WASM): $(SRC)/hdf5_util.cc $(WASM_LIBS)
	mkdir -p dist/esm dist/node;
	emcc -O3 $(WASM_LIBS) $(SRC)/hdf5_util.cc -o $(APP_DIR)/esm/hdf5_util.js \
		-I$(WASM_INCLUDE_DIR) \
		--bind  \
		-lidbfs.js \
		-s ALLOW_TABLE_GROWTH=1 \
		-s ALLOW_MEMORY_GROWTH=1 \
		-s WASM_BIGINT \
		-s ENVIRONMENT=web \
		-s EXPORT_ES6=1 \
		-s FORCE_FILESYSTEM=1 \
		-s USE_ZLIB=1 \
		-s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'FS', 'AsciiToString', 'UTF8ToString']" \
		-s EXPORTED_FUNCTIONS="['_H5Fopen', '_H5Fclose', '_H5Fcreate']";
		
	emcc -O3 $(WASM_LIBS) $(SRC)/hdf5_util.cc -o $(APP_DIR)/node/hdf5_util.js \
		-I$(WASM_INCLUDE_DIR) \
		--bind  \
		-s ALLOW_TABLE_GROWTH=1 \
		-s ALLOW_MEMORY_GROWTH=1 \
		-s WASM_BIGINT \
		-s NODERAWFS=1 \
		-s FORCE_FILESYSTEM=1 \
		-s ENVIRONMENT=node \
		-s MODULARIZE=1 \
		-s USE_ZLIB=1 \
		-s ASSERTIONS=1 \
		-s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'FS', 'AsciiToString', 'UTF8ToString']" \
		-s EXPORTED_FUNCTIONS="['_H5Fopen', '_H5Fclose', '_H5Fcreate']";


clean:
	rm -rf $(WASM_BUILD_DIR);
	rm -rf $(APP_DIR)/esm/;
	rm -rf $(APP_DIR)/node/;
