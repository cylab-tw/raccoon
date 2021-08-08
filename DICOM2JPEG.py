import matplotlib.pyplot as plt
import io
from pydicom import *
import os
from cv2 import cv2 as cv2
import gdcm
import numpy as np
import sys
from PIL import Image
import pydicom.pixel_data_handlers.gdcm_handler as gdcmHandler
import pydicom
import time




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

def saveImage(ds, imageArray, saveName):
    tStart = time.time()
    saveStatu = False
    #https://blog.csdn.net/appleyuchi/article/details/102388184
    if hasattr(ds , 'WindowCenter') and hasattr(ds , 'WindowWidth'):
        window_center, window_width, intercept, slope = get_windowing(ds)
        img = window_image(imageArray, window_center, window_width, intercept, slope , ds)
        plt.imsave(saveName , img, cmap='gray')
        return True
    pass

    image_2d = imageArray.astype(float)
    image_2d_scaled = (np.maximum(image_2d, 0) / image_2d.max()) * 255.0
    # https://gitee.com/ocen/dcm_to_png
    # https://stackoom.com/question/11O7R/DICOM%E6%A0%87%E5%87%86MONOCHROME-%E5%92%8CMONOCHROME-%E4%B8%AD%E7%9A%84%E5%9B%BE%E5%83%8F%E7%B1%BB%E5%9E%8B
    # PhotometricInterpretation == MONOCHROME1 時須invert將亮跟暗反轉 MONOCHROME1為正常
    if hasattr(ds, 'PhotometricInterpretation'):
        if ds.PhotometricInterpretation == 'MONOCHROME1':
            image_2d_scaled = 255.0 - image_2d_scaled
            print(1)
        pass
    pass
    image_2d_scaled = image_2d_scaled.astype(np.uint8)
    if hasattr(ds, 'PhotometricInterpretation'):
        if 'YBR' in ds.PhotometricInterpretation:
            RGBImg = pydicom.pixel_data_handlers.convert_color_space(image_2d_scaled, ds.PhotometricInterpretation,
                                                                     'RGB')
            # YBR2BGRImg = cv2.cvtColor(imageArray, cv2.COLOR_YUV2RGB_Y422 )
            RGB2BGRImg = cv2.cvtColor(RGBImg, cv2.COLOR_RGB2BGR)
            saveStatu = cv2.imwrite(saveName, RGB2BGRImg)
        elif 'RGB' in ds.PhotometricInterpretation:
            RGB2BGRImg = cv2.cvtColor(image_2d_scaled, cv2.COLOR_RGB2BGR)
            saveStatu = cv2.imwrite(saveName, RGB2BGRImg)
        else:
            saveStatu = cv2.imwrite(saveName, image_2d_scaled)
        pass
    pass
    tEnd = time.time()
    print("save Image time :" , tEnd - tStart)
    return True
pass

# How to use
# python DICOM2JPEG.py inputFilename imageFormat TransferSyntaxUID
# default imageFormat is jpg
# default TransferSyntaxUID is 1.2.840.10008.1.2.1 (Explicit VR Little Endian)
def DICOM2JPEG(filename, imageFormat):
    # TransferSyntaxUID = '1.2.840.10008.1.2.1'

    ds = dcmread(filename)
    ds.pixel_data_handlers = [gdcmHandler]
    # ds.file_meta.TransferSyntaxUID = '1.2.840.10008.1.2.1'
    shape = ds.pixel_array.shape
    #print(shape)
    if len(shape) >= 3:
        if (shape[0] != ds.Rows or shape[1] != ds.Columns or shape[2] != ds.SamplesPerPixel):
            for i in range(0, shape[0]):
                dumpfile = filename.replace('.dcm', '')
                dumpfile = f'{dumpfile}.{str(i)}.{imageFormat}'
                # ds.pixel_array[i] = convert_color_space(ds.pixel_array[i] , 'YBR_FULL', 'RGB')
                # cv2.imwrite(dumpfile, ds.pixel_array[i])

                saveStatu = saveImage(ds, ds.pixel_array[i], dumpfile)
                if not saveStatu:
                    return False
                pass
            pass
        pass
        return True
    else:
        dumpfile = filename.replace('.dcm', f'.{imageFormat}')
        saveStatu = saveImage(ds, ds.pixel_array, dumpfile)
        if not saveStatu:
            return False
        pass
        return True
    pass


pass

if __name__ == '__main__':
    filename = sys.argv[1]
    imageFormat = "jpg"
    try:
        imageFormat = sys.argv[2]
    except:
        imageFormat = "jpg"
    pass
    tStart = time.time()
    statu = DICOM2JPEG(filename, imageFormat)
    tEnd = time.time()
    print("process time:" , tEnd - tStart)
    if statu:
        print(1)
    else:
        print(0)
    pass
pass

# https://stackoverflow.com/questions/44629403/how-to-set-window-width-and-window-center-while-convert-a-dicom-file-to-a-jpg-fi
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
# image_uint8 = rescale.astype(np.uint8)

sys.modules[__name__] = DICOM2JPEG
