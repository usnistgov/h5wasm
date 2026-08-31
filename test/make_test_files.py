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

with h5py.File("float16.h5", "w") as f:
    # IEEE half precision, as numpy/h5py write it. Every value here is exactly
    # representable in float16, so readers can compare without a tolerance:
    # 65504 is the largest finite half, 2**-14 the smallest normal, and 2**-24
    # the smallest subnormal.
    halves = np.array([[1.0, -2.5, 0.5], [65504.0, 2.0**-14, 2.0**-24]], dtype="<f2")
    f.create_dataset("half", data=halves)
    f.create_dataset("half_scalar", data=np.float16(0.125))
    f.create_dataset("bigendian_half", data=np.array([3.0, 2.0, 1.0], dtype=">f2"))
    f["half"].attrs.create("half_attr", np.array([1.5, -0.25], dtype="<f2"))
    # bfloat16 is also a 2-byte H5T_FLOAT, but with an 8-bit exponent and 7-bit
    # mantissa instead of 5 and 10. Reading it as an IEEE half would silently
    # give wrong numbers, so h5wasm must refuse it. numpy has no bfloat16 and
    # h5py exposes no predefined one, so build the type and write raw bits.
    bfloat16 = h5py.h5t.IEEE_F16LE.copy()
    bfloat16.set_fields(15, 7, 8, 0, 7)
    bfloat16.set_ebias(0x7F)
    # bfloat16 is the top 16 bits of the float32 with the same value
    bits = (np.array([1.0, 2.0, -1.0], dtype="<f4").view("<u4") >> 16).astype("<u2")
    space = h5py.h5s.create_simple(bits.shape)
    dset = h5py.h5d.create(f.id, b"bfloat16", bfloat16, space)
    dset.write(h5py.h5s.ALL, h5py.h5s.ALL, bits, mtype=bfloat16)
