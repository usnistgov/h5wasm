BUILD_DIR = build
DIST_DIR = dist

all:
	mkdir -p dist/esm dist/node;
	mkdir -p $(BUILD_DIR);
	cd $(BUILD_DIR) && emcmake cmake ../;
	cd $(BUILD_DIR) && emmake make -j8;

clean:
	rm -rf $(BUILD_DIR);
	rm -rf $(DIST_DIR)/esm/;
	rm -rf $(DIST_DIR)/node/;
