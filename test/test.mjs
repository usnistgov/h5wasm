#!/usr/bin/env node

import bool_test from "./bool_test.mjs"
// tests for H5T_COMPOUND and H5T_ARRAY support
import compound_and_array_tests from "./compound_and_array_test.mjs";
import create_dataset from './create_group_dataset.mjs';
import read_to_array from './to_array_test.mjs';

let tests = [];
const add_tests = (tests_in) => { /*global*/ tests = tests.concat(tests_in)}

add_tests(bool_test);
add_tests(compound_and_array_tests);
add_tests(create_dataset);
add_tests(read_to_array);

async function run_test(test) {
    try {
        await test.test();
        console.log('✓', test.description);
    }
    catch (error) {
        console.log('x', test.description);
        console.log(error.stack);
    }
}

async function run_tests(tests) {
    for (let test of tests) {
        await run_test(test);
    }
}

await run_tests(tests);
