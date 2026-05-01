// Phone detection worker using completely isolated TFJS instance
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js');
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');

let model = null;

// Initialize model on CPU backend (since we don't have WebGL guaranteed in basic Workers)
tf.setBackend('cpu').then(() => {
  return cocoSsd.load({ base: 'lite_mobilenet_v2' });
}).then(loadedModel => {
  model = loadedModel;
  postMessage({ type: 'STATUS', status: 'ready' });
}).catch(err => {
  postMessage({ type: 'STATUS', status: 'error', error: err.message });
});

onmessage = async (e) => {
  // If model isn't ready or we got a bad message, ignore
  if (!model || !e.data || !e.data.imageData) return;

  try {
    const predictions = await model.detect(e.data.imageData);
    postMessage({ type: 'RESULT', predictions });
  } catch (err) {
    postMessage({ type: 'STATUS', status: 'error', error: err.message });
  }
};
