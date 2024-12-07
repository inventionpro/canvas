let wsr;
let wsw;
let int;

let isMouseDown = false;
window.addEventListener('mousedown', () => {
  isMouseDown = true;
});
window.addEventListener('mouseup', () => {
  isMouseDown = false;
});
window.addEventListener('mouseleave', () => {
  isMouseDown = false;
});

const canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');

function setPixel(x, y, r, g, b) {
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(x, y, 1, 1);
}

function connect() {
  if (wsr) wsr.close();
  if (wsw) wsw.close();
  if (int) clearInterval(int);
  let url = document.getElementById('url').value.split('://').slice(-1)[0].split('/')[0];
  wsr = new WebSocket('wss://'+url+'/ws/stream');
  wsr.binaryType = "arraybuffer";
  wsw = new WebSocket('wss://'+url+'/ws/draw');

  int = setInterval(()=>{
    if (wsr?.readyState == WebSocket.CLOSED) {
      wsr = new WebSocket('wss://'+url+'/ws/stream');
      wsr.binaryType = "arraybuffer";
    }
    if (wsw?.readyState == WebSocket.CLOSED) {
      wsw = new WebSocket('wss://'+url+'/ws/draw');
    }
  }, 2000)

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
document.getElementById('url').onchange = connect;
connect();

document.getElementById('size').onchange = function(){
  let size = document.getElementById('size').value;
  if (canvas.width < size) {
    canvas.width = size;
    canvas.height = size;
    connect();
  } else {
    const img = new Image();
    img.src = canvas.toDataURL();
    img.onload = () => {
      canvas.width = size;
      canvas.height = size;

      ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
    };
  }
};

canvas.onmousemove = function(event){
  if (!isMouseDown) return;
  if (wsw?.readyState == WebSocket.OPEN) {
    let bound = canvas.getBoundingClientRect();
    let color = document.getElementById('color').value;
    wsw.send(`{
  "x": ${Math.round(event.x-bound.left)},
  "y": ${Math.round(event.y-bound.top)},
  "r": ${parseInt(color.substr(1,2), 16)},
  "g": ${parseInt(color.substr(3,2), 16)},
  "b": ${parseInt(color.substr(5,2), 16)}
}`)
  }
}
