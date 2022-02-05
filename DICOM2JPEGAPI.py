from __future__ import print_function
import flask
from flask import *
from werkzeug.utils import secure_filename

import DICOM2JPEGFrame

app = flask.Flask(__name__)
app.config["DEBUG"] = False
@app.route('/' , methods=['GET'])
def home():
    result = {"status" : str(True)}
    return result
pass

@app.route('/dcm2jpeg', methods=['POST'])
def convert2jpeg():
    filename = request.values.get('filename')
    frameNumber = int(request.values.get('frameNumber'))
    statu = DICOM2JPEGFrame(filename ,frameNumber-1)
    result = {"status" : str(statu)}
    return result
pass
port = 5000
try:
    port = sys.argv[1]
except:
    port = 5000
app.run(host="0.0.0.0" , port=port)
print('set up flase success')
