#coding:utf-8
import pydicom
import matplotlib.pyplot as plt
from PIL import Image, ImageOps
from io import BytesIO
import sys
import gdcm
import time
import numpy as np
from highdicom.io import ImageFileReader


def window_image(img, window_center, window_width, intercept, slope , ds):
    img = (img * slope + intercept)  # 灰度值轉化為ＣＴ輻射強度，轉化後的結果其實可以理解為"醫用像素值"
    img_min = window_center - window_width // 2  # ＂－＂後面的先計算
    img_max = window_center + window_width // 2
    #     下面其實是一個濾波器，過濾掉噪音
    img[img < img_min] = img_min
    img[img > img_max] = img_max
    if hasattr(ds, 'PhotometricInterpretation'):
        if ds.PhotometricInterpretation == 'MONOCHROME1':
            print('monochrome1')
            img = img.astype(float)
            img = 255 - img
        pass
    pass
    return img
pass

# 這裡img是一個二維矩陣


def get_first_of_dicom_field_as_int(x):
    # get x[0] as in int is x is a 'pydicom.multival.MultiValue', otherwise get int(x)
    if type(x) == pydicom.multival.MultiValue:  # 如果有很多个值
        return int(x[0])
    else:
        return int(x)
pass

def get_windowing(data):
    #     下面是獲取dicom各個參數
    dicom_fields = [data[('0028', '1050')].value,  # window center
                    data[('0028', '1051')].value,  # window width
                    data[('0028', '1052')].value,  # intercept
                    data[('0028', '1053')].value]  # slope
    #     上面(0028,1053)在dicom中稱為tag
    return [get_first_of_dicom_field_as_int(x) for x in dicom_fields]
pass

#https://github.com/pydicom/pydicom/pull/534


def DICOM2JPEGFrame(filename, frameNumber=0):
    # This is only used to find the position of the Pixel Data element
    ds = pydicom.filereader.dcmread(filename, stop_before_pixels=True)
    saveFilename  = filename.replace('.dcm', '')
    saveFilename = f'{saveFilename}.{str(frameNumber)}.jpg'
    with ImageFileReader(filename) as image:

        frame = image.read_frame(frameNumber)

        #handle the dicom that have window center and window width
        if hasattr(ds , 'WindowCenter') and hasattr(ds , 'WindowWidth'):
            window_center, window_width, intercept, slope = get_windowing(ds)
            img = window_image(frame, window_center, window_width, intercept, slope , ds)
            try:
                plt.imsave(saveFilename , img, cmap='gray')
                return True
            except Exception as err:
                print(err)
                return False
            pass
        pass

        try:
            #Handle YBR
            if hasattr(ds, 'PhotometricInterpretation'):
                if 'YBR' in ds.PhotometricInterpretation:
                    frameRaw = image.read_frame_raw(frameNumber)
                    imageFrameRaw = Image.open(BytesIO(frameRaw))
                    imageFrameRaw.save(saveFilename)
                    return True
                pass
            pass
            
            Image.fromarray(frame).save(saveFilename)   
            return True

        except Exception as err:
            print(err)
            return False
        pass

    pass

pass

if __name__ == '__main__':
    filename = sys.argv[1]
    imageFormat = "jpg"
    frameNumber = 1

    try:
        frameNumber = int(sys.argv[2])
    except:
        frameNumber = 1
    pass

    

    status = DICOM2JPEGFrame(filename, frameNumber-1)

pass

sys.modules[__name__] = DICOM2JPEGFrame