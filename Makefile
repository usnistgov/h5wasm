BUILD_DIR = build

all:
	mkdir -p dist/esm dist/node;
	mkdir -p $(BUILD_DIR);
	cd $(BUILD_DIR) && emcmake cmake ../;
	cd $(BUILD_DIR) && emmake make -j8;

clean:
	rm -rf $(BUILD_DIR);
	rm -rf $(APP_DIR)/esm/;
	rm -rf $(APP_DIR)/node/;
