from flask import Flask, request, jsonify, render_template
import cv2
import numpy as np
import os
import logging

app = Flask(__name__)

# Set up logging for debugging
logging.basicConfig(level=logging.DEBUG)

# YOLO Configuration
YOLO_CONFIG = os.path.join(os.getcwd(), "yolov3.cfg")
YOLO_WEIGHTS = os.path.join(os.getcwd(), "yolov3.weights")
YOLO_CLASSES = os.path.join(os.getcwd(), "coco.names")

# Sample nutrition data per 100g
nutrition_data = {
    "apple": {"calories": 52, "carbs": 14, "protein": 0.3, "fat": 0.2, "fiber": 2.4, "vitamin_c": 4.6, "potassium": 107},
    "banana": {"calories": 89, "carbs": 23, "protein": 1.1, "fat": 0.3, "fiber": 2.6, "vitamin_c": 8.7, "potassium": 358},
    "carrot": {"calories": 41, "carbs": 10, "protein": 0.9, "fat": 0.2, "fiber": 2.8, "vitamin_c": 5.9, "potassium": 320},
    "broccoli": {"calories": 55, "carbs": 11, "protein": 3.7, "fat": 0.6, "fiber": 2.6, "vitamin_c": 89.2, "potassium": 316},
    "potato": {"calories": 77, "carbs": 17, "protein": 2, "fat": 0.1, "fiber": 2.2, "vitamin_c": 19.7, "potassium": 429},
    "orange": {"calories": 47, "carbs": 12, "protein": 0.9, "fat": 0.1, "fiber": 2.4, "vitamin_c": 53.2, "potassium": 181},
}

# Load YOLO model
net = cv2.dnn.readNet(YOLO_WEIGHTS, YOLO_CONFIG)
with open(YOLO_CLASSES, "r") as f:
    classes = f.read().strip().split("\n")


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload_images():
    if 'image' not in request.files or 'weight' not in request.form:
        return jsonify({"error": "Image and weight are required"}), 400

    files = request.files.getlist('image')  # Retrieve multiple files
    weight = request.form.get('weight', type=float)  # Get weight from form

    if not files or weight <= 0:
        return jsonify({"error": "Invalid image or weight"}), 400

    upload_folder = "static/uploads"
    os.makedirs(upload_folder, exist_ok=True)  # Ensure the uploads directory exists

    detections_list = []
    nutrition_list = []
    total_nutrition = {"calories": 0, "macros": {"Carbs": 0, "Protein": 0, "Fat": 0, "Fiber": 0}, "micros": {"Vitamin C": 0, "Potassium": 0}}

    for file in files:
        if file.filename == '':
            continue

        file_path = os.path.join(upload_folder, file.filename)
        try:
            file.save(file_path)
            logging.debug(f"File saved at: {file_path}")
            detections, nutrition = detect_objects(file_path, weight)

            detections_list.append({
                "filename": file.filename,
                "detections": detections
            })
            nutrition_list.append({
                "filename": file.filename,
                "nutrition": nutrition
            })

            # Sum nutrition values from the current image
            total_nutrition["calories"] += nutrition["total_calories"]
            for macro in nutrition["macros"]:
                total_nutrition["macros"][macro] += nutrition["macros"][macro]
            for micro in nutrition["micros"]:
                total_nutrition["micros"][micro] += nutrition["micros"][micro]

        except Exception as e:
            logging.error(f"Failed to process file {file.filename}: {str(e)}")
            return jsonify({"error": f"Failed to process file {file.filename}: {str(e)}"}), 500

    return jsonify({"detections": detections_list, "nutrition": nutrition_list, "total_nutrition": total_nutrition})


def detect_objects(image_path, weight):
    image = cv2.imread(image_path)
    height, width, _ = image.shape
    blob = cv2.dnn.blobFromImage(image, 1 / 255.0, (416, 416), swapRB=True, crop=False)
    net.setInput(blob)
    output_layers = [net.getLayerNames()[i - 1] for i in net.getUnconnectedOutLayers()]
    layer_outputs = net.forward(output_layers)

    conf_threshold = 0.5
    nms_threshold = 0.4
    boxes = []
    confidences = []
    labels = []

    for output in layer_outputs:
        for detection in output:
            scores = detection[5:]
            class_id = np.argmax(scores)
            confidence = scores[class_id]
            if confidence > conf_threshold:
                box = detection[:4] * np.array([width, height, width, height])
                (center_x, center_y, w, h) = box.astype("int")
                x = int(center_x - w / 2)
                y = int(center_y - h / 2)
                boxes.append([x, y, int(w), int(h)])
                confidences.append(float(confidence))
                labels.append(classes[class_id])

    indices = cv2.dnn.NMSBoxes(boxes, confidences, conf_threshold, nms_threshold)

    detected_items = []
    if len(indices) > 0:
        for i in indices.flatten():
            detected_items.append(labels[i])

    nutrition_summary = calculate_nutrition(detected_items, weight)
    return detected_items, nutrition_summary


def calculate_nutrition(detections, weight):
    total_calories = 0
    macros = {"Carbs": 0, "Protein": 0, "Fat": 0, "Fiber": 0}
    micros = {"Vitamin C": 0, "Potassium": 0}

    for label in detections:
        if label in nutrition_data:
            item_data = nutrition_data[label]
            factor = weight / 100  # Scale nutrition per 100g
            total_calories += item_data["calories"] * factor
            macros["Carbs"] += item_data["carbs"] * factor
            macros["Protein"] += item_data["protein"] * factor
            macros["Fat"] += item_data["fat"] * factor
            macros["Fiber"] += item_data["fiber"] * factor
            micros["Vitamin C"] += item_data["vitamin_c"] * factor
            micros["Potassium"] += item_data["potassium"] * factor

    return {
        "total_calories": round(total_calories, 2),
        "macros": {k: round(v, 2) for k, v in macros.items()},
        "micros": {k: round(v, 2) for k, v in micros.items()}
    }


if __name__ == "__main__":
    app.run(debug=True)
