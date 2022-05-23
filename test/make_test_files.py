import h5py
import numpy as np

array_type = h5py.h5t.array_create(h5py.h5t.py_create('<f8'), (2,2))
sarray_type = h5py.h5t.array_create(h5py.h5t.py_create('S5'), (2,2))

f = h5py.File("array.h5", "w")

f.create_dataset("float_arr", (2,), dtype=array_type)
f["float_arr"][:] = np.arange(8.0).reshape((2,2,2))

f.create_dataset("string_arr", (2,), dtype=sarray_type)
f["string_arr"][:] = np.array([b"hello", b"there"] * 2 * 2).reshape((2,2,2))

f.create_dataset("compound", (2,), dtype=[('floaty', array_type), ('stringy',sarray_type)])
f['compound'][:] = np.array([(f['float_arr'][0], f['string_arr'][0]), (f['float_arr'][1], f['string_arr'][1])], dtype=f['compound'].dtype)

f.create_dataset("bool", data=[False, True, True, False], shape=(2,2))

f.create_dataset("bigint", data=np.arange(8).reshape(2,2,2), dtype="<i8", shape=(2,2,2))

f.close()
