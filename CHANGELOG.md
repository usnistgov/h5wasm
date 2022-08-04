# Changelog
## v0.4.6 2022-08-04
### Changed
 - removed ```Dataset.auto_refresh``` and replaced with ```.refresh()``` method (allows consistent access to metadata and data between refreshes)
## v0.4.5 2022-08-04
### Fixed
 - H5Create should only be called with access modes H5F_ACC_TRUNC (w) and H5F_ACC_EXCL (x)
### Added
 - support for SWMR read with refresh on a dataset: e.g. 
```js
const file = new hdf5.File("swmr.h5", "Sr");
let ds=file.get("data");
ds.auto_refresh=true;
ds.shape;
// returns 12
ds.shape;
// returns 16 because dataset was updated with SWMR write
ds.value
// has size=16
```
## v0.4.4 2022-05-25
### Fixed
 - error in ```isIterable``` when called on non-object (affects ```to_array``` method)
## v0.4.3 2022-05-24
### Added
 - ```to_array``` method on Dataset and Attribute classes: returns nested array of values with dimensions matching ```shape```.  Auto-converts all values to JSON-compatible types (BigInt -> Number, TypedArray -> Array)
 - auto-convert h5py-style boolean datasets (where datatype = ENUM {FALSE:0, TRUE:1}) to JS booleans
 - automated testing of code with Github Action
### Fixed
 - enum_type.members is now an object {[name: string]: value: number}
   (previous implementation with Array could have wrong name order)
## v0.4.2 2022-05-10
### Added
 - extended metadata for ENUM type (including names of members)
### Fixed
 - Typings for metadata on attributes and datasets
## v0.4.1 2022-05-02
### Added
 - Minimal handling of reading datatype H5T_ENUM (treats as integer base type)
### Fixed
 - All strings now truncated at first null byte before decoding
 - Fixed memory leaks from opening dtype and plist objects
 - Singleton values (shape = []) were being returned as length-1 array due to logic error, now fixed
## v0.4.0 2022-04-28
### Changed
 - **POSSIBLY BREAKING**: nodejs target is compiled as ESM instead of CommonJs
 - default export is now an object, which can help when ```import *``` is discouraged
   ```js
   export const h5wasm = {
     File,
     Group,
     Dataset,
     ready,
     ACCESS_MODES
   }
   export default h5wasm;
   ```
 - ```ready``` export now returns ```Promise<H5Module>```
 - recommended access to filesystem is by
   ```js
   const { FS } = await h5wasm.ready;
   ```
### Added
 - VLEN string writing and reading test
 - TypeScript types added for Attribute
 - Full metadata added to Attribute in addition to dtype and shape
## v0.3.2 2022-04-12
### Fixed
 - TypeScript ```strict``` mode checking enabled for build
 - all TypeScript type errors resolved
 - unused portions of the ```EmscriptenModule``` interface that raise errors in nodejs builds are removed (both of these depend on dom definitions)
     - preinitializedWebGLContext: WebGLRenderingContext;
     - onCustomMessage(event: MessageEvent): void;

## v0.3.1 2022-03-31
### Added
 - ```Group.get_type(path)``` will now return
     - ```H5G_LINK (3)``` if path is a dangling soft link
     - ```H5G_UDLINK (4)``` if path is a user-defined (e.g. external) link
 - ```Group.get(path)``` will now return
     - ```BrokenSoftLink(target: string)``` if the path is a dangling soft link
     - ```ExternalLink(filename: string, obj_path: string)``` if the path is an external link
     - ```undefined``` if the path is a user-defined link that is not an external link.

## v0.3.0 2022-03-23
### Changed
 - compiled with ```-s SINGLE_FILE``` to embed WASM in output .js file (for compatibility with bundlers)
 - using external build of libhdf5 from https://github.com/usnistgov/libhdf5-wasm

## v0.2.2 2022-02-16
### Added
 - IDBFS adapter added to ESM module

### Changed
 - license statement expanded

## v0.2.1 2022-02-04
### Fixed
 - Writing of Float64 datasets was broken, and is now working
 - Guessed shape of simple string values is fixed so that this will work: 
```js
  f.create_attribute("my_attr", "a string value");
```
 - Group.prototype.create_dataset now returns type Dataset (ts)

## v0.2.0 2022-01-25
### Added
 - Typescript definitions (src/hdf5_hl.d.ts)
 - Support for reading and processing HDF5 Array datatype
 - esm and nodejs modules both offer ```ready``` Promise, which can be awaited before working with the module (addresses #5)
 - minimal set of tests (```npm test```)
 
### Changed
 - **POSSIBLY BREAKING**: local paths to modules are changed
     - esm: ./dist/esm/hdf5_hl.js
     - node (CJS): ./dist/node/hdf5_hl.js
 - Build step added (esm and nodejs modules both built from Typescript source)
 - Build artifacts no longer available from ```dist``` branch, will be uploaded as .tgz archive (output of npm pack) to releases

## v0.1.8 2022-01-06
### Added
 - auto decoding of [Compound datatypes](https://support.hdfgroup.org/HDF5/Tutor/compound.html) to native Javascript arrays

## v0.1.7 2021-12-24
### Fixed
 - ESM build targets web environment (no 'require' statements - fixes builds using webpack e.g. create-react-app)
 - emscripten build script altered to work on OSX as well as linux (compatible call to shasum)

## v0.1.6 2021-09-16
### Fixed
 - minor bugfix in string reading ('metadata' spelled wrong)

## v0.1.5 2021-09-15
### Added
 - export AsciiToString and UTF8ToString from emscripten
 - support reading vlen strings in data and attributes
 - support writing vlen strings

### Changed
 - reclaim memory for vlen data in get_attr

## v0.1.4 2021-09-15
### Changed
 - added documentation for finding libhdf5.a

### Fixed 
 - documentation for creating new File object in nodejs
 - checking for name existing before getting type in wasm lib

## v0.1.3 2021-09-12
### Added
 - download/upload helpers for web (file_handlers.js)

### Changed
 - use ZLIB from emscripten ports
