const Module = require("./node/hdf5_util.js");

// Manually exported Module in hdf5_hl_node.js.
const ready = new Promise(resolve => {
    Module.onRuntimeInitialized = () => { resolve(true) };
});

module.exports = {File, Dataset, Group, ACCESS_MODES, ready};
