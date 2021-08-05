FROM node:14-buster
RUN rm -rf /var/lib/apt/lists/*
RUN rm -rf /etc/apt/sources.list.d/*
RUN echo \
'deb http://debian.csie.ntu.edu.tw/debian/ buster main  \
 deb http://security.debian.org/debian-security buster/updates main \
 deb http://debian.csie.ntu.edu.tw/debian/ buster-updates main' > /etc/apt/sources.list

RUN apt-get update -y && apt-get install python -y

RUN apt-get install python3-pip -y
RUN pip3 install --upgrade pip
RUN pip3 install pydicom opencv-python Pillow flask matplotlib

RUN apt-get install software-properties-common -y
RUN apt-get update ##[edited]
RUN apt-get install 'ffmpeg'\
    'libsm6'\ 
    'libxext6'  -y
RUN apt-get update && apt-get install -y dcmtk \
cmake \
make \
swig \
netcat

#Build gdcm
RUN wget -O gdcm.tar.gz https://sourceforge.net/projects/gdcm/files/gdcm%202.x/GDCM%202.8.9/gdcm-2.8.9.tar.gz
RUN tar xzvf gdcm.tar.gz
RUN cd /
RUN mkdir gdcm-build
WORKDIR /gdcm-build
RUN cmake ../gdcm-2.8.9 -DGDCM_BUILD_SHARED_LIBS=ON -DGDCM_WRAP_PYTHON=ON -DGDCM_DOCUMENTATION=OFF -DGDCM_BUILD_EXAMPLES=OFF -DGDCM_BUILD_TESTING=OFF ; exit 0
RUN make -j8 && make install 
WORKDIR /gdcm-build/bin
RUN cp gdcm.py gdcmswig.py _gdcmswig.so /usr/local/lib/python3.7/dist-packages 

#Build dcmtk with modify dcm2json 
WORKDIR /
RUN git clone https://github.com/Chinlinlee/dcmtk.git
RUN mkdir dcmtk-build
WORKDIR /dcmtk-build
RUN cmake -DDCMTK_MODULES:STRING="ofstd;oflog;dcmdata;" \
-DBUILD_SHARED_LIBS:BOOL=1 \
-DCMAKE_CXX_FLAGS:STRING="-fPIC" \
-DCMAKE_C_FLAGS:STRING="-fPIC" ../dcmtk
RUN make -j8
RUN make DESTDIR=/nodejs/raccoon/models/dcmtk/linux-lib/ install

#Build official dcmtk
WORKDIR /
RUN wget https://github.com/DCMTK/dcmtk/archive/refs/tags/DCMTK-3.6.6.tar.gz
RUN tar xzvf DCMTK-3.6.6.tar.gz
WORKDIR /dcmtk-DCMTK-3.6.6
RUN mkdir build
WORKDIR /dcmtk-DCMTK-3.6.6/build
RUN cmake -DBUILD_SHARED_LIBS:BOOL=1 \
-DBUILD_APPS:BOOL=1 \
-DCMAKE_CXX_FLAGS:STRING="-fPIC" \
-DCMAKE_C_FLAGS:STRING="-fPIC" ../
RUN make -j8
RUN make install

#Set up node.js raccoon
ENV LD_LIBRARY_PATH="/usr/local/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
ENV LD_LIBRARY_PATH="/nodejs/raccoon/models/dcmtk/linux-lib/usr/local/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
RUN echo $LD_LIBRARY_PATH
WORKDIR /
RUN mkdir -p /nodejs/raccoon/
WORKDIR /nodejs/raccoon/

COPY package*.json /nodejs/raccoon/
COPY . /nodejs/raccoon/
RUN npm rebuild
RUN npm install pm2@latest -g
RUN npm install node-gyp -g
RUN npm install
RUN node-gyp rebuild
EXPOSE 8081
CMD ["pm2-runtime" , "start" , "ecosystem.config.js"]

#https://gist.github.com/marcinwol/089d4a91f1a1279e33f9
