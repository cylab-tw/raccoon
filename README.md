# Raccoon
  . 
<h1>Raccoon Web-based DICOMWeb Server (Raccoon.net)</h1>
<p><strong>Raccoon</strong> is a noSQL-based medical image archive for managing the DICOM images is primarily maintained by the <a href="https://cylab.dicom.tw/">Imaging Informatics Labs</a>. It uses the MongoDB to manage the DICOM images and provide RESTful API, supported both <a href="https://www.dicomstandard.org/dicomweb/">DICOMweb</a> and <a href="https://www.hl7.org/fhir/imagingstudy.html/">FHIR ImagingStudy</a> to store, query/retrieve, and manage DICOM images.

## Install
* TODO.

## DICOMWeb Configuration
* TODO
* It can be integrated with <a href="https://github.com/cylab-tw/bluelight/">BlueLight</a>, a lightweight Web-based DICOM Viewer.
  
## About
* Raccoon支援DICOMWeb標準傳輸協定，包含QIDO-RS, WADO-RS, WADO-URI, STOW等。
* 支援各種Transfer Syntax 以及SOP Class影像
* 通過台灣醫學資訊聯測 MI-TW 2020 - 項目: WG4 - 影像DICOMWeb Query/Retrieve Source

## Key Features
### Network support
* QIDO-RS
* WAOD-RS
* WADO-URI: supported both: DICOM and JPEG
* FHIR ImagingStudy Query Retrieve. 

## Supported library
* Raccoon DICOM Server uses several open source libraries as following:
  - <a href="https://github.com/cornerstonejs">cornerstone</a> for reading, parsing DICOM-formatted data.
  - <a href="https://github.com/cornerstonejs/dicomParser">dicomParser</a> for parsing DICOM tags.
  - <a href="https://github.com/DCMTK/dcmtk">dcmtk</a> for generating DICOM json and converting DICOM to jpeg

## Related toolkits
* <a href="https://www.npmjs.com/package/fhir-mongoose-schema-generator/">fhir-mongoose-schema-generator</a>. It can generate the collection's schema in MongoDB from mapping to FHIR resources used in Raccoon automatically.
