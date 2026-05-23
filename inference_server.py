"""
RoadSoS AI — Model Inference Server
Runs as a lightweight HTTP server alongside Next.js.
Loads the .keras model once and serves predictions.

Classes (index → label):
  0 = Minor
  1 = Serious  
  2 = Critical
(Adjust CLASS_LABELS order below if your training used a different order)
"""

import json, base64, io, os, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
import numpy as np

# ── Try loading keras ────────────────────────────────────────────────────────
try:
    os.environ["KERAS_BACKEND"] = "jax"   # jax is lighter than tensorflow
    import keras
    KERAS_AVAILABLE = True
except ImportError:
    try:
        import tensorflow as tf
        import tensorflow.keras as keras  # type: ignore
        KERAS_AVAILABLE = True
    except ImportError:
        KERAS_AVAILABLE = False

MODEL_PATH = os.environ.get(
    "MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "model", "roadsos_accident_severity_model.keras")
)

# ── Class labels — match your training data label order ─────────────────────
# MobileNetV2 + 3-class softmax → adjust if your classes are ordered differently
CLASS_LABELS = ["Minor", "Serious", "Critical"]   # index 0, 1, 2

IMG_SIZE = (224, 224)

model = None

def load_model():
    global model
    if not KERAS_AVAILABLE:
        print("[inference] Keras/TF not available — running in stub mode", flush=True)
        return
    try:
        print(f"[inference] Loading model from {MODEL_PATH} ...", flush=True)
        model = keras.models.load_model(MODEL_PATH)
        print("[inference] Model loaded ✓", flush=True)
    except Exception as e:
        print(f"[inference] Model load failed: {e}", flush=True)
        model = None


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Decode image bytes → (1, 224, 224, 3) float32 array."""
    from PIL import Image
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize(IMG_SIZE)
    arr = np.array(img, dtype=np.float32)          # (224,224,3)
    arr = np.expand_dims(arr, axis=0)               # (1,224,224,3)
    # MobileNetV2 preprocessing: normalize to [-1, 1]
    # The model config shows TrueDivide + Subtract layers doing this internally,
    # so we just pass raw [0,255] pixels and let the graph handle it.
    return arr


def predict(image_bytes: bytes) -> dict:
    """Run model inference. Returns severity label, score 1-10, confidence %."""
    if model is None:
        # Stub — lets the app work even without keras installed
        return {"severity": "Serious", "score": 5, "confidence": 60, "stub": True,
                "probabilities": {"Minor": 0.2, "Serious": 0.5, "Critical": 0.3}}

    arr = preprocess_image(image_bytes)
    probs = model.predict(arr, verbose=0)[0]        # (3,)

    idx  = int(np.argmax(probs))
    conf = int(round(float(probs[idx]) * 100))
    label = CLASS_LABELS[idx]

    # Map class → severity score 1-10
    score_map = {"Minor": 3, "Serious": 6, "Critical": 9}
    # Blend with confidence for a more granular score
    base = score_map[label]
    score = max(1, min(10, base + round((conf - 70) / 30)))

    return {
        "severity":  label,
        "score":     score,
        "confidence": conf,
        "stub": False,
        "probabilities": {
            CLASS_LABELS[i]: round(float(probs[i]), 4) for i in range(len(CLASS_LABELS))
        }
    }


# ── HTTP Handler ─────────────────────────────────────────────────────────────
class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # silence default logging

    def send_json(self, code: int, data: dict):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self.send_json(200, {
                "status": "ok",
                "model_loaded": model is not None,
                "keras_available": KERAS_AVAILABLE,
            })
        else:
            self.send_json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/predict":
            self.send_json(404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))

            # Accept base64-encoded image OR raw bytes would come as base64 anyway
            img_b64 = body.get("image_base64", "")
            if not img_b64:
                self.send_json(400, {"error": "image_base64 required"})
                return

            image_bytes = base64.b64decode(img_b64)
            result = predict(image_bytes)
            self.send_json(200, result)
        except Exception as e:
            self.send_json(500, {"error": str(e)})


if __name__ == "__main__":
    PORT = int(os.environ.get("INFERENCE_PORT", 8001))
    load_model()
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"[inference] Server listening on :{PORT}", flush=True)
    server.serve_forever()
