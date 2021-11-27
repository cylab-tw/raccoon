<div> 
  <div style="float: left;width: 15%;"><img src="https://repository-images.githubusercontent.com/314441601/8e680180-33da-11eb-8da5-266f5636f213" width="90px"></div>
  <div style="float: left;width: 85%;"><h1>Raccoon - Web-based DICOMWeb & FHIR ImagingStudy Server</h1> 
</div>

**Raccoon** is a noSQL-based medical image archive for managing the DICOM images is primarily maintained by the [Imaging Informatics Labs](https://cylab.dicom.tw). It uses the MongoDB to manage the DICOM images and provide RESTful API, supported both FHIR ImagingStudy and [DICOMweb](https://www.dicomstandard.org/dicomweb/") to store, query/retrieve, and manage DICOM images.  Raccoon is bulit on the top of the [Burni FHIR Server](https://github.com/Chinlinlee/Burni) to manage the FHIR resourcs related to medical images 

## Install
* Before starting Raccoon, MongoDB,imagemagick must be installed.
* This project uses the submodule with <a href="https://github.com/cylab-tw/bluelight/">BlueLight</a>. If you want to use it, run `git submodule init` and `git submodule update` when the first time.

After installation and configure. 
run `node server.js`

### Windows
#### Test OS
- Windows 10 64bits
#### requirement
- **MongoDB**
- **Anaconda**
- **GDCM enviroment in Anaconda** (Use pydicom==1.1.0)
- **[imagemagick](https://imagemagick.org/script/download.php)**

```bash
npm install
npm run build #This will download dcmtk executable binaries to ./models/dcmtk and generate example dotenv file.
```
### Linux
#### Test OS
- Ubuntu v20.4
#### requirement
- **MongoDB**
- **GDCM** (Use pydicom==1.1.0)
- imagemagick
>```bash
>sudo apt-get install imagemagick #ubuntu
>```

```bash
npm install
npm run build #This will download dcmtk using apt-get install and generate example dotenv file.
```
### dotenv Configuration
```bash
ENV = 'windows'  #input the os type. enum: windows , linux

MONGODB_NAME="Micala" 
MONGODB_HOSTS=["mongodb"]
MONGODB_PORTS=[27017]
MONGODB_USER="user"
MONGODB_PASSWORD="password"
MONGODB_SLAVEMODE=false


SERVER_HOST="localhost"
SERVER_PORT=80

DICOM_STORE_ROOTPATH="C:/"  #The root path that DICOMweb STOW to store 
DICOMWEB_HOST = "localhost" 
DICOMWEB_PORT =80
DICOMWEB_API ="dicom-web"

FHIRSERVER_APIPATH = "api/fhir"
FHIRSERVER_HOST = "localhost"
FHIRSERVER_PORT = "80"
FHIR_NEED_PARSE_PATIENT = true #STOW will generate Patient data using DICOMTag. If you want custom FHIR patient , please change to false.

CONDA_PATH = "C:\\Users\\chinHPlaptop\\anaconda3\\Scripts\\conda.exe"
CONDA_GDCM_ENV_NAME = "gdcm"

USE_DCM2JPEG_PYTHONAPI = true
DCM2JPEG_PYTHONAPI_PORT = 5000
```

## Client Configuration
Config path : `public/scripts/config.js`
Change all hostname and port with your server config.
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
    }
}
```
* A simple web-based user interface is provided to manage the DICOM objects in Raccoon.
* For DICOMWeb client, Raccoon can integrate with <a href="https://github.com/cylab-tw/bluelight/">BlueLight</a>, a lightweight Web-based DICOM Viewer.

## usage

### DICOMweb
QIDO-RS、WADO-RS、STOW-RS : `/dicom-web/studies`

WADO-URI : `/api/dicom/wado`

### FHIR

base : `/api/fhir/{resource}`
metadata : `/api/fhir/metadata`

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
* **Note**: Raccoon is focused on medical imaging-related resources, not all FHIR resources, bulit on the top of the [Simple-Express-FHIR-Server](https://github.com/Chinlinlee/Simple-Express-FHIR-Server). If you are interesting in FHIR soultion, please visit [Simple-Express-FHIR-Server](https://github.com/Chinlinlee/Simple-Express-FHIR-Server).

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
