FROM node:14-bullseye-slim
# install gcc
RUN apt update -y
RUN apt install -qq -y --no-install-recommends \
gcc \
libc6-dev \
python \
python3-pip \
python3-gdcm \
libgdcm3.0 \
ffmpeg \
libsm6 \
libxext6 \
dcmtk \
cmake \
make \
swig \
netcat \
imagemagick \
wget
RUN pip3 install --upgrade pip
RUN pip3 install pydicom opencv-python Pillow flask matplotlib highdicom

#Build gdcm
#RUN wget -O gdcm.tar.gz https://sourceforge.net/projects/gdcm/files/gdcm%202.x/GDCM%202.8.9/gdcm-2.8.9.tar.gz
#RUN tar xzvf gdcm.tar.gz
#RUN cd /
#RUN mkdir gdcm-build
#WORKDIR /gdcm-build
#RUN cmake ../gdcm-2.8.9 -DGDCM_BUILD_SHARED_LIBS=ON -DGDCM_WRAP_PYTHON=ON -DGDCM_DOCUMENTATION=OFF -DGDCM_BUILD_EXAMPLES=OFF -DGDCM_BUILD_TESTING=OFF ; exit 0
#RUN make -j8 && make install 
#WORKDIR /gdcm-build/bin
#RUN cp gdcm.py gdcmswig.py _gdcmswig.so /usr/local/lib/python3.9/dist-packages 

# Build iconv
WORKDIR /
RUN wget -O libiconv.tar.gz https://ftp.gnu.org/pub/gnu/libiconv/libiconv-1.16.tar.gz && tar xzvf libiconv.tar.gz
WORKDIR /libiconv-1.16
RUN ./configure && make && make install
RUN rm -rf /libiconv.tar.gz

RUN apt-get purge -y wget

# #Build official dcmtk
# WORKDIR /
# RUN wget https://github.com/DCMTK/dcmtk/archive/refs/tags/DCMTK-3.6.6.tar.gz
# RUN tar xzvf DCMTK-3.6.6.tar.gz
# WORKDIR /dcmtk-DCMTK-3.6.6
# RUN mkdir build
# WORKDIR /dcmtk-DCMTK-3.6.6/build
# RUN cmake -DBUILD_SHARED_LIBS:BOOL=1 \
# -DBUILD_APPS:BOOL=1 \
# -DCMAKE_CXX_FLAGS:STRING="-fPIC" \
# -DCMAKE_C_FLAGS:STRING="-fPIC" ../
# RUN make -j8
# RUN make install

#Set up node.js raccoon
# ENV LD_LIBRARY_PATH="/usr/local/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
# ENV LD_LIBRARY_PATH="/nodejs/raccoon/models/dcmtk/linux-lib/usr/local/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
# RUN echo $LD_LIBRARY_PATH
WORKDIR /
RUN mkdir -p /nodejs/raccoon/
WORKDIR /nodejs/raccoon/

COPY package*.json /nodejs/raccoon/
COPY . /nodejs/raccoon/
RUN npm rebuild
RUN npm install pm2@latest -g
RUN npm install
ENV DCMDICTPATH="/nodejs/raccoon/models/dcmtk/dicom.dic"
EXPOSE 8081
CMD ["pm2-runtime" , "start" , "ecosystem.config.js"]

#https://gist.github.com/marcinwol/089d4a91f1a1279e33f9
