/*
*
*  Copyright (C) 2016-2020, OFFIS e.V.
*  All rights reserved.  See COPYRIGHT file for details.
*
*  This software and supporting documentation were developed by
*
*    OFFIS e.V.
*    R&D Division Health
*    Escherweg 2
*    D-26121 Oldenburg, Germany
*
*
*  Module:  dcmdata
*
*  Author:  Sebastian Grallert
*
*  Purpose: Convert the contents of a DICOM file to JSON format
*
*/

#include "dcmtk/config/osconfig.h" /* make sure OS specific configuration is included first */

#include "dcmtk/dcmdata/dctk.h"
#include "dcmtk/dcmdata/cmdlnarg.h"

#include "dcmtk/dcmdata/dcjson.h"
#include "dcmtk/ofstd/ofstream.h"
#include "dcmtk/ofstd/ofconapp.h"
#include "dcmtk/ofstd/ofexit.h"

#ifdef WITH_ZLIB
#include <zlib.h> /* for zlibVersion() */
#endif
#ifdef DCMTK_ENABLE_CHARSET_CONVERSION
#include "dcmtk/ofstd/ofchrenc.h" /* for OFCharacterEncoding */
#endif

#define OFFIS_CONSOLE_APPLICATION "dcm2json"
#define OFFIS_CONSOLE_DESCRIPTION "Convert DICOM file and data set to JSON"

#define EXITCODE_CANNOT_CONVERT_TO_UNICODE 80
#define EXITCODE_CANNOT_WRITE_VALID_JSON 81

static OFLogger dcm2jsonLogger = OFLog::getLogger("dcmtk.apps." OFFIS_CONSOLE_APPLICATION);

// ********************************************

/* Function to call all writeJson() functions in DCMTK */
static OFCondition writeFile(STD_NAMESPACE ostream &out,
                             const char *ifname,
                             DcmFileFormat *dfile,
                             const E_FileReadMode readMode,
                             const OFBool format,
                             const OFBool printMetaInfo,
                             const OFBool encode_extended)
{
    
    OFCondition result = EC_IllegalParameter;
    if ((ifname != NULL) && (dfile != NULL))
    {
        /* write JSON document content */
        DcmDataset *dset = dfile->getDataset();
        if (format)
        {
            DcmJsonFormatPretty fmt(printMetaInfo);
            fmt.setJsonExtensionEnabled(encode_extended);
            if (readMode == ERM_dataset)
                result = dset->writeJsonExt(out, fmt, OFTrue, OFTrue);
            else
                result = dfile->writeJson(out, fmt );
        }
        else
        {
            DcmJsonFormatCompact fmt(printMetaInfo);
            fmt.setJsonExtensionEnabled(encode_extended);
            if (readMode == ERM_dataset)
                result = dset->writeJsonExt(out, fmt, OFTrue, OFTrue );
            else
                result = dfile->writeJson(out, fmt );
        }
    }
    return result;
}

#define SHORTCOL 3
#define LONGCOL 20

static char rcsid[] = "$dcmtk: " OFFIS_CONSOLE_APPLICATION " v" OFFIS_DCMTK_VERSION " " OFFIS_DCMTK_RELEASEDATE " $";

#include <assert.h>
#include <node_api.h>


char *getDCMJson(char *ifname)
{
    OFBool opt_format = OFTrue;
    OFBool opt_addMetaInformation = OFTrue;
    OFBool opt_encode_extended = OFFalse;
    E_FileReadMode opt_readMode = ERM_autoDetect;
    E_TransferSyntax opt_ixfer = EXS_Unknown;
    OFString optStr;

    OFConsoleApplication app(OFFIS_CONSOLE_APPLICATION, OFFIS_CONSOLE_DESCRIPTION, rcsid);
    int result = 0;
    if ((ifname != NULL) && (strlen(ifname) > 0))
    {
        DcmFileFormat dfile;
        OFCondition status = dfile.loadFile(ifname, opt_ixfer, EGL_noChange, DCM_MaxReadLength, opt_readMode);
        if (status.good())
        {
            DcmDataset *dset = dfile.getDataset();
            OFString csetString;
            if (dset->findAndGetOFStringArray(DCM_SpecificCharacterSet, csetString).good())
            {
                if (csetString.compare("ISO_IR 192") != 0 && csetString.compare("ISO_IR 6") != 0)
                {
                    OFLOG_INFO(dcm2jsonLogger, "converting all element values that are affected by SpecificCharacterSet (0008,0005) to UTF-8");
                    status = dset->convertToUTF8();
                    if (status.bad())
                    {
                        OFLOG_FATAL(dcm2jsonLogger, status.text() << ": converting file to UTF-8: " << ifname);
                        result = EXITCODE_CANNOT_CONVERT_TO_UNICODE;
                    }
                }
            }
            if (result == 0)
            {
                std::ostringstream stream;
                status = writeFile(stream, ifname, &dfile, opt_readMode, opt_format, opt_addMetaInformation, opt_encode_extended);
                if (status.bad())
                {
                    OFLOG_FATAL(dcm2jsonLogger, status.text() << ": " << ifname);
                    result = EXITCODE_CANNOT_WRITE_VALID_JSON;
                }
                //COUT << stream.str();
                auto  streamStr = stream.str();
                char *item = new char[streamStr.size() +1 ];
                //important!
                //use strcpy avoid char* empty
                strcpy(item , streamStr.c_str());
                OFLOG_INFO(dcm2jsonLogger , "get json success");
                return item;
            }
        }
        else
        {
            return NULL;
        }
    }
    return NULL;
}



static napi_value dcm2json(napi_env env, napi_callback_info info)
{
    napi_status napiStatus;
    napi_value jsonResult[1];
    size_t argc = 2;
    napi_value args[2];
    napiStatus = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
    char *ifname = (char *)malloc(741478763* sizeof(char));
    size_t str_size;
    napi_value cb = args[1];
    napiStatus = napi_get_value_string_utf8(env, args[0], ifname, 741478763, &str_size);
    OFLOG_INFO(dcm2jsonLogger, ifname);
    char* dcmjson = getDCMJson(ifname);

    if (dcmjson != NULL) 
    {
        napiStatus = napi_create_string_utf8(env, dcmjson, NAPI_AUTO_LENGTH, jsonResult);
        napi_value global;
        napiStatus = napi_get_global(env, &global);
        napi_value cbresult;
        napiStatus = napi_call_function(env, global, cb, 1, jsonResult, &cbresult);
    }
    else 
    {
        napiStatus = napi_throw_error(env, "404" , "The dcmtk status is bad , maybe is no such file");
    }
    return NULL;
}

#define NAPI_CALL(env, call)                                      \
  do {                                                            \
    napi_status status = (call);                                  \
    if (status != napi_ok) {                                      \
      const napi_extended_error_info* error_info = NULL;          \
      napi_get_last_error_info((env), &error_info);               \
      bool is_pending;                                            \
      napi_is_exception_pending((env), &is_pending);              \
      if (!is_pending) {                                          \
        const char* message = (error_info->error_message == NULL) \
            ? "empty error message"                               \
            : error_info->error_message;                          \
        napi_throw_error((env), NULL, message);                   \
        return NULL;                                              \
      }                                                           \
    }                                                             \
  } while(0)
  
#define DECLARE_NAPI_METHOD(name, func) { name, 0, func, 0, 0, 0, napi_default, 0 }
static napi_value Init(napi_env env, napi_value exports)
{
    napi_property_descriptor desc[] = { 
        DECLARE_NAPI_METHOD("dcm2json", dcm2json)
    };
    /*napi_define_properties(env, exports, sizeof(desc) / sizeof(*desc), desc);
    return exports;*/
    NAPI_CALL(env ,  napi_create_function(env,
                                          "", 
                                          NAPI_AUTO_LENGTH, 
                                          dcm2json, 
                                          NULL, 
                                          &exports));
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init);