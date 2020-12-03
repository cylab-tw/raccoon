<h1>Raccoon - Web-based DICOMWeb & FHIR ImagingStudy Server</h1>
<p><strong>Raccoon</strong> is a noSQL-based medical image archive for managing the DICOM images is primarily maintained by the <a href="https://cylab.dicom.tw/">Imaging Informatics Labs</a>. It uses the MongoDB to manage the DICOM images and provide RESTful API, supported both <a href="https://www.dicomstandard.org/dicomweb/">DICOMweb</a> and <a href="https://www.hl7.org/fhir/imagingstudy.html/">FHIR ImagingStudy</a> to store, query/retrieve, and manage DICOM images.

## Install
* before start Raccoon, MongoDB must be installed.

`npm install`

`node server.js`

## Client Configuration
* A simple web-based user interface is provided to manage the DICOM objects in Raccoon.
* For DICOMWeb client, Raccoon can integrate with <a href="https://github.com/cylab-tw/bluelight/">BlueLight</a>, a lightweight Web-based DICOM Viewer.
  
## About
* Raccoon支援DICOMWeb標準傳輸協定，包含QIDO-RS, WADO-RS, WADO-URI, STOW等。
* 支援各種Transfer Syntax 以及SOP Class影像
* 通過台灣醫學資訊聯測 MI-TW 2020 - 項目: WG4 - 影像DICOMWeb Query/Retrieve Source

## Key Features
### DICOMWeb capabilities
* Raccoon supports the following DICOMWeb API
  - metadata (JSON)
  - QIDO-RS: (JSON)
  - WAOD-RS
  - WADO-URI: supported both: DICOM and JPEG
  - STOW

### FHIR Resources
* Raccoon can act a FHIR server supporting the following FHIR resources and FHIR API which can be found in FHIR **metadata** services
  - **patient** 
  - **organization**
  - **ImagingStudy**
  - **endpoint**

## Supported library
* Raccoon DICOM Server uses several open source libraries as following:
  - <a href="https://github.com/cornerstonejs/dicomParser">dicomParser</a> for parsing DICOM tags.
  - <a href="https://github.com/DCMTK/dcmtk">dcmtk</a> use dcm2json to generating DICOM json
  - <a href="https://pydicom.github.io">pydicom</a> convert DICOM object to jpeg for the retrieve option of the WADO-URI service
## Related toolkits
* <a href="https://www.npmjs.com/package/fhir-mongoose-schema-generator/">fhir-mongoose-schema-generator</a>. It can generate the collection's schema in MongoDB from mapping to FHIR resources used in Raccoon automatically.
* Raccoon provides a tool to convert DICOM objects included in a study to a FHIR ImagingStudy resources stored as a MononDB document.
