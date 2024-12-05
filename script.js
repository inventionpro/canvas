let wsr;
let wsw;

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

let inp = document.querySelector('input');
inp.onchange = function() {
  if (wsr) wsr.close();
  if (wsw) wsw.close();
  wsr = new WebSocket('wss://'+inp.value+'/ws/stream');
  wsr.binaryType = "arraybuffer";
  wsw = new WebSocket('wss://'+inp.value+'/ws/draw');

  wsr.onmessage = function(event) {
    let view = new DataView(event.data);
    const imageData = ctx.createImageData(1, 1);
    const img = imageData.data;

    let offset = 0;

    // Read the Message Type (1 byte)
    const messageType = view.getUint8(offset);
    offset += 1;

    if (messageType !== 0x01) {
      console.error('Invalid Type');
      return;
    }

    // Read the Number of Pixels (2 bytes, Big Endian)
    const numberOfPixels = view.getUint16(offset);
    offset += 2;

    // Read each pixel's data (7 bytes per pixel)
    for (let i = 0; i < numberOfPixels; i++) {
      // Read X Coordinate (2 bytes, Big Endian)
      const x = view.getUint16(offset);
      offset += 2;

      // Read Y Coordinate (2 bytes, Big Endian)
      const y = view.getUint16(offset);
      offset += 2;

      // Read Red, Green, and Blue (1 byte each)
      const red = view.getUint8(offset++);
      const green = view.getUint8(offset++);
      const blue = view.getUint8(offset++);

      // Store pixel data
      img[(x+(y*1024))*4] = red;
      img[(x+(y*1024))*4 + 1] = green;
      img[(x+(y*1024))*4 + 2] = blue;
      img[(x+(y*1024))*4 + 3] = 255;
    }

    ctx.putImageData(img, 0, 0);
  };
}
