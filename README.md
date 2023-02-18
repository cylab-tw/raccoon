<div> 
  <div style="float: left;width: 15%;"><img src="https://repository-images.githubusercontent.com/314441601/8e680180-33da-11eb-8da5-266f5636f213" width="90px"></div>
  <div style="float: left;width: 85%;"><h1>Raccoon - Web-based DICOMWeb & FHIR ImagingStudy Server</h1> 
</div>

[English](README.md) | [繁體中文](README.zh-TW.md)

---
**Raccoon** is a noSQL-based medical image archive designed for managing DICOM images, utilizing MongoDB to store and manage the images while providing RESTful APIs that support both FHIR ImagingStudy and [DICOMweb](https://www.dicomstandard.org/dicomweb/") protocols for querying, retrieving, and managing DICOM images. Built on top of the Burni FHIR Server, Raccoon manages FHIR resources related to medical images.<br><br>
This project is maintained by DICOM experts from whole world and primarily managed by the [Imaging Informatics Lab](https://cylab.dicom.tw).
---

## Installation
* Before starting Raccoon, MongoDB, imagemagick must be installed.
* This project uses the submodule with <a href="https://github.com/cylab-tw/bluelight/">BlueLight</a> for DICOM viewer. If you want to use it, run `git submodule init` and `git submodule update` when the first time.
* [Node.js](https://nodejs.org/en/download/) >= 14
* Python >= 3.7
### Windows

#### Test OS
- Windows 10 64bits
#### requirement
- [**MongoDB**](https://www.mongodb.com/try/download/community) >= 4.0
- **Anaconda** (Optional)
- **GDCM environment in Anaconda** (Required when you use Anaconda)
- **[imagemagick](https://imagemagick.org/script/download.php)**
#### Install dependencies
- Go to project root path and run:
```bash
npm install
npm run build #This will download dcmtk executable binaries to ./models/dcmtk and generate example dotenv file.
pip install -r requirements.txt #Install Python Dependencies
```

> 💙💙💙 <br>
> Windows installation ends here, scroll down to see <br>
> <a href="#configuration">Configuration</a> & <a href="#deploy">Deploy</a> guide

### Linux
#### Test OS
- Ubuntu v21.10
#### requirement
- [**MongoDB**](https://www.mongodb.com/try/download/community) >= 4.0
- **GDCM**
>```bash
>sudo apt-get install python3-gdcm libgdcm3.0
>```
- imagemagick
>```bash
>sudo apt-get install imagemagick #ubuntu
>```
#### Install dependencies
- Go to project root path and run:
```bash
sudo apt-get install dcmtk
npm install
pip install -r requirements.txt #Install Python Dependencies
```
#### Troubleshooting
- `Unknown VR: Tag not found in data dictionary` when using `STOW-RS`
    - You need set the `DCMDICTPATH` environment variable
    - The `dicom.dic` can find in the `/usr/share/libdcmtk{version}`
    > The {version} corresponds to dcmtk version, e.g. 3.6.5 => libdcmtk15

    - Set `DCMDICTPATH` environment variable using command or you can add the command to profile file(`~/.bashrc`,`~/.profile` etc.), example **with dcmtk 3.6.5**:
    ```sh
    export DCMDICTPATH=/usr/share/libdcmtk15/dicom.dic
    ```
    - Check the environment variable
    ```sh
    echo $DCMDICTPATH
    ```

---

## Configuration
### Server dotenv
- The `.env` file at project root.
- You can copy the `.env.template` and modify it.
```bash
ENV='windows'  #input the os type. enum: windows , linux

MONGODB_NAME="Raccoon" 
MONGODB_HOSTS=["mongodb"]
MONGODB_PORTS=[27017]
MONGODB_USER="user"
MONGODB_PASSWORD="password"
MONGODB_SLAVEMODE=false


SERVER_HOST="localhost"
SERVER_PORT=8081

DICOM_STORE_ROOTPATH="C:/"  #The root path that DICOMweb STOW to store 
DICOMWEB_HOST="localhost" 
DICOMWEB_PORT=8081
DICOMWEB_API="dicom-web"

FHIRSERVER_APIPATH="api/fhir"
FHIRSERVER_HOST="localhost"
FHIRSERVER_PORT=8081
FHIR_NEED_PARSE_PATIENT=true #STOW will generate Patient data using DICOMTag. If you want custom FHIR patient , please change to false.

USE_CONDA=false
CONDA_PATH="C:\\Users\\chinHPlaptop\\anaconda3\\Scripts\\conda.exe"
CONDA_GDCM_ENV_NAME="gdcm"

USE_DCM2JPEG_PYTHONAPI=true
DCM2JPEG_PYTHONAPI_HOST="127.0.0.1"
DCM2JPEG_PYTHONAPI_PORT=5000
```

### Client Configuration
- Config path : `public/scripts/config.js`
- Change all hostname and port with your server config.
```javascript
var envConfig = {
    QIDO : {
        hostName :'127.0.0.1' , 
        port : '9090' , 
        api : 'dicom-web' , 
        http : "http" //http or https
    } , 
    WADO : {
        hostName : '127.0.0.1' ,
        port : '9090' , 
        api : 'dicom-web' ,
        http : "http"
    } , 
    FHIR : {
        hostName : '127.0.0.1' , 
        port : '9090' , 
        api : 'api/fhir' , 
        http : "http"
    },
    login: {
        enable: false, // enable login or not
        jwt: false // enable for storing token, checking token from backend, and login by token
    },
    backend: {
        baseUrl: "http://localhost:8081" // The base url of login backend (Raccoon)
    }
}
```
* A simple web-based user interface is provided to manage the DICOM objects in Raccoon.
* For DICOMWeb client, Raccoon can integrate with <a href="https://github.com/cylab-tw/bluelight/">BlueLight</a>, a lightweight Web-based DICOM Viewer.

### Plugins Configuration
Raccoon has some plugins such as OAuth, username/password login etc.
- Please see [Plugins Configuration](plugins/README.md)
> **Note**
>
> If you don't want to use plugins, just copy `plugins/config.template.js` and rename to `plugins/config.js`


## Deploy
### With Node.JS
```bash
node server
```

---

## Deploy with docker-compose
- The docker-compose example already in project root path.

Example:
```yml
version: '3.4'
services:
  mongodb:
    image: mongo:4.2
    container_name : mongodb
    restart: always
    ports:
      - 27017:27017
    volumes:
      - ./mongodb/db:/data/db
    environment:
      # provide your credentials here
      - MONGO_INITDB_DATABASE=admin
      - MONGO_INITDB_ROOT_USERNAME=root
      - MONGO_INITDB_ROOT_PASSWORD=Raccoon#Admin2Mongo
      - MONGO_PORT=27017
  raccoon:
    build:
      context : ./
      dockerfile : Dockerfile
    container_name: raccoon
    command: >
      /bin/sh -c '
      while ! nc -z mongodb 27017;
      do
        echo "waiting for database ...";
        sleep 3;
      done;
      echo "db is ready!";
      npm install;
      pm2-runtime start ecosystem.config.js --node-args="--max-old-space-size=4096";
      '
    volumes :
      - ./:/nodejs/raccoon
      - ./raccoon-storage:/dicomFiles
      - ./raccoon-null/node_modules:/nodejs/raccoon/node_modules
      - ./raccoon-null/build:/nodejs/raccoon/build
      - ./raccoon-null/models:/nodejs/raccoon/models/dcmtk/linux-lib
    ports:
      - 8081:8081
    depends_on:
      - mongodb
    tty : true
    restart: on-failure:3
    stdin_open : true
```
#### Set-up
```bash
docker-compose up -d
```

---
## Usage
### DICOMweb
QIDO-RS、WADO-RS、STOW-RS : `/dicom-web/studies`

WADO-URI : `/api/dicom/wado`

### FHIR

base : `/api/fhir/{resource}`
metadata : `/api/fhir/metadata`

---
## About
* Raccoon支援DICOMWeb標準傳輸協定，包含QIDO-RS, WADO-RS, WADO-URI, STOW等。
* 支援各種Transfer Syntax 以及SOP Class影像
* 通過台灣醫學資訊聯測 MI-TW 2020 - 項目: Track #4 - 醫學影像影像 DICOMWeb Query/Retrieve Source
* 通過台灣醫學資訊聯測 MI-TW 2021 - 項目: Track #6 - 數位病理影像 DICOMWeb Query/Retrieve Source

## Key Features
### Cybersecurity
* JSON Web Token(JWT) authentication
* ID/Password login

### DICOMWeb capabilities
* Raccoon supports the following DICOMWeb API
  - metadata (JSON)
  - QIDO-RS: (JSON)
  - WAOD-RS
  - WADO-URI: supported both: DICOM and JPEG
  - STOW-RS

### FHIR Resources
* Raccoon can act a FHIR server supporting the following FHIR resources and FHIR API which can be found in FHIR **metadata** services
  - **patient** 
  - **organization**
  - **ImagingStudy**
  - **endpoint**
* **Note**: Raccoon is focused on medical imaging-related resources, not all FHIR resources, built on the top of the [Simple-Express-FHIR-Server](https://github.com/Chinlinlee/Simple-Express-FHIR-Server). If you are interesting in FHIR soultion, please visit [Simple-Express-FHIR-Server](https://github.com/Chinlinlee/Simple-Express-FHIR-Server).

## Supported SOP Classes (particular)
### Image
* General image storages, e.g., CT, MR, X-ray, etc.
* Multiframe Image Storage - partical support
* Specifal SOP Class: VL Microscopic Image Storage: [DICOM WSI](http://dicom.nema.org/Dicom/DICOMWSI/)
  
### Non-Image
* GSPS, Segementation, SR, etc.   
* Supplement 222: Whole Slide Microscopy Bulk Annotations Storage SOP Class

## Supported library
* Raccoon DICOM Server uses several open source libraries as following:
  - <a href="https://github.com/DCMTK/dcmtk">dcmtk</a> use dcm2json to generating DICOM json and use dcmj2pnm to create jpeg image.
  - <a href="http://gdcm.sourceforge.net/">gdcm</a> and <a href="https://pydicom.github.io">pydicom</a> convert DICOM JPEG2000 to jpeg for the retrieve option of the WADO-URI service

## Related toolkits
* <a href="https://www.npmjs.com/package/fhir-mongoose-schema-generator/">fhir-mongoose-schema-generator</a>. It can generate the collection's schema in MongoDB from mapping to FHIR resources used in Raccoon automatically.
* Raccoon provides a tool to convert DICOM objects included in a study to a FHIR ImagingStudy resources stored as a MononDB document.
* We hava another [FHIR Server](https://github.com/cylien/Simple-Express-FHIR-Server), is designed to creating a tiny FHIR server supported specified FHIR resources.

# Roadmap
* Dockerize
* DICOM Protocol: C-ECHO SCP, C-STORE SCP, C-MOVE SCP.
* IHE Invoke Image Display (IID) Profile [RAD-106]
* DICOM Supplement 219 - JSON Representation of DICOM Structured Reports. Referenced standard: [DICOM Sup 219](https://www.dicomstandard.org/News-dir/ftsup/docs/sups/Sup219.pdf)
* Write a new proposal of FHIR Implementation Guide of Raccoon modified from FHIR ImagingStudy Core Resource which lacks many tags commonly used in PACS.
  
# Acknowledgement
* This project is supported by a grant from the Ministry of Science and Technology Taiwan.
* Thanks [琦雯Queenie](https://www.cakeresume.com/Queenie0814?locale=zh-TW), [Queenie's github](https://github.com/Queenie0814) for contributing the logo design. 
