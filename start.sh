#!/bin/bash
# RoadSoS AI — Start both servers

echo "🚀 Starting RoadSoS AI..."

# Start Python inference server in background
echo "🧠 Starting model inference server on :8001..."
MODEL_PATH="./model/roadsos_accident_severity_model.keras" \
INFERENCE_PORT=8001 \
python3 inference_server.py &

INFERENCE_PID=$!
echo "   Inference server PID: $INFERENCE_PID"

# Wait for inference server to be ready
echo "   Waiting for inference server..."
for i in {1..15}; do
  if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "   ✓ Inference server ready"
    break
  fi
  sleep 1
done

# Start Next.js
echo "⚡ Starting Next.js on :3000..."
npm run dev

# Cleanup on exit
trap "kill $INFERENCE_PID 2>/dev/null" EXIT
