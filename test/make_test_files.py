import h5py
import numpy as np

with h5py.File("array.h5", "w") as f:
    array_type = h5py.h5t.array_create(h5py.h5t.py_create("<f8"), (2,2))
    sarray_type = h5py.h5t.array_create(h5py.h5t.py_create("S5"), (2,2))

    f.create_dataset("float_arr", (2,), dtype=array_type)
    f["float_arr"][:] = np.arange(8.0).reshape((2,2,2))

    f.create_dataset("string_arr", (2,), dtype=sarray_type)
    f["string_arr"][:] = np.array([b"hello", b"there"] * 2 * 2).reshape((2,2,2))

    f.create_dataset("compound", (2,), dtype=[("floaty", array_type), ("stringy",sarray_type)])
    f["compound"][:] = np.array([(f["float_arr"][0], f["string_arr"][0]), (f["float_arr"][1], f["string_arr"][1])], dtype=f["compound"].dtype)

    f.create_dataset("bool", data=[[False, True], [True, False]], shape=(2,2))
    f.create_dataset("bigint", data=np.arange(8).reshape(2,2,2), dtype="<i8", shape=(2,2,2))
    f["datatype/value"] = np.dtype("S10")
    f["datatype/value"].attrs["named_dtype_attr"] = "An attribute of a named datatype"

    f.create_dataset("bigendian", data=[3,2,1], dtype='>f4')
    f['bigendian'].attrs.create("bigendian_attr", [3,2,1], dtype='>i8')


with h5py.File("compressed.h5", "w") as f:
    data = np.random.random((100, 100))
    f.create_dataset("scaleoffset", data=data, scaleoffset=4)
    f.create_dataset("gzip", data=data, compression="gzip")
    f.create_dataset(
        "gzip_shuffle", data=data, compression="gzip", shuffle=True
    )
    f.create_dataset("szip", data=data, compression="szip", compression_opts=['nn',8]) #, compression_opts=("nn", 8))

with h5py.File("empty.h5", "w") as f:
    f.create_dataset("empty_dataset", data=h5py.Empty("f"))
    f.attrs["empty_attr"] = h5py.Empty("f")

with h5py.File("vlen.h5", "w") as f:
    vlen_scalar = f.create_dataset("int8_scalar", shape=(), dtype=h5py.vlen_dtype(np.int8))
    vlen_scalar[()] = [0, 1]

    vlen_array = f.create_dataset("float32_oneD", shape=(3,), dtype=h5py.vlen_dtype(np.float32))
    vlen_array[0] = [0]
    vlen_array[1] = [0, 1]
    vlen_array[2] = [0, 1, 2]

    # Multi-element 1D vlen-of-uint8: one variable-length byte "blob" per
    # element. Used to exercise *sliced* vlen reads, where the read buffer holds
    # only the selected `count` hvl_t structs but the reclaim must not walk the
    # full N-element dataspace (doing so frees garbage pointers past the buffer
    # end -> heap corruption). N is deliberately large so any over-walk lands
    # well past the buffer. Each element i is the blob [i, i+1, ..., 2i]
    # (length i+1) so sliced values are individually verifiable.
    N = 16
    uint8_blobs = f.create_dataset("uint8_blobs", shape=(N,), dtype=h5py.vlen_dtype(np.uint8))
    for i in range(N):
        uint8_blobs[i] = np.arange(i + 1, dtype=np.uint8) + np.uint8(i)

with h5py.File("complex.h5", "w") as f:
    # Native complex datasets (H5T_COMPLEX, class 11, new in HDF5 2.0). Passing
    # a native complex type as `dtype` is what selects it: h5py still maps a
    # plain numpy complex dtype to the legacy {r, i} compound by default. Both
    # component precisions and both byte orders, so that reading this file
    # checks h5wasm against the reference library rather than its own writer.
    #
    # Each array's byte order must match its file type. HDF5 2.0 has no
    # conversion path that byte-swaps a native complex, so handing native-endian
    # data to a big-endian dataset fails with "no appropriate function for
    # conversion path"; matching the orders means no conversion is needed.
    #
    # Every component is exactly representable in float32, so tests reading
    # this file can assert exact equality.
    cplx64 = np.array([1 + 2j, 3 - 4j, 5.5 + 6.25j], dtype=np.complex128)
    cplx32 = np.array([1.5 - 2.5j, 0.25 + 4j, -8 + 0.125j], dtype=np.complex64)

    for name, file_type, data in [
        ("z_f64le", h5py.h5t.COMPLEX_IEEE_F64LE, cplx64.astype("<c16")),
        ("z_f64be", h5py.h5t.COMPLEX_IEEE_F64BE, cplx64.astype(">c16")),
        ("z_f32le", h5py.h5t.COMPLEX_IEEE_F32LE, cplx32.astype("<c8")),
        ("z_f32be", h5py.h5t.COMPLEX_IEEE_F32BE, cplx32.astype(">c8")),
    ]:
        f.create_dataset(name, data=data, dtype=file_type)
