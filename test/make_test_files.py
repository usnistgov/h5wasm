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
