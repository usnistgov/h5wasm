import ModuleFactory from './esm/hdf5_util.js';
export {File, Group, Dataset, ready, FS, Module, ACCESS_MODES};

var Module = null;
var FS = null;
const ready = ModuleFactory({ noInitialRun: true }).then((result) => { Module = result; FS = Module.FS });


