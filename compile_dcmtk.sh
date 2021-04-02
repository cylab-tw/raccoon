#!/bin/bash
tempPWD=`pwd`
git clone https://github.com/Chinlinlee/dcmtk.git
mkdir dcmtk-build
cd dcmtk-build
cmake -DDCMTK_MODULES:STRING="ofstd;oflog;dcmdata;" \
-DBUILD_SHARED_LIBS:BOOL=1 \
-DCMAKE_CXX_FLAGS:STRING="-fPIC" \
-DCMAKE_C_FLAGS:STRING="-fPIC" ../dcmtk

make -j8
make DESTDIR=$tempPWD/models/dcmtk/linux-lib install
rm -rf $tempPWD/dcmtk-build
rm -rf $tempPWD/dcmtk