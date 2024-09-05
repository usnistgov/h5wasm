#include <iostream>
#include <sstream>
#include <string>
#include <unistd.h>

#include "hdf5.h"
#include "hdf5_hl.h"
#include "H5PLextern.h"
#include <emscripten/bind.h>
#include <emscripten.h>

#define ATTRIBUTE_DATA 0
#define DATASET_DATA 1
#define ENUM_DATA 2

using namespace emscripten;

EM_JS(void, throw_error, (const char *string_error), {
    throw new Error(UTF8ToString(string_error));
});

// void throw_error(const char *string_error) {
//     throw std::runtime_error(string_error);
// }

// void throw_error(const char * string_error) {
//     // pass
// }

int64_t open(const std::string& filename_string, unsigned int h5_mode = H5F_ACC_RDONLY, bool track_order = false)
{
    const char *filename = filename_string.c_str();
    hid_t file_id;
    hid_t fcpl_id = H5Pcreate(H5P_FILE_CREATE);

    if (track_order)
    {
        H5Pset_link_creation_order(fcpl_id, H5P_CRT_ORDER_TRACKED | H5P_CRT_ORDER_INDEXED);
        H5Pset_attr_creation_order(fcpl_id, H5P_CRT_ORDER_TRACKED | H5P_CRT_ORDER_INDEXED);
    }

    if (h5_mode == H5F_ACC_TRUNC || h5_mode == H5F_ACC_EXCL)
    {
      file_id = H5Fcreate(filename, h5_mode, fcpl_id, H5P_DEFAULT);
    }
    else
    {
      // then it is an existing file...
      file_id = H5Fopen(filename, h5_mode, H5P_DEFAULT);
    }
    herr_t status = H5Pclose(fcpl_id);
    return (int64_t)file_id;
}

int close_file(hid_t file_id)
{
    herr_t status = H5Fclose(file_id);
    return (int)status;
}

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

val get_child_names(hid_t loc_id, const std::string& group_name_string, bool recursive)
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
    if (recursive) {
        status = H5Lvisit2(grp, H5_INDEX_NAME, H5_ITER_INC, link_name_callback, &names_vector);
    }
    else {
        status = H5Literate2(grp, index, H5_ITER_INC, NULL, link_name_callback, &names_vector);
    }

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
    else if (obj_type == H5O_TYPE_NAMED_DATATYPE)
    {
        ocpl_id = H5Tget_create_plist(obj_id);
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
        attr.set("strpad", (int)(H5Tget_strpad(dtype)));
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
    else if (dtype_class == H5T_VLEN) {
        hid_t base_dtype = H5Tget_super(dtype);
        val vlen_type = get_dtype_metadata(base_dtype);
        H5Tclose(base_dtype);
        attr.set("vlen_type", vlen_type);
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
    else if (dtype_class == H5T_REFERENCE)
    {
        std::string ref_type = (H5Tequal(dtype, H5T_STD_REF_OBJ)) ? "object" : "region";
        attr.set("ref_type", ref_type);
    }

    bool littleEndian = (order == H5T_ORDER_LE);
    attr.set("vlen", (bool)H5Tis_variable_str(dtype));
    attr.set("littleEndian", littleEndian);
    attr.set("size", size);

    return attr;
}

val get_datatype_metadata(hid_t loc_id, const std::string& dtype_name_string)
{
    hid_t dtype_id;
    herr_t status;
    const char *dtype_name = dtype_name_string.c_str();

    dtype_id = H5Topen2(loc_id, dtype_name, H5P_DEFAULT);
    if (dtype_id < 0)
    {
        throw_error("error - name not defined!");
        return val::null();
    }
    val metadata = get_dtype_metadata(dtype_id);

    H5Tclose(dtype_id);
    return metadata;
}

val get_abstractDS_metadata(hid_t dspace, hid_t dtype, hid_t dcpl)
{
    val attr = get_dtype_metadata(dtype);

    int type = H5Sget_simple_extent_type(dspace);
    int total_size = H5Sget_simple_extent_npoints(dspace);
    attr.set("total_size", total_size);

    if (type == H5S_NULL) {
        attr.set("shape", val::null());
        attr.set("maxshape", val::null());
        attr.set("chunks", val::null());
        return attr;
    }

    int rank = H5Sget_simple_extent_ndims(dspace);
    std::vector<hsize_t> dims_out(rank);
    std::vector<hsize_t> maxdims_out(rank);

    int ndims = H5Sget_simple_extent_dims(dspace, dims_out.data(), maxdims_out.data());

    val shape = val::array();
    val maxshape = val::array();
    for (int d = 0; d < ndims; d++) {
        shape.set(d, (uint)dims_out.at(d));
        maxshape.set(d, (uint)maxdims_out.at(d));
    }

    attr.set("shape", shape);
    attr.set("maxshape", maxshape);
    attr.set("chunks", val::null());

    if (dcpl) {
        H5D_layout_t layout = H5Pget_layout(dcpl);

        if (layout == H5D_CHUNKED) {
            std::vector<hsize_t> chunk_dims_out(ndims);
            H5Pget_chunk(dcpl, ndims, chunk_dims_out.data());

            val chunks = val::array();
            for (int c = 0; c < ndims; c++) {
                chunks.set(c, (uint)chunk_dims_out.at(c));
            }

            attr.set("chunks", chunks);
        }

        else if (layout == H5D_VIRTUAL) {
            val virtual_sources = val::array();
            size_t virtual_count;
            ssize_t file_name_size;
            ssize_t dset_name_size;
            H5Pget_virtual_count(dcpl, &virtual_count);
            for (size_t i = 0; i < virtual_count; i++) {
                val virtual_source = val::object();
                file_name_size = H5Pget_virtual_filename(dcpl, i, NULL, 0);
                dset_name_size = H5Pget_virtual_dsetname(dcpl, i, NULL, 0);
                char * file_name = (char *)malloc(file_name_size + 1);
                char * dset_name = (char *)malloc(dset_name_size + 1);
                H5Pget_virtual_filename(dcpl, i, file_name, file_name_size + 1);
                H5Pget_virtual_dsetname(dcpl, i, dset_name, dset_name_size + 1);
                virtual_source.set("file_name", std::string(file_name));
                virtual_source.set("dset_name", std::string(dset_name));
                free(file_name);
                free(dset_name);
                virtual_sources.set(i, virtual_source);
            }
            attr.set("virtual_sources", virtual_sources);
        }
    }

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
    val metadata = get_abstractDS_metadata(dspace, dtype, NULL);

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
    hid_t dcpl;
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
    dcpl = H5Dget_create_plist(ds_id);
    val metadata = get_abstractDS_metadata(dspace, dtype, dcpl);

    H5Dclose(ds_id);
    H5Sclose(dspace);
    H5Tclose(dtype);
    H5Pclose(dcpl);
    return metadata;
}

val get_dataset_filters(hid_t loc_id, const std::string& dataset_name_string)
{
    hid_t ds_id;
    hid_t plist_id;
    herr_t status;
    const char *dataset_name = dataset_name_string.c_str();

    ds_id = H5Dopen2(loc_id, dataset_name, H5P_DEFAULT);
    if (ds_id < 0)
    {
        throw_error("error - name not defined!");
        return val::null();
    }

    plist_id = H5Dget_create_plist(ds_id);

    val filters = val::array();
    int nfilters = H5Pget_nfilters(plist_id);
    for (size_t i = 0; i < nfilters; i++)
    {
        unsigned int flags;
        char name[257];
        size_t nelements = 16;
        unsigned int cd_values[16];
        H5Z_filter_t filter_id = H5Pget_filter2(plist_id, i, &flags, &nelements, cd_values, 256, name, NULL);
        val cd_values_out = val::array();
        if (nelements > 16) {
            unsigned int * full_cd_values = (unsigned int *)malloc(nelements);
            H5Pget_filter2(plist_id, i, &flags, &nelements, full_cd_values, 256, name, NULL);
            for (size_t i = 0; i < nelements; i++) {
                cd_values_out.set(i, full_cd_values[i]);
            }
            free(full_cd_values);
        }
        else {
            for (size_t i = 0; i < nelements; i++) {
                cd_values_out.set(i, cd_values[i]);
            }
        }
        val filter = val::object();
        filter.set("id", filter_id);
        filter.set("name", name);
        filter.set("cd_values", cd_values_out);
        filters.set(i, filter);
    }

    H5Dclose(ds_id);
    H5Pclose(plist_id);
    return filters;
}

int read_write_dataset_data(hid_t loc_id, const std::string& dataset_name_string, val count_out, val offset_out, val stride_out, uint64_t rwdata_uint64, bool write=false)
{
    hid_t ds_id;
    hid_t dspace;
    hid_t dtype;
    hid_t memtype;
    hid_t memspace;
    herr_t status;
    const char *dataset_name = dataset_name_string.c_str();
    void *rwdata = (void *)rwdata_uint64;

    ds_id = H5Dopen2(loc_id, dataset_name, H5P_DEFAULT);
    if (ds_id < 0)
    {
        throw_error("error - name not defined!");
        return -1;
    }
    dspace = H5Dget_space(ds_id);
    dtype = H5Dget_type(ds_id);
    // assumes that data to write will match type of dataset (exept endianness)
    memtype = H5Tcopy(dtype);
    // inputs and outputs from javascript will always be little-endian
    H5T_order_t dorder = H5Tget_order(dtype);
    if (dorder == H5T_ORDER_BE || dorder == H5T_ORDER_VAX)
    {
        status = H5Tset_order(memtype, H5T_ORDER_LE);
    }

    if (count_out != val::null() && offset_out != val::null())
    {
        std::vector<hsize_t> count = convertJSArrayToNumberVector<hsize_t>(count_out);
        std::vector<hsize_t> offset = convertJSArrayToNumberVector<hsize_t>(offset_out);
        std::vector<hsize_t> strides = convertJSArrayToNumberVector<hsize_t>(stride_out);

        memspace = H5Screate_simple(count.size(), &count[0], nullptr);
        status = H5Sselect_hyperslab(dspace, H5S_SELECT_SET, &offset[0], &strides[0], &count[0], NULL);
        status = H5Sselect_all(memspace);
    }
    else
    {
        status = H5Sselect_all(dspace);
        memspace = H5Scopy(dspace);
    }

    if (write) {
        status = H5Dwrite(ds_id, memtype, memspace, dspace, H5P_DEFAULT, rwdata);
    }
    else {
        status = H5Dread(ds_id, memtype, memspace, dspace, H5P_DEFAULT, rwdata);
    }
    
    H5Dclose(ds_id);
    H5Sclose(dspace);
    H5Sclose(memspace);
    H5Tclose(dtype);
    H5Tclose(memtype);
    return (int)status;
}

int get_dataset_data(hid_t loc_id, const std::string& dataset_name_string, val count_out, val offset_out, val stride_out, uint64_t rdata_uint64)
{
    return read_write_dataset_data(loc_id, dataset_name_string, count_out, offset_out, stride_out, rdata_uint64, false);
}

int set_dataset_data(hid_t loc_id, const std::string& dataset_name_string, val count_out, val offset_out, val stride_out, uint64_t wdata_uint64)
{
    return read_write_dataset_data(loc_id, dataset_name_string, count_out, offset_out, stride_out, wdata_uint64, true);
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
    hid_t dtype;
    hid_t memtype;
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
    memtype = H5Tcopy(dtype);
    // inputs and outputs from javascript will always be little-endian
    H5T_order_t dorder = H5Tget_order(dtype);
    if (dorder == H5T_ORDER_BE || dorder == H5T_ORDER_VAX)
    {
        status = H5Tset_order(memtype, H5T_ORDER_LE);
    }

    status = H5Aread(attr_id, memtype, rdata);

    H5Aclose(attr_id);
    H5Tclose(dtype);
    H5Tclose(memtype);
    return (int)status;
}

int create_group(hid_t loc_id, std::string grp_name_string, const bool track_order=false)
{
    hid_t gcpl_id = H5Pcreate(H5P_GROUP_CREATE);
    if (track_order)
    {
        H5Pset_link_creation_order(gcpl_id, H5P_CRT_ORDER_TRACKED | H5P_CRT_ORDER_INDEXED);
        H5Pset_attr_creation_order(gcpl_id, H5P_CRT_ORDER_TRACKED | H5P_CRT_ORDER_INDEXED);
    }
    hid_t grp_id = H5Gcreate2(loc_id, grp_name_string.c_str(), H5P_DEFAULT, gcpl_id, H5P_DEFAULT);
    herr_t status = H5Pclose(gcpl_id);
    status = H5Gclose(grp_id);
    return (int)status;
}

herr_t setup_dataset(val dims_in, val maxdims_in, val chunks_in, int dtype, int dsize, bool is_signed, bool is_vlstr, int compression, val compression_opts, bool track_order, hid_t *filetype, hid_t *space, hid_t *dcpl)
{
    herr_t status;

    std::vector<hsize_t> dims_vec = vecFromJSArray<hsize_t>(dims_in);
    int ndims = dims_vec.size();
    hsize_t *dims = dims_vec.data();

    std::vector<hsize_t> maxdims_vec = vecFromJSArray<hsize_t>(maxdims_in);
    hsize_t *maxdims = maxdims_vec.data();

    /*
    * Create dataspace.  Setting maximum size to NULL sets the maximum
    * size to be the current size.
    */
    *space = H5Screate_simple(ndims, dims, maxdims);

    /*
    * Create dataset creation property list (dcpl),
    * defining chunking if chunks_in is not null
    */
    *dcpl = H5Pcreate(H5P_DATASET_CREATE);

    if (chunks_in != val::null()) {
        std::vector<hsize_t> chunks_vec = vecFromJSArray<hsize_t>(chunks_in);
        hsize_t *chunks = chunks_vec.data();
        int nchunks = chunks_vec.size();
        H5Pset_chunk(*dcpl, nchunks, chunks);
        if (compression != 0) {
            std::vector<uint> compression_opts_vec = vecFromJSArray<uint>(compression_opts);
            size_t cd_nelmts = compression_opts_vec.size();
            uint *cd_values = compression_opts_vec.data();
            H5Pset_filter(*dcpl, compression, H5Z_FLAG_MANDATORY, cd_nelmts, cd_values);
        }
    }

    if (track_order) {
        H5Pset_attr_creation_order(*dcpl, H5P_CRT_ORDER_TRACKED | H5P_CRT_ORDER_INDEXED);
    }

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
    else if (dtype == H5T_REFERENCE)
    {
        if (dsize == sizeof(hobj_ref_t)) {
            *filetype = H5Tcopy(H5T_STD_REF_OBJ);
        }
        else if (dsize == sizeof(hdset_reg_ref_t)) {
            *filetype = H5Tcopy(H5T_STD_REF_DSETREG);
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
    hid_t filetype, space, dset, attr, obj_id, dcpl;
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

    status = setup_dataset(dims_in, dims_in, val::null(), dtype, dsize, is_signed, is_vlstr, 0, val::null(), false, &filetype, &space, &dcpl);
    /*
    * Create the attribute and write the data to it.
    */
    obj_id = H5Oopen(loc_id, obj_name_string.c_str(), H5P_DEFAULT);
    attr = H5Acreate(obj_id, attr_name, filetype, space, H5P_DEFAULT,
                     H5P_DEFAULT);
    status = H5Awrite(attr, filetype, wdata);
    /*
    * Close and release resources.
    */
    status = H5Aclose(attr);

    status = H5Sclose(space);
    status = H5Tclose(filetype);
    status = H5Pclose(dcpl);
    //status = H5Tclose(memtype);
    status = H5Oclose(obj_id);
    return (int)status;
}

int delete_attribute(hid_t loc_id, const std::string obj_name_string, const std::string attr_name_string)
{
    herr_t status = H5Adelete_by_name(loc_id, obj_name_string.c_str(), attr_name_string.c_str(), H5P_DEFAULT);
    return (int) status;
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

int create_dataset(hid_t loc_id, std::string dset_name_string, uint64_t wdata_uint64, val dims_in, val maxdims_in, val chunks_in, int dtype, int dsize, bool is_signed, bool is_vlstr, int compression, val compression_opts, bool track_order=false)
{
    hid_t filetype, space, dset, dcpl;
    herr_t status;
    // data is pointer to raw bytes
    void *wdata = (void *)wdata_uint64;
    const char *dset_name = dset_name_string.c_str();

    status = setup_dataset(dims_in, maxdims_in, chunks_in, dtype, dsize, is_signed, is_vlstr, compression, compression_opts, track_order, &filetype, &space, &dcpl);
    dset = H5Dcreate2(loc_id, dset_name, filetype, space, H5P_DEFAULT, dcpl, H5P_DEFAULT);
    status = H5Dwrite(dset, filetype, space, space, H5P_DEFAULT, wdata);

    status = H5Dclose(dset);
    status = H5Sclose(space);
    status = H5Tclose(filetype);
    status = H5Pclose(dcpl);
    return (int)status;
}

int create_vlen_str_dataset(hid_t loc_id, std::string dset_name_string, val data, val dims_in, val maxdims_in, val chunks_in, int dtype, int dsize, bool is_signed, bool is_vlstr, bool track_order=false) {
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
    return create_dataset(loc_id, dset_name_string, wdata_uint64, dims_in, maxdims_in, chunks_in, dtype, dsize, is_signed, is_vlstr, 0, val::null(), track_order);
}

int resize_dataset(hid_t loc_id, const std::string dset_name_string, val new_size_in)
{
    const char *dset_name = dset_name_string.c_str();
    hid_t dset_id = H5Dopen2(loc_id, dset_name, H5P_DEFAULT);

    std::vector<hsize_t> new_size_vec = vecFromJSArray<hsize_t>(new_size_in);
    hsize_t *new_size = new_size_vec.data();

    herr_t status = H5Dset_extent(dset_id, new_size);
    H5Dclose(dset_id);
    return (int) status;
}

int create_soft_link(hid_t loc_id, std::string link_target_string, std::string link_name_string) {
    const char *link_target = link_target_string.c_str();
    const char *link_name = link_name_string.c_str();

    return H5Lcreate_soft(link_target, loc_id, link_name, H5P_DEFAULT, H5P_DEFAULT);
}

int create_hard_link(hid_t loc_id, std::string link_target_string, std::string link_name_string) {
    // only supports linking target with absolute paths (relative to root)
    // will return non-zero value if target does not already exist.
    const char *link_target = link_target_string.c_str();
    const char *link_name = link_name_string.c_str();

    return H5Lcreate_hard(loc_id, link_target, loc_id, link_name, H5P_DEFAULT, H5P_DEFAULT);
}

int create_external_link(hid_t loc_id, std::string file_name_string, std::string link_target_string, std::string link_name_string) {
    const char *file_name = file_name_string.c_str();
    const char *link_target = link_target_string.c_str();
    const char *link_name = link_name_string.c_str();

    return H5Lcreate_external(file_name, link_target, loc_id, link_name, H5P_DEFAULT, H5P_DEFAULT);
}


int flush(hid_t file_id) {
    herr_t status = H5Fflush(file_id, H5F_SCOPE_GLOBAL);
    return (int)status;
}

val get_plugin_search_paths()
{
    herr_t status;
    unsigned int num_paths;
    ssize_t path_length;
    char *initial_path_buf = {};
    status = H5PLsize(&num_paths);

    val paths = val::array();
    for (unsigned int i = 0; i < num_paths; i++)
    {
        path_length = H5PLget(i, initial_path_buf, 0);
        char * path_buf = (char *)malloc(path_length + 1);
        H5PLget(i, path_buf, path_length + 1);
        paths.set(i, std::string(path_buf));
        free(path_buf);
    }
    return paths;
}

int insert_plugin_search_path(const std::string search_path_string, unsigned int index)
{
    const char *search_path = search_path_string.c_str();
    herr_t status = H5PLinsert(search_path, index);
    return (int)status;
}

// Dimension scales
int set_scale(hid_t loc_id, const std::string& dset_name_string, const std::string& dim_name_string)
{
    const char *dset_name = dset_name_string.c_str();
    const char *dim_name = dim_name_string.c_str();
    hid_t dset_id = H5Dopen2(loc_id, dset_name, H5P_DEFAULT);
    herr_t status = H5DSset_scale(dset_id, dim_name);
    status = H5Dclose(dset_id);
    return (int)status;
}

int attach_scale(hid_t loc_id, const std::string& target_dset_name_string, const std::string& dimscale_dset_name_string, const unsigned int index)
{
    const char *target_dset_name = target_dset_name_string.c_str();
    const char *dimscale_dset_name = dimscale_dset_name_string.c_str();
    hid_t target_dset_id = H5Dopen2(loc_id, target_dset_name, H5P_DEFAULT);
    hid_t dimscale_dset_id = H5Dopen2(loc_id, dimscale_dset_name, H5P_DEFAULT);
    herr_t status = H5DSattach_scale(target_dset_id, dimscale_dset_id, index);
    status = H5Dclose(target_dset_id);
    status = H5Dclose(dimscale_dset_id);
    return (int)status;
}

int detach_scale(hid_t loc_id, const std::string& target_dset_name_string, const std::string& dimscale_dset_name_string, const unsigned int index)
{
    const char *target_dset_name = target_dset_name_string.c_str();
    const char *dimscale_dset_name = dimscale_dset_name_string.c_str();
    hid_t target_dset_id = H5Dopen2(loc_id, target_dset_name, H5P_DEFAULT);
    hid_t dimscale_dset_id = H5Dopen2(loc_id, dimscale_dset_name, H5P_DEFAULT);
    herr_t status = H5DSdetach_scale(target_dset_id, dimscale_dset_id, index);
    status = H5Dclose(target_dset_id);
    status = H5Dclose(dimscale_dset_id);
    return (int)status;
}

val get_scale_name(hid_t loc_id, const std::string& dimscale_dset_name_string)
{
    const char *dimscale_dset_name = dimscale_dset_name_string.c_str();
    hid_t dimscale_dset_id = H5Dopen2(loc_id, dimscale_dset_name, H5P_DEFAULT);
    htri_t is_scale = H5DSis_scale(dimscale_dset_id);
    val output = val::null();
    if (is_scale)
    {
        ssize_t namesize = H5DSget_scale_name(dimscale_dset_id, nullptr, 0);
        if (namesize > 0)
        {
            char *name = new char[namesize + 1];
            H5DSget_scale_name(dimscale_dset_id, name, namesize + 1);
            output = val(std::string(name));
            delete[] name;
        }
        else
        {
            output = val("");
        }
    }
    herr_t status = H5Dclose(dimscale_dset_id);
    return output;
}

herr_t scale_path_callback(hid_t dset_id, unsigned dim, hid_t dimscale_dset_id, void* opdata)
{
    ssize_t pathsize = H5Iget_name(dimscale_dset_id, nullptr, 0);
    char *path = new char[pathsize + 1];
    H5Iget_name(dimscale_dset_id, path, pathsize + 1);
    std::vector<std::string> *pathlist = reinterpret_cast<std::vector<std::string> *>(opdata);
    (*pathlist).push_back(path);
    delete[] path;
    return 0;
}

val get_attached_scales(hid_t loc_id, const std::string& target_dset_name_string, const unsigned int index)
{
    // returns paths to all attached scales
    const char *target_dset_name = target_dset_name_string.c_str();
    hid_t target_dset_id = H5Dopen2(loc_id, target_dset_name, H5P_DEFAULT);
    std::vector<std::string> paths_vector;
    herr_t status = H5DSiterate_scales(target_dset_id, index, nullptr, &scale_path_callback, &paths_vector);
    status = H5Dclose(target_dset_id);

    val pathlist = val::array();
    size_t numObjs = paths_vector.size();
    for (size_t i = 0; i < numObjs; i++)
    {
        pathlist.set(i, paths_vector.at(i));
    }
    return pathlist;
}

int set_dimension_label(hid_t loc_id, const std::string& target_dset_name_string, const unsigned int index, const std::string& label_string)
{
    const char *target_dset_name = target_dset_name_string.c_str();
    const char *label = label_string.c_str();
    hid_t target_dset_id = H5Dopen2(loc_id, target_dset_name, H5P_DEFAULT);
    herr_t status = H5DSset_label(target_dset_id, index, label);
    H5Dclose(target_dset_id);
    return (int)status;
}

val get_dimension_labels(hid_t loc_id, const std::string& target_dset_name_string)
{
    const char *target_dset_name = target_dset_name_string.c_str();
    hid_t target_dset_id = H5Dopen2(loc_id, target_dset_name, H5P_DEFAULT);
    hid_t dspace = H5Dget_space(target_dset_id);
    int ndims = H5Sget_simple_extent_dims(dspace, nullptr, nullptr);
    val dim_labels = val::array();
    for (int d = 0; d < ndims; d++)
    {
        ssize_t labelsize = H5DSget_label(target_dset_id, d, nullptr, 0);
        if (labelsize > 0)
        {
            char *label = new char[labelsize + 1];
            H5DSget_label(target_dset_id, d, label, labelsize + 1);
            dim_labels.set(d, val(std::string(label)));
            delete[] label;
        }
        else
        {
            dim_labels.set(d, val::null());
        }
    }
    herr_t status = H5Dclose(target_dset_id);
    status = H5Sclose(dspace);
    return dim_labels;
}

// References
val create_object_reference(hid_t loc_id, const std::string& obj_name_string)
{
    const char *obj_name = obj_name_string.c_str();
    std::vector<uint8_t> ref(sizeof(hobj_ref_t));
    herr_t status = H5Rcreate(ref.data(), loc_id, obj_name, H5R_OBJECT, (hid_t)-1);
    return val::array(ref);
}

val create_region_reference(hid_t loc_id, const std::string& dataset_name_string, val count_out, val offset_out, val stride_out)
{
    hid_t ds_id;
    hid_t dspace;
    std::vector<uint8_t> ref(sizeof(hdset_reg_ref_t));
    herr_t status;
    const char *dataset_name = dataset_name_string.c_str();

    ds_id = H5Dopen2(loc_id, dataset_name, H5P_DEFAULT);
    dspace = H5Dget_space(ds_id);
    if (count_out != val::null() && offset_out != val::null())
    {
        std::vector<hsize_t> count = convertJSArrayToNumberVector<hsize_t>(count_out);
        std::vector<hsize_t> offset = convertJSArrayToNumberVector<hsize_t>(offset_out);
        std::vector<hsize_t> strides = convertJSArrayToNumberVector<hsize_t>(stride_out);
        status = H5Sselect_hyperslab(dspace, H5S_SELECT_SET, &offset[0], &strides[0], &count[0], NULL);
    }
    else
    {
        status = H5Sselect_all(dspace);
    }
    status = H5Rcreate(ref.data(), loc_id, dataset_name, H5R_DATASET_REGION, dspace);
    H5Sclose(dspace);
    H5Dclose(ds_id);
    return val::array(ref);
}

val get_referenced_name(hid_t loc_id, const val ref_data_in, const bool is_object)
{
    ssize_t namesize = 0;
    std::vector<uint8_t> ref_data_vec = convertJSArrayToNumberVector<uint8_t>(ref_data_in);
    const hobj_ref_t *ref_ptr = (hobj_ref_t *)ref_data_vec.data();
    val output = val::null();
    const H5R_type_t ref_type = (is_object) ? H5R_OBJECT : H5R_DATASET_REGION;
    hid_t object_id = H5Rdereference2(loc_id, H5P_DEFAULT, ref_type, ref_ptr);
    namesize = H5Iget_name(object_id, nullptr, 0);
    if (namesize > 0)
    {
        char *name = new char[namesize + 1];
        H5Iget_name(object_id, name, namesize + 1);

        output = val::u8string(name);
        delete[] name;
    }
    H5Oclose(object_id);
    return output;
}

val get_region_metadata(hid_t loc_id, const val ref_data_in)
{
    hid_t dspace;
    hid_t dtype;
    hid_t dcpl;
    herr_t status;
    const std::vector<uint8_t> ref_data_vec = convertJSArrayToNumberVector<uint8_t>(ref_data_in);
    const hdset_reg_ref_t *ref_ptr = (hdset_reg_ref_t *)ref_data_vec.data();
    hid_t ds_id = H5Rdereference2(loc_id, H5P_DEFAULT, H5R_DATASET_REGION, ref_ptr);

    dtype = H5Dget_type(ds_id);
    dspace = H5Rget_region(ds_id, H5R_DATASET_REGION, ref_ptr);
    dcpl = H5Dget_create_plist(ds_id);
    // fill in shape, maxshape, chunks, total_size
    val metadata = get_abstractDS_metadata(dspace, dtype, dcpl);
    // then override the ones that are specific to a region:
    int total_size = H5Sget_select_npoints(dspace);
    metadata.set("total_size", total_size);

    int rank = H5Sget_simple_extent_ndims(dspace);
    // shape will be null if the selection is not a regular hyperslab
    val shape = val::null();
    htri_t is_regular = H5Sis_regular_hyperslab(dspace);
    if (is_regular > 0)
    {
        std::vector<hsize_t> count(rank);
        std::vector<hsize_t> block(rank);
        htri_t success = H5Sget_regular_hyperslab(dspace, nullptr, nullptr, count.data(), block.data());
        shape = val::array();
        for (int d = 0; d < rank; d++)
        {
            int blocksize = (block.at(d) == NULL) ? 1 : block.at(d); 
            shape.set(d, (uint)(count.at(d) * blocksize));
        }
    }
    metadata.set("shape", shape);
    H5Dclose(ds_id);
    H5Sclose(dspace);
    H5Tclose(dtype);
    H5Pclose(dcpl);
    return metadata;
}

int get_region_data(hid_t loc_id, val ref_data_in, uint64_t rdata_uint64)
{
    hid_t ds_id;
    hid_t dspace;
    hid_t dtype;
    hid_t memtype;
    hid_t memspace;
    herr_t status;
    void *rdata = (void *)rdata_uint64;
    const std::vector<uint8_t> ref_data_vec = convertJSArrayToNumberVector<uint8_t>(ref_data_in);
    const hdset_reg_ref_t *ref_ptr = (hdset_reg_ref_t *)ref_data_vec.data();
    ds_id = H5Rdereference2(loc_id, H5P_DEFAULT, H5R_DATASET_REGION, ref_ptr);
    dspace = H5Rget_region(ds_id, H5R_DATASET_REGION, ref_ptr);
    dtype = H5Dget_type(ds_id);
    // assumes that data to write will match type of dataset (exept endianness)
    memtype = H5Tcopy(dtype);
    // inputs and outputs from javascript will always be little-endian
    H5T_order_t dorder = H5Tget_order(dtype);
    if (dorder == H5T_ORDER_BE || dorder == H5T_ORDER_VAX)
    {
        status = H5Tset_order(memtype, H5T_ORDER_LE);
    }
    int rank = H5Sget_simple_extent_ndims(dspace);
    htri_t is_regular = H5Sis_regular_hyperslab(dspace);
    if (is_regular > 0)
    {
        std::vector<hsize_t> count(rank);
        std::vector<hsize_t> block(rank);
        std::vector<hsize_t> shape_out(rank);
        htri_t success = H5Sget_regular_hyperslab(dspace, nullptr, nullptr, count.data(), block.data());
        for (int d = 0; d < rank; d++)
        {
            int blocksize = (block.at(d) == NULL) ? 1 : block.at(d); 
            shape_out.at(d) = (count.at(d) * blocksize);
        }
        memspace = H5Screate_simple(shape_out.size(), &shape_out[0], nullptr);
    }
    else
    {
        hsize_t total_size = H5Sget_select_npoints(dspace);
        memspace = H5Screate_simple(1, &total_size, nullptr);
    }
    status = H5Dread(ds_id, memtype, memspace, dspace, H5P_DEFAULT, rdata);
    H5Dclose(ds_id);
    H5Sclose(dspace);
    H5Sclose(memspace);
    H5Tclose(dtype);
    H5Tclose(memtype);
    return (int)status;
}

herr_t throwing_error_handler(hid_t estack, void *client_data)
{
    FILE *error_file = tmpfile();
    herr_t status = H5Eprint2(estack, error_file);
    rewind(error_file);
    std::stringstream output_stream;
    char line[256];
    while (fgets(line, sizeof(line), error_file) != NULL) {
        output_stream << line;
    }
    std::string error_message = output_stream.str();
    throw_error(error_message.c_str());
    fclose(error_file);
    return 0;
}

H5E_auto2_t default_error_handler;
void *default_error_handler_client_data;
herr_t error_handler_get_result = H5Eget_auto2(H5E_DEFAULT, &default_error_handler, &default_error_handler_client_data);

int activate_throwing_error_handler() {
    herr_t error_handler_set_result = H5Eset_auto2(H5E_DEFAULT, throwing_error_handler, NULL);
    return (int)error_handler_set_result;
}

int deactivate_throwing_error_handler() {
    herr_t error_handler_set_result = H5Eset_auto2(H5E_DEFAULT, default_error_handler, default_error_handler_client_data);
    return (int)error_handler_set_result;
}

EMSCRIPTEN_BINDINGS(hdf5)
{
    function("open", &open);
    function("close_file", &close_file);
    function("get_keys", &get_keys_vector);
    function("get_names", &get_child_names);
    function("get_types", &get_child_types);
    function("get_symbolic_link", &get_symbolic_link);
    function("get_external_link", &get_external_link);
    function("get_type", &get_type);
    function("get_attribute_names", &get_attribute_names);
    function("get_attribute_metadata", &get_attribute_metadata);
    function("get_dataset_metadata", &get_dataset_metadata);
    function("get_datatype_metadata", &get_datatype_metadata);
    function("get_dataset_filters", &get_dataset_filters);
    function("refresh_dataset", &refresh_dataset);
    function("get_dataset_data", &get_dataset_data);
    function("set_dataset_data", &set_dataset_data);
    function("get_attribute_data", &get_attribute_data);
    function("reclaim_vlen_memory", &reclaim_vlen_memory);
    function("create_group", &create_group);
    function("create_dataset", &create_dataset);
    function("resize_dataset", &resize_dataset);
    function("create_attribute", &create_attribute, allow_raw_pointers());
    function("delete_attribute", &delete_attribute);
    function("create_vlen_str_attribute", &create_vlen_str_attribute);
    function("create_vlen_str_dataset", &create_vlen_str_dataset);
    function("create_soft_link", &create_soft_link);
    function("create_hard_link", &create_hard_link);
    function("create_external_link", &create_external_link);
    function("flush", &flush);
    function("get_plugin_search_paths", &get_plugin_search_paths);
    function("insert_plugin_search_path", &insert_plugin_search_path);
    function("remove_plugin_search_path", &H5PLremove);
    function("set_scale", &set_scale);
    function("attach_scale", &attach_scale);
    function("detach_scale", &detach_scale);
    function("get_scale_name", &get_scale_name);
    function("get_attached_scales", &get_attached_scales);
    function("get_dimension_labels", &get_dimension_labels);
    function("set_dimension_label", &set_dimension_label);
    function("create_object_reference", &create_object_reference);
    function("create_region_reference", &create_region_reference);
    function("get_referenced_name", &get_referenced_name);
    function("get_region_metadata", &get_region_metadata);
    function("get_region_data", &get_region_data);
    function("activate_throwing_error_handler", &activate_throwing_error_handler);
    function("deactivate_throwing_error_handler", &deactivate_throwing_error_handler);

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
    constant("SIZEOF_OBJ_REF", (int)(sizeof(hobj_ref_t)));
    constant("SIZEOF_DSET_REGION_REF", (int)(sizeof(hdset_reg_ref_t)));

    constant("H5Z_FILTER_NONE", H5Z_FILTER_NONE);
    constant("H5Z_FILTER_DEFLATE", H5Z_FILTER_DEFLATE);
    constant("H5Z_FILTER_SHUFFLE", H5Z_FILTER_SHUFFLE);
    constant("H5Z_FILTER_FLETCHER32", H5Z_FILTER_FLETCHER32);
    constant("H5Z_FILTER_SZIP", H5Z_FILTER_SZIP);
    constant("H5Z_FILTER_NBIT", H5Z_FILTER_NBIT);
    constant("H5Z_FILTER_SCALEOFFSET", H5Z_FILTER_SCALEOFFSET);
    constant("H5Z_FILTER_RESERVED", H5Z_FILTER_RESERVED);
    constant("H5Z_FILTER_MAX", H5Z_FILTER_MAX);

    register_vector<std::string>("vector<string>");
}

