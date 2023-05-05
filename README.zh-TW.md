<div> 
  <div style="float: left;width: 15%;"><img src="https://repository-images.githubusercontent.com/314441601/8e680180-33da-11eb-8da5-266f5636f213" width="90px"></div>
  <div style="float: left;width: 85%;"><h1>Raccoon - Web-based DICOMWeb & FHIR ImagingStudy Server</h1> 
</div>

[English](README.md) | [繁體中文](README.zh-TW.md)

---
**Raccoon** 是使用 no-SQL 資料庫實作的醫學影像儲存系統(DICOMweb PACS)，目前主要由[北護影像資訊學實驗室](https://cylab.dicom.tw)維護。 Raccoon 使用 MongoDB 管理 DICOM 影像並提供 [DICOMweb](https://www.dicomstandard.org/dicomweb/") 以及 FHIR ImagingStudy RESTful API 功能進行儲存、查詢、調閱。
另外 Raccoon 使用了 [Burni FHIR Server](https://github.com/Chinlinlee/Burni)為底延伸出 FHIR 與 DICOM 結合的功能。

---
## 安裝
* 請注意！在使用 Raccoon 前，務必安裝 MongoDB、ImageMagick
* Raccoon 在 git submodule 額外使用了 <a href="https://github.com/cylab-tw/bluelight/">BlueLight</a> 作為 Raccoon 的 DICOM Viewer。如果您想擴充 DICOM Viewer的功能請運行 `git submodule init` 指令 `git submodule update` 安裝 BlueLight
* [Node.js](https://nodejs.org/en/download/) >= 14
* Python >= 3.7
### Windows
> :yellow_heart::yellow_heart::yellow_heart:<br>
> 您可以跟隨<a href="https://chinlinlee.github.io/po2Aka.html">完整安裝教學</a>的步驟安裝 Raccoon 🎉 <br>
> 此篇教學列出了每項必要軟體的安裝步驟、 Raccoon 的詳細設定、 Raccoon 的部屬以及 Raccoon 的測試方法 <br>
> 😄 <b>對新手來講是一篇非常有好的教學！</b> 😄
#### Test OS
- Windows 10 64bits
#### 必要軟體
- [**MongoDB**](https://www.mongodb.com/try/download/community) >= 4.0
- **Anaconda** (非必要))
- **GDCM environment in Anaconda** (當您使用Anaconda時，請務必確認環境支援 GDCM)
- **[imagemagick](https://imagemagick.org/script/download.php)**
#### 安裝依賴
- 進到專案根目錄並使用 cmd 執行以下指令:
```bash
npm install
npm run build #此指令會下載 dcmtk 執行檔到 ./models/dcmtk 並產生 dotenv 檔案範例.
pip install -r requirements.txt #安裝 Python 相依性套件
```

> 💙💙💙 <br>
> 如果您是 Windows 的使用者，並已經結束安裝的步驟，您可以往下閱讀<a href="#configuration">Configuration</a> & <a href="#deploy">Deploy</a>的說明

### Linux
#### Test OS
- Ubuntu v21.10
#### 必要軟體
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
- 進到專案根目錄並使用 cmd 執行以下指令:
```bash
sudo apt-get install dcmtk
npm install
npm run build #This will download dcmtk using apt-get install and generate example dotenv file.
pip install -r requirements.txt #安裝 Python 相依性套件
```
#### Troubleshooting
- `Unknown VR: Tag not found in data dictionary` when using `STOW-RS`
    - 您必須設定 `DCMDICTPATH` 環境變數
    - `dicom.dic` 檔案可以在`/usr/share/libdcmtk{version}`找到
    > {version} 對應到dcmtk的版本, e.g. 3.6.5 => libdcmtk15

    - 使用指令設定 `DCMDICTPATH` 或者您可以將指令加入到profile檔案中(`~/.bashrc`,`~/.profile` etc.), example **with dcmtk 3.6.5**:
    ```sh
    export DCMDICTPATH=/usr/share/libdcmtk15/dicom.dic
    ```
    - 檢查環境變數
    ```sh
    echo $DCMDICTPATH
    ```

---

## 設定
### Server dotenv
- `.env` 檔案位於專案根目錄
- 您可以參考 `.env.template` 進行修改
```bash
ENV='windows'  #input the os type. enum: windows , linux

MONGODB_NAME="Raccoon" 
MONGODB_HOSTS=["mongodb"]
MONGODB_PORTS=[27017]
MONGODB_USER="user"
MONGODB_PASSWORD="password"
MONGODB_OPTIONS=""


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

### 前端 web 設定
- 設定檔路經 : `public/scripts/config.js`
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
        enable: false, // 是否啟動 login 功能
        jwt: false // 是否儲存 token、檢查 token、使用 token 登入
    },
    backend: {
        baseUrl: "http://localhost:8081" // 登入功能的後端前綴網址 (Raccoon)
    }
}
```
* 使用者介面提供簡單的管理功能管理 Raccoon 內的影像
* For DICOMWeb client, Raccoon can integrate with <a href="https://github.com/cylab-tw/bluelight/">BlueLight</a>, a lightweight Web-based DICOM Viewer.

## 部屬
### 使用 Node.JS
```bash
node server
```

---

## 使用 docker-compose
- 您可以在專案的根目錄找到 docker-compose 的範例檔

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
