#----------------------------------------------------------------
# Generated CMake target import file for configuration "Release".
#----------------------------------------------------------------

# Commands may need to know the format version.
set(CMAKE_IMPORT_FILE_VERSION 1)

# Import target "dcmtk" for configuration "Release"
set_property(TARGET dcmtk APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(dcmtk PROPERTIES
  IMPORTED_LINK_INTERFACE_LIBRARIES_RELEASE "/usr/lib/x86_64-linux-gnu/libicuuc.so;/usr/lib/x86_64-linux-gnu/libicudata.so;nsl;pthread;/usr/lib/x86_64-linux-gnu/libz.so;/usr/lib/x86_64-linux-gnu/libxml2.so"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/lib/libdcmtk.so.16.3.6.6"
  IMPORTED_SONAME_RELEASE "libdcmtk.so.16"
  )

list(APPEND _IMPORT_CHECK_TARGETS dcmtk )
list(APPEND _IMPORT_CHECK_FILES_FOR_dcmtk "${_IMPORT_PREFIX}/lib/libdcmtk.so.16.3.6.6" )

# Commands beyond this point should not need to know the version.
set(CMAKE_IMPORT_FILE_VERSION)
