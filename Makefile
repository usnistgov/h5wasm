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
APP = $(APP_DIR)/hdf5_hl.js $(APP_DIR)/hdf5_hl_node.js $(APP_DIR)/esm/hdf5_util.js $(APP_DIR)/node/hdf5_util.js
LIBHDF5 = $(APP_DIR)/libhdf5.js $(APP_DIR)/libhdf5_sa.wasm

app: $(APP)
all: $(HDF5_SRC) $(APP) $(LIBHDF5) 
wasm: $(WASM_LIBS)

$(HDF5_SRC):
	curl -L $(HDF5_DOWNLOAD_URL) -o hdf5_src.tgz;
	echo "$(HDF5_DOWNLOAD_HASH) hdf5_src.tgz" | sha256sum --check;
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
	cd $(WASM_BUILD_DIR) \
        && LDFLAGS="-s NODERAWFS=1" emcmake cmake ../$(HDF5_SRC) \
        -DCMAKE_INSTALL_PREFIX=hdf5 \
        -DH5_HAVE_GETPWUID=0 \
        -DH5_HAVE_SIGNAL=0 \
        -DBUILD_SHARED_LIBS=0 \
        -DBUILD_STATIC_LIBS=1 \
        -DBUILD_TESTING=0 \
        -DCMAKE_C_FLAGS=$(C_FLAGS) \
        -DHDF5_BUILD_EXAMPLES=0 \
        -DHDF5_BUILD_TOOLS=0 \
        -DHDF5_ENABLE_Z_LIB_SUPPORT=1;
	cd $(WASM_BUILD_DIR) && emmake make -j8 install;

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

$(APP): $(SRC)/hdf5_util.cc $(WASM_LIBS)
	mkdir -p dist/esm dist/node;
	emcc -O3 $(WASM_LIBS) $(SRC)/hdf5_util.cc -o $(APP_DIR)/esm/hdf5_util.js \
        -I$(WASM_INCLUDE_DIR) \
        --bind  \
        -s ALLOW_TABLE_GROWTH=1 \
        -s ALLOW_MEMORY_GROWTH=1 \
		-s WASM_BIGINT \
		-s EXPORT_ES6=1 \
		-s MODULARIZE=1 \
		-s FORCE_FILESYSTEM=1 \
		-s USE_ZLIB=1 \
		-s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'FS']" \
		-s EXPORTED_FUNCTIONS="['_H5Fopen', '_H5Fclose', '_H5Fcreate']";
		
	emcc -O3 $(WASM_LIBS) $(SRC)/hdf5_util.cc -o $(APP_DIR)/node/hdf5_util.js \
        -I$(WASM_INCLUDE_DIR) \
        --bind  \
        -s ALLOW_TABLE_GROWTH=1 \
        -s ALLOW_MEMORY_GROWTH=1 \
		-s WASM_BIGINT \
		-s NODERAWFS=1 \
		-s FORCE_FILESYSTEM=1 \
		-s USE_ZLIB=1 \
		-s ASSERTIONS=1 \
		-s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'FS']" \
		-s EXPORTED_FUNCTIONS="['_H5Fopen', '_H5Fclose', '_H5Fcreate']";
		
	cat $(SRC)/hdf5_hl_esm_header.js > $(APP_DIR)/hdf5_hl.js;
	cat $(SRC)/hdf5_hl_base.js >> $(APP_DIR)/hdf5_hl.js;
	cat $(SRC)/hdf5_hl_base.js > $(APP_DIR)/hdf5_hl_node.js;
	cat $(SRC)/hdf5_hl_node_footer.js >> $(APP_DIR)/hdf5_hl_node.js;
	
	  
clean:
	rm -rf $(WASM_BUILD_DIR);
	rm -rf $(APP_DIR)/esm/;
	rm -f $(APP_DIR)/node/;
