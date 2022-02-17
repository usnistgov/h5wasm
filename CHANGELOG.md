# Changelog

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