#include <iostream>
#include <string>

#include "hdf5.h"
#include "hdf5_hl.h"
#include <emscripten/bind.h>
#include <emscripten.h>

#define ATTRIBUTE_DATA 0
#define DATASET_DATA 1
#define ENUM_DATA 2

using namespace emscripten;

EM_JS(void, throw_error, (const char *string_error), {
    throw(UTF8ToString(string_error));
});

// void throw_error(const char *string_error) {
//     throw std::runtime_error(string_error);
// }

// void throw_error(const char * string_error) {
//     // pass
// }

herr_t link_name_callback(hid_t loc_id, const char *name, const H5L_info_t *linfo, void *opdata)
{
    std::vector<std::string> *namelist = reinterpret_cast<std::vector<std::string> *>(opdata);
    (*namelist).push_back(name);
    return 0;
}

std::vector<std::string> get_keys_vector(hid_t group_id, H5_index_t index = H5_INDEX_NAME)
{
    //val output = val::array();
    std::vector<std::string> namelist;
    herr_t idx = H5Literate(group_id, index, H5_ITER_INC, NULL, link_name_callback, &namelist);
    return namelist;
}

val get_child_names(hid_t loc_id, const std::string& group_name_string)
{
    hid_t gcpl_id;
    unsigned crt_order_flags;
    size_t namesize;
    herr_t status;
    const char *group_name = group_name_string.c_str();

    hid_t grp = H5Gopen2(loc_id, group_name, H5P_DEFAULT);
    if (grp < 0)
    {
        throw_error("error - name not defined!");
        return val::null();
    }

    gcpl_id = H5Gget_create_plist(grp);
    status = H5Pget_link_creation_order(gcpl_id, &crt_order_flags);
    H5_index_t index = (crt_order_flags & H5P_CRT_ORDER_INDEXED) ? H5_INDEX_CRT_ORDER : H5_INDEX_NAME;

    std::vector<std::string> names_vector;
    herr_t idx = H5Literate(grp, index, H5_ITER_INC, NULL, link_name_callback, &names_vector);

    val names = val::array();
    size_t numObjs = names_vector.size();
    for (size_t i = 0; i < numObjs; i++)
    {
        names.set(i, names_vector.at(i));
    }

    H5Gclose(grp);
    H5Pclose(gcpl_id);
    return names;
}

val get_child_types(hid_t loc_id, const std::string& group_name_string)
{
    hid_t gcpl_id;
    unsigned crt_order_flags;
    size_t namesize;
    herr_t status;
    H5O_info_t oinfo;
    //const char * group_name = &group_name_string[0];
    const char *group_name = group_name_string.c_str();

    hid_t grp = H5Gopen2(loc_id, group_name, H5P_DEFAULT);
    if (grp < 0)
    {
        throw_error("error - name not defined!");
        return val::null();
    }

    val names = val::object();
    H5G_info_t grp_info;
    status = H5Gget_info(grp, &grp_info);
    hsize_t numObjs = grp_info.nlinks;

    gcpl_id = H5Gget_create_plist(grp);
    status = H5Pget_link_creation_order(gcpl_id, &crt_order_flags);
    H5_index_t index = (crt_order_flags & H5P_CRT_ORDER_INDEXED) ? H5_INDEX_CRT_ORDER : H5_INDEX_NAME;

    for (hsize_t i = 0; i < numObjs; i++)
    {
        namesize = H5Lget_name_by_idx(loc_id, group_name, index, H5_ITER_INC, i, nullptr, 0, H5P_DEFAULT);
        char *name = new char[namesize + 1];
        status = H5Lget_name_by_idx(loc_id, group_name, index, H5_ITER_INC, i, name, namesize + 1, H5P_DEFAULT);
        status = H5Oget_info_by_idx(loc_id, group_name, index, H5_ITER_INC, i, &oinfo, H5O_INFO_BASIC, H5P_DEFAULT);
        names.set(val(std::string(name)), (int)oinfo.type);
        delete[] name;
    }
    status = H5Gclose(grp);
    status = H5Pclose(gcpl_id);
    return names;
}

int get_type(hid_t loc_id, const std::string& obj_name_string)
{
    // H5O_info2_t oinfo;
    H5G_stat_t ginfo;
    int obj_type = -1; // default: if not name exists
    const char *obj_name = obj_name_string.c_str();
    htri_t exists = H5LTpath_valid(loc_id, obj_name, true);
    if (exists) {
        herr_t status = H5Gget_objinfo(loc_id, obj_name, true, &ginfo);
        // herr_t status = H5Oget_info_by_name(loc_id, obj_name, &oinfo, H5O_INFO_BASIC, H5P_DEFAULT);
        obj_type = (int)ginfo.type;
    }
    else {
        // check if the path exists but doesn't resolve to an object
        htri_t link_exists = H5LTpath_valid(loc_id, obj_name, false);
        if (link_exists) {
            herr_t status = H5Gget_objinfo(loc_id, obj_name, false, &ginfo);
            obj_type = (int)ginfo.type;
        }
    }
    return obj_type;
}

val get_symbolic_link(hid_t loc_id, const std::string& obj_name_string)
{
    H5L_info2_t linfo;
    const char *obj_name = obj_name_string.c_str();
    htri_t exists = H5LTpath_valid(loc_id, obj_name, false);
    herr_t status = H5Lget_info2(loc_id, obj_name, &linfo, H5P_DEFAULT);
    if (exists && linfo.type == H5L_TYPE_SOFT) {
        size_t linksize = linfo.u.val_size;
        char * targbuf = (char *)malloc(linksize + 1);
        status = H5Lget_val(loc_id, obj_name, targbuf, linksize, H5P_DEFAULT);
        val output = val(std::string(targbuf));
        free(targbuf);
        return output;
    }
    else {
        return val::null();
    }
}

val get_external_link(hid_t loc_id, const std::string& obj_name_string)
{
    H5L_info2_t linfo;
    const char *obj_name = obj_name_string.c_str();
    htri_t exists = H5LTpath_valid(loc_id, obj_name, false);
    herr_t status = H5Lget_info2(loc_id, obj_name, &linfo, H5P_DEFAULT);
    val output = val::object();
    if (exists && linfo.type == H5L_TYPE_EXTERNAL) {
        size_t linksize = linfo.u.val_size;
        char *targbuf = NULL;
        const char *filename = NULL;
        const char *external_obj_path = NULL;

        targbuf = (char*)malloc(linksize + 1);
        unsigned int flags = 0;

        status = H5Lget_val(loc_id, obj_name, targbuf, linksize, H5P_DEFAULT);
        status = H5Lunpack_elink_val(targbuf, linksize, NULL, &filename, &external_obj_path);
        output.set("filename", std::string(filename));
        output.set("obj_path", std::string(external_obj_path));
        free(targbuf);
    }
    return output;
}

herr_t attribute_name_callback(hid_t loc_id, const char *name, const H5A_info_t *ainfo, void *opdata)
{
    std::vector<std::string> *namelist = reinterpret_cast<std::vector<std::string> *>(opdata);
    (*namelist).push_back(name);
    return 0;
}

val get_attribute_names(hid_t loc_id, const std::string& obj_name_string)
{
    hid_t ocpl_id;
    unsigned crt_order_flags;
    size_t namesize;
    herr_t status;
    //H5A_info_t * ainfo;
    //H5T_cset_t cset;
    const char *obj_name = obj_name_string.c_str();

    hid_t obj_id = H5Oopen(loc_id, obj_name, H5P_DEFAULT);
    if (obj_id < 0)
    {
        throw_error("error - name not defined!");
        return val::null();
    }

    H5O_info_t oinfo;
    status = H5Oget_info(obj_id, &oinfo, H5O_INFO_BASIC | H5O_INFO_NUM_ATTRS);
    hsize_t numAttrs = oinfo.num_attrs;
    H5O_type_t obj_type = oinfo.type;

    if (obj_type == H5O_TYPE_GROUP)
    {
        ocpl_id = H5Gget_create_plist(obj_id);
    }
    else
    {
        ocpl_id = H5Dget_create_plist(obj_id);
    }

    status = H5Pget_attr_creation_order(ocpl_id, &crt_order_flags);
    H5_index_t index = (crt_order_flags & H5P_CRT_ORDER_INDEXED) ? H5_INDEX_CRT_ORDER : H5_INDEX_NAME;

    std::vector<std::string> names_vector;
    herr_t idx = H5Aiterate(obj_id, index, H5_ITER_INC, 0, attribute_name_callback, &names_vector);

    val names = val::array();
    size_t numObjs = names_vector.size();
    for (size_t i = 0; i < numObjs; i++)
    {
        names.set(i, names_vector.at(i));
    }

    status = H5Oclose(obj_id);
    status = H5Pclose(ocpl_id);
    return names;
}

val get_dtype_metadata(hid_t dtype)
{

    val attr = val::object();

    attr.set("signed", (bool)(H5Tget_sign(dtype) > 0));

    size_t size = H5Tget_size(dtype);
    H5T_class_t dtype_class = H5Tget_class(dtype);
    attr.set("type", (int)dtype_class);

    H5T_order_t order = H5Tget_order(dtype);
    H5T_sign_t is_signed = H5T_SGN_2;

    if (dtype_class == H5T_STRING)
    {
        attr.set("cset", (int)(H5Tget_cset(dtype)));
    }
    else
    {
        attr.set("cset", -1);
    }

    if (dtype_class == H5T_COMPOUND)
    {
        val compound_type = val::object();
        val members = val::array();
        int nmembers = H5Tget_nmembers(dtype);
        compound_type.set("nmembers", nmembers);
        for (unsigned n = 0; n < nmembers; n++)
        {
            hid_t member_dtype = H5Tget_member_type(dtype, n);
            val member = get_dtype_metadata(member_dtype);
            H5Tclose(member_dtype);
            char *member_name = H5Tget_member_name(dtype, n);
            member.set("name", std::string(member_name));
            H5free_memory(member_name);
            size_t member_offset = H5Tget_member_offset(dtype, n);
            member.set("offset", (int)member_offset);
            member.set("shape", val::array());
            members.set(n, member);
        }
        compound_type.set("members", members);
        attr.set("compound_type", compound_type);
    }
    else if (dtype_class == H5T_ARRAY) {
        hid_t base_dtype = H5Tget_super(dtype);
        val array_type = get_dtype_metadata(base_dtype);
        H5Tclose(base_dtype);
        val array_dims_out = val::array();
        int ndims = H5Tget_array_ndims(dtype);
        std::vector<hsize_t> array_dims(ndims);
        H5Tget_array_dims2(dtype, &array_dims[0]);
        int total_size = 1;
        for (int i=0; i<ndims; i++) {
            array_dims_out.set(i, (int)array_dims[i]);
            total_size *= (int)array_dims[i];
        }
        array_type.set("shape", array_dims_out);
        array_type.set("total_size", total_size);
        attr.set("array_type", array_type);
    }
    else if (dtype_class == H5T_ENUM) {
        val enum_type = val::object();
        val members = val::object();
        hid_t base_dtype = H5Tget_super(dtype);
        H5T_class_t base_dtype_class = H5Tget_class(base_dtype);
        enum_type.set("type", (int)base_dtype_class);
        int nmembers = H5Tget_nmembers(dtype);
        enum_type.set("nmembers", nmembers);
        for (unsigned n = 0; n < nmembers; n++)
        {
            char *member_name = H5Tget_member_name(dtype, n);
            int64_t member_value;
            herr_t status = H5Tget_member_value(dtype, n, &member_value);
            H5Tconvert(base_dtype, H5T_NATIVE_INT, 1, &member_value, NULL, H5P_DEFAULT);
            members.set(std::string(member_name), (int)member_value);
            H5free_memory(member_name);
        }
        H5Tclose(base_dtype);
        enum_type.set("members", members);
        attr.set("enum_type", enum_type);
    }

    bool littleEndian = (order == H5T_ORDER_LE);
    attr.set("vlen", (bool)H5Tis_variable_str(dtype));
    attr.set("littleEndian", littleEndian);
    attr.set("size", size);

    return attr;
}

val get_abstractDS_metadata(hid_t dspace, hid_t dtype)
{
    val attr = get_dtype_metadata(dtype);

    int rank = H5Sget_simple_extent_ndims(dspace);
    int total_size = H5Sget_simple_extent_npoints(dspace);
    hsize_t dims_out[rank];
    int ndims = H5Sget_simple_extent_dims(dspace, dims_out, nullptr);
    val shape = val::array();
    for (int d = 0; d < ndims; d++)
    {
        shape.set(d, (uint)dims_out[d]);
    }

    attr.set("shape", shape);
    attr.set("total_size", total_size);

    return attr;
}

val get_attribute_metadata(hid_t loc_id, const std::string& group_name_string, const std::string& attribute_name_string)
{
    hid_t attr_id;
    hid_t dspace;
    hid_t dtype;
    herr_t status;
    const char *group_name = group_name_string.c_str();
    const char *attribute_name = attribute_name_string.c_str();

    htri_t exists = H5Aexists_by_name(loc_id, group_name, attribute_name, H5P_DEFAULT);
    if (exists < 1)
    {
        throw_error("error - name not defined!");
        return val::null();
    }
    attr_id = H5Aopen_by_name(loc_id, group_name, attribute_name, H5P_DEFAULT, H5P_DEFAULT);
    dtype = H5Aget_type(attr_id);
    dspace = H5Aget_space(attr_id);
    val metadata = get_abstractDS_metadata(dspace, dtype);

    H5Aclose(attr_id);
    H5Sclose(dspace);
    H5Tclose(dtype);
    return metadata;
}

int refresh_dataset(hid_t loc_id, const std::string& dataset_name_string)
{
    hid_t ds_id;
    herr_t status;
    const char *dataset_name = dataset_name_string.c_str();

    ds_id = H5Dopen2(loc_id, dataset_name, H5P_DEFAULT);
    if (ds_id < 0)
    {
        throw_error("error - name not defined!");
        return -1;
    }
    status = H5Drefresh(ds_id);
    return (int)status;
}

val get_dataset_metadata(hid_t loc_id, const std::string& dataset_name_string)
{
    hid_t ds_id;
    hid_t dspace;
    hid_t dtype;
    herr_t status;
    const char *dataset_name = dataset_name_string.c_str();

    ds_id = H5Dopen2(loc_id, dataset_name, H5P_DEFAULT);
    if (ds_id < 0)
    {
        throw_error("error - name not defined!");
        return val::null();
    }
    dtype = H5Dget_type(ds_id);
    dspace = H5Dget_space(ds_id);
    val metadata = get_abstractDS_metadata(dspace, dtype);

    H5Dclose(ds_id);
    H5Sclose(dspace);
    H5Tclose(dtype);
    return metadata;
}

int get_dataset_data(hid_t loc_id, const std::string& dataset_name_string, val count_out, val offset_out, uint64_t rdata_uint64)
{
    hid_t ds_id;
    hid_t dspace;
    hid_t dtype;
    hid_t memspace;
    herr_t status;
    const char *dataset_name = dataset_name_string.c_str();
    void *rdata = (void *)rdata_uint64;

    ds_id = H5Dopen2(loc_id, dataset_name, H5P_DEFAULT);
    if (ds_id < 0)
    {
        throw_error("error - name not defined!");
        return -1;
    }
    dspace = H5Dget_space(ds_id);
    if (count_out != val::null() && offset_out != val::null())
    {
        std::vector<hsize_t> count = vecFromJSArray<hsize_t>(count_out);
        std::vector<hsize_t> offset = vecFromJSArray<hsize_t>(offset_out);
        memspace = H5Screate_simple(count.size(), &count[0], nullptr);
        status = H5Sselect_hyperslab(dspace, H5S_SELECT_SET, &offset[0], NULL, &count[0], NULL);
        status = H5Sselect_all(memspace);
    }
    else
    {
        status = H5Sselect_all(dspace);
        memspace = H5Scopy(dspace);
    }

    dtype = H5Dget_type(ds_id);

    status = H5Dread(ds_id, dtype, memspace, dspace, H5P_DEFAULT, rdata);
    
    H5Dclose(ds_id);
    H5Sclose(dspace);
    H5Sclose(memspace);
    H5Tclose(dtype);
    return (int)status;
}

int reclaim_vlen_memory(hid_t loc_id, const std::string& object_name_string, const std::string& attribute_name_string, uint64_t rdata_uint64)
{
    hid_t ds_id;
    hid_t attr_id;
    hid_t dspace;
    hid_t dtype;
    herr_t status;
    const char *object_name = object_name_string.c_str();
    const char *attribute_name = attribute_name_string.c_str();
    void *rdata = (void *)rdata_uint64;

    if (attribute_name_string == "") {
        // then it's a dataset!
        ds_id = H5Dopen2(loc_id, object_name, H5P_DEFAULT);
        dspace = H5Dget_space(ds_id);
        dtype = H5Dget_type(ds_id);
        H5Dclose(ds_id);
    }
    else {
        attr_id = H5Aopen_by_name(loc_id, object_name, attribute_name, H5P_DEFAULT, H5P_DEFAULT);
        dtype = H5Aget_type(attr_id);
        dspace = H5Aget_space(attr_id);
        H5Aclose(attr_id);
    }

    status = H5Treclaim(dtype, dspace, H5P_DEFAULT, rdata);

    H5Sclose(dspace);
    H5Tclose(dtype);
    return (int)status;
}

int get_attribute_data(hid_t loc_id, const std::string& group_name_string, const std::string& attribute_name_string, uint64_t rdata_uint64)
{
    hid_t attr_id;
    hid_t dspace;
    hid_t dtype;
    herr_t status;
    const char *group_name = &group_name_string[0];
    const char *attribute_name = &attribute_name_string[0];
    void *rdata = (void *)rdata_uint64;

    htri_t exists = H5Aexists_by_name(loc_id, group_name, attribute_name, H5P_DEFAULT);
    if (exists < 1)
    {
        throw_error("error - name not defined!");
        return -1;
    }
    attr_id = H5Aopen_by_name(loc_id, group_name, attribute_name, H5P_DEFAULT, H5P_DEFAULT);
    dtype = H5Aget_type(attr_id);
    dspace = H5Aget_space(attr_id);

    status = H5Sselect_all(dspace);
    status = H5Aread(attr_id, dtype, rdata);

    H5Aclose(attr_id);
    H5Sclose(dspace);
    H5Tclose(dtype);
    return (int)status;
}

int create_group(hid_t loc_id, std::string grp_name_string)
{
    hid_t grp_id = H5Gcreate2(loc_id, grp_name_string.c_str(), H5P_DEFAULT, H5P_DEFAULT, H5P_DEFAULT);
    herr_t status = H5Gclose(grp_id);
    return (int)status;
}

herr_t setup_dataset(val dims_in, int dtype, int dsize, bool is_signed, bool is_vlstr, hid_t *filetype, hid_t *space)
{
    herr_t status;

    std::vector<hsize_t> dims_vec = vecFromJSArray<hsize_t>(dims_in);
    int ndims = dims_vec.size();
    hsize_t *dims = dims_vec.data();
    /*
    * Create dataspace.  Setting maximum size to NULL sets the maximum
    * size to be the current size.
    */
    *space = H5Screate_simple(ndims, dims, NULL);

    if (dtype == H5T_STRING)
    {
        size_t str_size = (is_vlstr) ? H5T_VARIABLE : dsize;

        *filetype = H5Tcopy(H5T_FORTRAN_S1);
        // assume that dsize for strings is non-null-padded
        status = H5Tset_size(*filetype, str_size);
        status = H5Tset_cset(*filetype, H5T_CSET_UTF8);
    }
    else if (dtype == H5T_INTEGER)
    {
        *filetype = H5Tcopy(H5T_NATIVE_INT);
        status = H5Tset_size(*filetype, dsize);
        status = H5Tset_sign(*filetype, (H5T_sign_t)is_signed);
    }
    else if (dtype == H5T_FLOAT)
    {
        if (dsize == 4) {
            *filetype = H5Tcopy(H5T_NATIVE_FLOAT);
        }
        else if (dsize == 8) {
            *filetype = H5Tcopy(H5T_NATIVE_DOUBLE);
        }
        else {
            throw_error("data type not supported");
        }
    }
    else
    {
        throw_error("data type not supported");
    }
    return status;
}

int create_attribute(hid_t loc_id, std::string obj_name_string, std::string attr_name_string, uint64_t wdata_uint64, val dims_in, int dtype, int dsize, bool is_signed, bool is_vlstr)
{
    hid_t filetype, space, dset, attr, obj_id;
    herr_t status;
    // data is pointer to raw bytes
    void *wdata = (void *)wdata_uint64;

    const char *attr_name = attr_name_string.c_str();

    // std::vector<hsize_t> dims_vec = vecFromJSArray<hsize_t>(dims_in);
    // int ndims = dims_vec.size();
    // hsize_t *dims = dims_vec.data();
    // /*
    // * Create dataspace.  Setting maximum size to NULL sets the maximum
    // * size to be the current size.
    // */
    // space = H5Screate_simple(ndims, dims, NULL);

    // if (dtype == H5T_STRING)
    // {
    //     size_t str_size = (is_vlstr) ? H5T_VARIABLE : dsize;

    //     filetype = H5Tcopy(H5T_FORTRAN_S1);
    //     // assume that dsize for strings is non-null-padded
    //     status = H5Tset_size(filetype, str_size);
    //     status = H5Tset_cset(filetype, H5T_CSET_UTF8);
    // }
    // else if (dtype == H5T_INTEGER)
    // {
    //     filetype = H5Tcopy(H5T_NATIVE_INT);
    //     status = H5Tset_size(filetype, dsize);
    //     status = H5Tset_sign(filetype, (H5T_sign_t)is_signed);
    //     //memtype = H5Tcopy(filetype);
    // }
    // else if (dtype == H5T_FLOAT)
    // {
    //     filetype = H5Tcopy(H5T_NATIVE_FLOAT);
    //     status = H5Tset_size(filetype, dsize);
    //     //memtype = H5Tcopy(filetype);
    // }
    // else
    // {
    //     throw_error("data type not supported");
    // }

    status = setup_dataset(dims_in, dtype, dsize, is_signed, is_vlstr, &filetype, &space);
    /*
    * Create the attribute and write the data to it.
    */
    obj_id = H5Oopen(loc_id, obj_name_string.c_str(), H5P_DEFAULT);
    attr = H5Acreate(obj_id, attr_name, filetype, space, H5P_DEFAULT,
                     H5P_DEFAULT);
    status = H5Awrite(attr, filetype, wdata);
    if (is_vlstr) {
        status = H5Treclaim(filetype, space, H5P_DEFAULT, wdata);
    }
    /*
    * Close and release resources.
    */
    status = H5Aclose(attr);

    status = H5Sclose(space);
    status = H5Tclose(filetype);
    //status = H5Tclose(memtype);
    status = H5Oclose(obj_id);
    return (int)status;
}

int create_vlen_str_attribute(hid_t loc_id, std::string obj_name_string, std::string attr_name_string, val data, val dims_in, int dtype, int dsize, bool is_signed, bool is_vlstr)
{
    uint64_t wdata_uint64; // ptr as uint64_t (webassembly will be 64-bit someday)

    std::vector<std::string> data_string_vec = vecFromJSArray<std::string>(data);
    std::vector<const char *> data_char_vec;
    data_char_vec.reserve(data_string_vec.size());

    // // alternative initialization of wdata, with "new const char *":
    // const char ** wdata = new const char * [data_string_vec.size()];
    // for (hsize_t i=0; i<data_string_vec.size(); i++) {
    //     wdata.push_back(data_string_vec.at(i).c_str());
    //     wdata[i] = data_string_vec.at(i).c_str();
    // }
    // // followed by "delete [] (wdata);" at the end of the block

    for (hsize_t i = 0; i < data_string_vec.size(); i++)
    {
        data_char_vec.push_back(data_string_vec.at(i).c_str());
    }

    // pass the pointer as an int...
    wdata_uint64 = (uint64_t)data_char_vec.data();
    return create_attribute(loc_id, obj_name_string, attr_name_string, wdata_uint64, dims_in, dtype, dsize, is_signed, is_vlstr);
}

int create_dataset(hid_t loc_id, std::string dset_name_string, uint64_t wdata_uint64, val dims_in, int dtype, int dsize, bool is_signed, bool is_vlstr)
{
    hid_t filetype, space, dset;
    herr_t status;
    // data is pointer to raw bytes
    void *wdata = (void *)wdata_uint64;
    const char *dset_name = dset_name_string.c_str();

    status = setup_dataset(dims_in, dtype, dsize, is_signed, is_vlstr, &filetype, &space);
    dset = H5Dcreate2(loc_id, dset_name, filetype, space, H5P_DEFAULT, H5P_DEFAULT, H5P_DEFAULT);
    status = H5Dwrite(dset, filetype, space, space, H5P_DEFAULT, wdata);
    if (is_vlstr) {
        status = H5Treclaim(filetype, space, H5P_DEFAULT, wdata);
    }
    status = H5Dclose(dset);
    status = H5Sclose(space);
    status = H5Tclose(filetype);
    return (int)status;
}

int create_vlen_str_dataset(hid_t loc_id, std::string dset_name_string, val data, val dims_in, int dtype, int dsize, bool is_signed, bool is_vlstr) {
    uint64_t wdata_uint64; // ptr as uint64_t (webassembly will be 64-bit someday)
    
    std::vector<std::string> data_string_vec = vecFromJSArray<std::string>(data);
    std::vector<const char *> data_char_vec;
    data_char_vec.reserve(data_string_vec.size());
    for (hsize_t i = 0; i < data_string_vec.size(); i++)
    {
        data_char_vec.push_back(data_string_vec.at(i).c_str());
    }
    // pass the pointer as an int...
    wdata_uint64 = (uint64_t)data_char_vec.data();
    return create_dataset(loc_id, dset_name_string, wdata_uint64, dims_in, dtype, dsize, is_signed, is_vlstr);
}

int flush(hid_t file_id) {
    herr_t status = H5Fflush(file_id, H5F_SCOPE_GLOBAL);
    return (int)status;
}

EMSCRIPTEN_BINDINGS(hdf5)
{
    function("get_keys", &get_keys_vector);
    function("get_names", &get_child_names);
    function("get_types", &get_child_types);
    function("get_symbolic_link", &get_symbolic_link);
    function("get_external_link", &get_external_link);
    function("get_type", &get_type);
    function("get_attribute_names", &get_attribute_names);
    function("get_attribute_metadata", &get_attribute_metadata);
    function("get_dataset_metadata", &get_dataset_metadata);
    function("refresh_dataset", &refresh_dataset);
    function("get_dataset_data", &get_dataset_data);
    function("get_attribute_data", &get_attribute_data);
    function("reclaim_vlen_memory", &reclaim_vlen_memory);
    function("create_group", &create_group);
    function("create_dataset", &create_dataset);
    function("create_attribute", &create_attribute, allow_raw_pointers());
    function("create_vlen_str_attribute", &create_vlen_str_attribute);
    function("create_vlen_str_dataset", &create_vlen_str_dataset);
    function("flush", &flush);

    class_<H5L_info2_t>("H5L_info2_t")
        .constructor<>()
        .property("type", &H5L_info2_t::type)
        .property("corder_valid", &H5L_info2_t::corder_valid)
        .property("corder", &H5L_info2_t::corder)
        .property("cset", &H5L_info2_t::cset)
        .property("u", &H5L_info2_t::u);
    enum_<H5L_type_t>("H5L_type_t")
        .value("H5L_TYPE_ERROR", H5L_type_t::H5L_TYPE_ERROR)
        .value("H5L_TYPE_HARD", H5L_type_t::H5L_TYPE_HARD)
        .value("H5L_TYPE_SOFT", H5L_type_t::H5L_TYPE_SOFT)
        .value("H5L_TYPE_EXTERNAL", H5L_type_t::H5L_TYPE_EXTERNAL)
        .value("H5L_TYPE_MAX", H5L_type_t::H5L_TYPE_MAX);
    enum_<H5T_class_t>("H5T_class_t")
        .value("H5T_NO_CLASS", H5T_NO_CLASS)   // = -1 /**< error                                   */
        .value("H5T_INTEGER", H5T_INTEGER)     //   = 0,  /**< integer types                           */
        .value("H5T_FLOAT", H5T_FLOAT)         //     = 1,  /**< floating-point types                    */
        .value("H5T_TIME", H5T_TIME)           //      = 2,  /**< date and time types                     */
        .value("H5T_STRING", H5T_STRING)       //    = 3,  /**< character string types                  */
        .value("H5T_BITFIELD", H5T_BITFIELD)   //  = 4,  /**< bit field types                         */
        .value("H5T_OPAQUE", H5T_OPAQUE)       //    = 5,  /**< opaque types                            */
        .value("H5T_COMPOUND", H5T_COMPOUND)   //  = 6,  /**< compound types                          */
        .value("H5T_REFERENCE", H5T_REFERENCE) // = 7,  /**< reference types                         */
        .value("H5T_ENUM", H5T_ENUM)           //      = 8,  /**< enumeration types                       */
        .value("H5T_VLEN", H5T_VLEN)           //      = 9,  /**< variable-Length types                   */
        .value("H5T_ARRAY", H5T_ARRAY)         //     = 10, /**< array types                             */
        ;

    //constant("H5L_type_t", H5L_type_t);
    // FILE ACCESS
    constant("H5F_ACC_RDONLY", H5F_ACC_RDONLY);
    constant("H5F_ACC_RDWR", H5F_ACC_RDWR);
    constant("H5F_ACC_TRUNC", H5F_ACC_TRUNC);
    constant("H5F_ACC_EXCL", H5F_ACC_EXCL);
    constant("H5F_ACC_CREAT", H5F_ACC_CREAT);
    constant("H5F_ACC_SWMR_WRITE", H5F_ACC_SWMR_WRITE);
    constant("H5F_ACC_SWMR_READ", H5F_ACC_SWMR_READ);

    constant("H5G_GROUP", (int)H5G_GROUP);     //    0    Object is a group.
    constant("H5G_DATASET", (int)H5G_DATASET); //    1    Object is a dataset.
    constant("H5G_TYPE", (int)H5G_TYPE);       //    2    Object is a named datatype.
    constant("H5G_LINK", (int)H5G_LINK);       //    3    Object is a symbolic link.
    constant("H5G_UDLINK", (int)H5G_UDLINK);   //    4    Object is a user-defined link.

    constant("H5P_DEFAULT", H5P_DEFAULT);
    constant("H5O_TYPE_GROUP", (int)H5O_TYPE_GROUP);
    constant("H5O_TYPE_DATASET", (int)H5O_TYPE_DATASET);
    constant("H5O_TYPE_NAMED_DATATYPE", (int)H5O_TYPE_NAMED_DATATYPE);

    register_vector<std::string>("vector<string>");
}

