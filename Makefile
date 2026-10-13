BUILD_DIR = build
DIST_DIR = dist

all:
	mkdir -p dist/esm dist/node;
	mkdir -p $(BUILD_DIR);
	cd $(BUILD_DIR) && emcmake cmake ../;
	cd $(BUILD_DIR) && emmake make -j8;

# opt-in: make wasm64 LIBHDF5_WASM64_URL=<url or path> LIBHDF5_WASM64_SHA256=<sha256>
wasm64:
	mkdir -p dist/wasm64/esm dist/wasm64/node $(BUILD_DIR)-wasm64;
	cd $(BUILD_DIR)-wasm64 && emcmake cmake ../ -DH5WASM_WASM64=ON -DLIBHDF5_WASM64_URL="$(LIBHDF5_WASM64_URL)" -DLIBHDF5_WASM64_SHA256="$(LIBHDF5_WASM64_SHA256)";
	cd $(BUILD_DIR)-wasm64 && emmake make -j8;

clean:
	rm -rf $(BUILD_DIR) $(BUILD_DIR)-wasm64;
	rm -rf $(DIST_DIR)/esm/;
	rm -rf $(DIST_DIR)/node/ $(DIST_DIR)/wasm64/;
