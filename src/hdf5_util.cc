#include <iostream>
#include <string>

#include "hdf5.h"
#include <emscripten/bind.h>
#include <emscripten.h>

#define ATTRIBUTE_DATA 0
#define DATASET_DATA 1
#define ENUM_DATA 2

using namespace emscripten;

// EM_JS(void, throw_error, (const char *string_error), {
//     throw(UTF8ToString(string_error));
// });

void throw_error(const char *string_error) {
    throw std::runtime_error(string_error);
}

// void throw_error(const char * string_error) {
//     // pass
// }

herr_t name_callback(hid_t loc_id, const char *name, const H5L_info_t *linfo, void *opdata)
{
    std::vector<std::string> *namelist = reinterpret_cast<std::vector<std::string> *>(opdata);
    (*namelist).push_back(name);
    return 0;
}

std::vector<std::string> get_keys_vector(hid_t group_id)
{
    //val output = val::array();
    std::vector<std::string> namelist;
    herr_t idx = H5Literate(group_id, H5_INDEX_NAME, H5_ITER_INC, NULL, name_callback, &namelist);
    return namelist;
}

val get_child_names(hid_t loc_id, std::string group_name)
{
    hid_t gcpl_id;
    unsigned crt_order_flags;
    size_t namesize;
    herr_t status;

    hid_t grp = H5Gopen2(loc_id, group_name.c_str(), H5P_DEFAULT);
    if (grp < 0)
    {
        throw_error("error - name not defined!");
        return val::null();
    }

    val names = val::array();
    H5G_info_t grp_info;
    status = H5Gget_info(grp, &grp_info);
    hsize_t numObjs = grp_info.nlinks;

    gcpl_id = H5Gget_create_plist(grp);
    status = H5Pget_link_creation_order(gcpl_id, &crt_order_flags);
    H5_index_t index = (crt_order_flags & H5P_CRT_ORDER_INDEXED) ? H5_INDEX_CRT_ORDER : H5_INDEX_NAME;

    for (hsize_t i = 0; i < numObjs; i++)
    {
        namesize = H5Lget_name_by_idx(loc_id, group_name.c_str(), index, H5_ITER_INC, i, nullptr, namesize, H5P_DEFAULT);
        char *name = new char[namesize + 1];
        H5Lget_name_by_idx(loc_id, group_name.c_str(), H5_INDEX_NAME, H5_ITER_INC, i, name, namesize + 1, H5P_DEFAULT);
        names.set(i, std::string(name));
        delete[] name;
    }
    H5Gclose(grp);
    return names;
}

val get_child_types(hid_t loc_id, const std::string group_name_string)
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
    return names;
}

val get_type(hid_t loc_id, const std::string obj_name_string)
{
    H5O_info_t oinfo;
    const char * obj_name = obj_name_string.c_str();
    herr_t status = H5Oget_info_by_name(loc_id, obj_name, &oinfo, H5O_INFO_BASIC, H5P_DEFAULT);
    return val((int)oinfo.type);
}

val get_attribute_names(hid_t loc_id, const std::string obj_name_string)
{
    hid_t gcpl_id;
    unsigned crt_order_flags;
    size_t namesize;
    herr_t status;
    //H5A_info_t * ainfo;
    //H5T_cset_t cset;
    const char *obj_name = obj_name_string.c_str();

    val names = val::array();
    hid_t obj_id = H5Oopen(loc_id, obj_name, H5P_DEFAULT);
    if (obj_id < 0)
    {
        throw_error("error - name not defined!");
        return val::null();
    }

    H5O_info_t oinfo;
    status = H5Oget_info(obj_id, &oinfo, H5O_INFO_NUM_ATTRS);
    hsize_t numAttrs = oinfo.num_attrs;

    gcpl_id = H5Gget_create_plist(obj_id);
    status = H5Pget_attr_creation_order(gcpl_id, &crt_order_flags);
    H5_index_t index = (crt_order_flags & H5P_CRT_ORDER_INDEXED) ? H5_INDEX_CRT_ORDER : H5_INDEX_NAME;

    for (hsize_t i = 0; i < numAttrs; i++)
    {
        //status = H5Aget_info_by_idx(loc_id, group_name.c_str(), index, H5_ITER_INC, i, ainfo, H5P_DEFAULT);
        //cset = ainfo->cset;
        namesize = H5Aget_name_by_idx(obj_id, ".", index, H5_ITER_INC, i, NULL, 0, H5P_DEFAULT);
        char *name = new char[namesize + 1];
        namesize = H5Aget_name_by_idx(obj_id, ".", index, H5_ITER_INC, i, name, namesize + 1, H5P_DEFAULT);
        names.set(i, std::string(name));
        delete[] name;
    }
    status = H5Oclose(obj_id);
    return names;
}

val get_dtype_metadata(hid_t dtype)
{

    val attr = val::object();

    attr.set("signed", (bool)(H5Tget_sign(dtype) > 0));

    size_t size = H5Tget_size(dtype);
    H5T_class_t dtype_class = H5Tget_class(dtype);
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
            char *member_name = H5Tget_member_name(dtype, n);
            member.set("name", std::string(member_name));
            H5free_memory(member_name);
            size_t member_offset = H5Tget_member_offset(dtype, n);
            member.set("offset", (int)member_offset);
            members.set(n, member);
        }
        compound_type.set("members", members);
        attr.set("compound_type", compound_type);
    }

    bool littleEndian = (order == H5T_ORDER_LE);
    attr.set("vlen", (bool)H5Tis_variable_str(dtype));
    attr.set("littleEndian", littleEndian);
    attr.set("type", (int)dtype_class);
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

val get_attribute_metadata(hid_t loc_id, const std::string group_name_string, const std::string attribute_name_string)
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

val get_dataset_metadata(hid_t loc_id, const std::string dataset_name_string)
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

val get_dataset_data(hid_t loc_id, const std::string dataset_name_string, val count_out = val::null(), val offset_out = val::null())
{
    hid_t ds_id;
    hid_t dspace;
    hid_t dtype;
    hid_t memspace;
    herr_t status;
    const char *dataset_name = dataset_name_string.c_str();

    ds_id = H5Dopen2(loc_id, dataset_name, H5P_DEFAULT);
    if (ds_id < 0)
    {
        throw_error("error - name not defined!");
        return val::null();
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
    int total_size = H5Sget_simple_extent_npoints(memspace);
    size_t size = H5Tget_size(dtype);

    thread_local const val Uint8Array = val::global("Uint8Array");
    uint8_t *buffer = (uint8_t *)malloc(size * total_size);

    status = H5Dread(ds_id, dtype, memspace, dspace, H5P_DEFAULT, buffer);
    val output = Uint8Array.new_(typed_memory_view(
        total_size * size, buffer));

    free(buffer);

    H5Dclose(ds_id);
    H5Sclose(dspace);
    H5Sclose(memspace);
    H5Tclose(dtype);
    return output;
}

val get_attribute_data(hid_t loc_id, const std::string group_name_string, const std::string attribute_name_string)
{
    hid_t attr_id;
    hid_t dspace;
    hid_t dtype;
    herr_t status;
    const char *group_name = &group_name_string[0];
    const char *attribute_name = &attribute_name_string[0];

    htri_t exists = H5Aexists_by_name(loc_id, group_name, attribute_name, H5P_DEFAULT);
    if (exists < 1)
    {
        throw_error("error - name not defined!");
        return val::null();
    }
    attr_id = H5Aopen_by_name(loc_id, group_name, attribute_name, H5P_DEFAULT, H5P_DEFAULT);
    dtype = H5Aget_type(attr_id);
    dspace = H5Aget_space(attr_id);

    int total_size = H5Sget_simple_extent_npoints(dspace);
    //std::cout << H5Sget_simple_extent_ndims(dspace) << std::endl;
    size_t size = H5Tget_size(dtype);
    htri_t is_vlstr = H5Tis_variable_str(dtype);

    thread_local const val Uint8Array = val::global("Uint8Array");

    void * buffer = malloc(size * total_size);
    status = H5Aread(attr_id, dtype, buffer);
    val output = val::null();

    if (is_vlstr) {
        output = val::array();
        char * bp = (char *) buffer;
        char * onestring = NULL;
        for (int i=0; i<total_size; i++) {
            onestring = *(char **)((void *)bp);
            output.set(i, val(std::string(onestring)));
            bp += size;
        }
        if (onestring)
            free(onestring);
    }
    else {
        output = Uint8Array.new_(typed_memory_view(
            total_size * size, (uint8_t *)buffer));
    }

    if (buffer) {
        if (is_vlstr)
            H5Treclaim(dtype, dspace, H5P_DEFAULT, buffer);
        free(buffer);
    }            

    free(buffer);

    H5Aclose(attr_id);
    H5Sclose(dspace);
    H5Tclose(dtype);
    return output;
}

EMSCRIPTEN_BINDINGS(hdf5)
{
    function("get_keys", &get_keys_vector);
    function("get_names", &get_child_names);
    function("get_types", &get_child_types);
    function("get_type", &get_type);
    function("get_attribute_names", &get_attribute_names);
    function("get_attribute_metadata", &get_attribute_metadata);
    function("get_dataset_metadata", &get_dataset_metadata);
    function("get_dataset_data", &get_dataset_data);
    function("get_attribute_data", &get_attribute_data);

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

    constant("H5G_GROUP", H5G_GROUP);     //	0	Object is a group.
    constant("H5G_DATASET", H5G_DATASET); //    	1   	Object is a dataset.
    constant("H5G_TYPE", H5G_TYPE);       //	2	Object is a named datatype.
    constant("H5G_LINK", H5G_LINK);       //	3	Object is a symbolic link.
    constant("H5G_UDLINK", H5G_UDLINK);   //	4	Object is a user-defined link.

    constant("H5P_DEFAULT", H5P_DEFAULT);
    constant("H5O_TYPE_GROUP", (int)H5O_TYPE_GROUP);
    constant("H5O_TYPE_DATASET", (int)H5O_TYPE_DATASET);
    constant("H5O_TYPE_NAMED_DATATYPE", (int)H5O_TYPE_NAMED_DATATYPE);

    register_vector<std::string>("vector<string>");
}
