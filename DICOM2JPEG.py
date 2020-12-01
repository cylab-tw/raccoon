from pydicom import *
import os
from cv2 import cv2 as cv2
import gdcm
#from pydicom.pixel_data_handlers.util import *
import numpy as np
import sys
import pydicom


def saveImage(ds ,imageArray , saveName):
    image_2d = imageArray.astype(float)
    image_2d_scaled = (np.maximum(image_2d,0) / image_2d.max()) * 255.0
    #https://gitee.com/ocen/dcm_to_png
    #https://stackoom.com/question/11O7R/DICOM%E6%A0%87%E5%87%86MONOCHROME-%E5%92%8CMONOCHROME-%E4%B8%AD%E7%9A%84%E5%9B%BE%E5%83%8F%E7%B1%BB%E5%9E%8B
    #PhotometricInterpretation == MONOCHROME1 時須invert將亮跟暗反轉 MONOCHROME1為正常
    if hasattr(ds, 'PhotometricInterpretation'):
        if ds.PhotometricInterpretation == 'MONOCHROME1':
            image_2d_scaled = 255.0 - image_2d_scaled
        pass
    pass
    image_2d_scaled = image_2d_scaled.astype(np.uint8)
    saveStatu = cv2.imwrite(saveName , image_2d_scaled)
    return saveStatu
pass
#How to use
#python DICOM2JPEG.py inputFilename imageFormat TransferSyntaxUID
#default imageFormat is jpg
#default TransferSyntaxUID is 1.2.840.10008.1.2.1 (Explicit VR Little Endian)
filename =  sys.argv[1]
imageFormat = "jpg"
TransferSyntaxUID = '1.2.840.10008.1.2.1'
try:
    imageFormat = sys.argv[2]
except :
    imageFormat = "jpg"

ds = dcmread(filename)
ds.file_meta.TransferSyntaxUID  = '1.2.840.10008.1.2.1'
shape = ds.pixel_array.shape
image_2d_scaled = 0
if len(shape) >=3 :
    for i in range(0 , shape[0]) :
        dumpfile = filename.replace('.dcm' , '')
        dumpfile = f'{dumpfile}_frame_{str(i)}.{imageFormat}'
        saveStatu = saveImage(ds , ds.pixel_array[i] , dumpfile)
        if saveStatu == True:
            print('save success')
        pass
        print(saveStatu)
    pass
else : 
    dumpfile = filename.replace('.dcm' , f'.{imageFormat}')
    saveStatu = saveImage(ds , ds.pixel_array , dumpfile)
    if saveStatu == True:
        print('save success')
    pass
    print(saveStatu)
pass


#https://stackoverflow.com/questions/44629403/how-to-set-window-width-and-window-center-while-convert-a-dicom-file-to-a-jpg-fi
# if windowCenter == 0 and windowWidth ==0 :
    
# else :
#     print(windowCenter)
#     print(windowWidth)
#     minWindow = float(windowCenter) - 0.5*float(windowWidth)
#     newimg = (image_2d - minWindow) / float(windowWidth)
#     newimg[newimg < 0] = 1
#     newimg[newimg > 1] = 0
#     image_2d_scaled = (newimg * 255.0)
#     image_2d_scaled = (255.0 - image_2d_scaled)
# pass

# 轉型為 uint8 型別
#image_uint8 = rescale.astype(np.uint8)

