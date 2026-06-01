from flask import Flask, request, jsonify
from PIL import Image
from inky.auto import auto
import io

app = Flask(__name__)

@app.route('/display', methods=['POST'])
def display_image():

    file = request.files['image']
    img = Image.open(file.stream)

    inky = auto()  
    img = img.resize(inky.resolution) 
    inky.set_image(img, saturation=0.5)
    inky.show()

    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 
