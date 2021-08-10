#!/bin/bash

cd wasm && bazel build //lib/hdf5 --cpu=wasm32;
cp -r bazel-bin/lib/hdf5/copy_hdf5_lib/hdf5_lib/ ..
