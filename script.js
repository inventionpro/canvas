let wsr;
let wsw;

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

function setPixel(x, y, r, g, b) {
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(x, y, 1, 1);
}

let inp = document.querySelector('input');
function connect() {
  if (wsr) wsr.close();
  if (wsw) wsw.close();
  let url = inp.value.split('://').slice(-1)[0].split('/')[0];
  wsr = new WebSocket('wss://'+url+'/ws/stream');
  wsr.binaryType = "arraybuffer";
  wsr.onclose = connect;
  wsw = new WebSocket('wss://'+url+'/ws/draw');
  wsw.onclose = connect;

  wsr.onmessage = function(event) {
    let view = new DataView(event.data);

    let offset = 0;

    // Read the Message Type (1 byte)
    const messageType = view.getUint8(offset);
    offset += 1;

    if (messageType !== 0x01) {
      if (messageType !== 0x00) { // Should be 1 but server returns 0
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
      setPixel(x, y, red, green, blue);
    }
  };
}

inp.onchange = connect;

canvas.onmousemove = function(event){
  if (wsw.readyState == WebSocket.OPEN) {
    let bound = canvas.getBoundingClientRect();
    let color = document.querySelector('input[type="color"]').value;
    wsw.send(`{
  "x": ${event.x-bound.left},
  "y": ${event.y-bound.top},
  "r": ${parseInt(color.substr(1,2), 16)},
  "g": ${parseInt(color.substr(3,2), 16)},
  "b": ${parseInt(color.substr(5,2), 16)}
}`)
  }
}
