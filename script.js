let wsr;
let wsw;

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

function setPixel(x, y, r, g, b) {
  const imageData = ctx.createImageData(1, 1);
  const data = imageData.data;

  data[0] = r;
  data[1] = g;
  data[2] = b;
  data[3] = 255;

  // Draw the pixel on the canvas
  ctx.putImageData(imageData, x, y);
}

let inp = document.querySelector('input');
inp.onchange = function() {
  if (wsr) wsr.close();
  if (wsw) wsw.close();
  wsr = new WebSocket('wss://'+inp.value+'/ws/stream');
  wsr.binaryType = "arraybuffer";
  wsw = new WebSocket('wss://'+inp.value+'/ws/draw');

  wsr.onmessage = function(event) {
    let view = new DataView(event.data);
    /*const imageData = ctx.createImageData(1024, 1024);
    const img = imageData.data;*/

    let offset = 0;

    // Read the Message Type (1 byte)
    const messageType = view.getUint8(offset);
    offset += 1;

    if (messageType !== 0x01) {
      if (messageType !== 0x00) {// Should be 1 but server returns 0
        console.error('Unknown Type: '+messageType);
      }
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
      setPixel(x, y, red, green, blue);/*
      img[(x+(y*1024))*4] = red;
      img[(x+(y*1024))*4 + 1] = green;
      img[(x+(y*1024))*4 + 2] = blue;
      img[(x+(y*1024))*4 + 3] = 255;*/
    }

    //ctx.putImageData(imageData, 0, 0);
  };
}
