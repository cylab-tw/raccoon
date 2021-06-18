from __future__ import print_function
import flask
from flask import *
from werkzeug.utils import secure_filename

import DICOM2JPEG

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
    statu = DICOM2JPEG(filename , 'jpg')
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
