from flask import Flask, request, jsonify
from PIL import Image
from inky import Inky_Impressions_7
import io
import traceback

app = Flask(__name__)

@app.route('/display', methods=['POST'])
def display_image():
    try:
        print('Request received')
        if 'image' not in request.files:
            print('No image in request')
            return jsonify({'error': 'No image provided'}), 400

        file = request.files['image']
        print('Opening image...')
        img = Image.open(file.stream)
        print(f'Image size: {img.size}, mode: {img.mode}')

        print('Initialising Inky...')
        inky = Inky_Impressions_7()
        print(f'Inky resolution: {inky.resolution}')

        print('Resizing image...')
        img = img.resize(inky.resolution)

        print('Setting image...')
        inky.set_image(img, saturation=0.5)

        print('Showing...')
        inky.show()

        print('Done!')
        return jsonify({'status': 'ok'})

    except Exception as e:
        print('ERROR:', str(e))
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
