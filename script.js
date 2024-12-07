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
  canvas.width = size;
  canvas.height = size;
  connect();
};

canvas.onmousemove = function(event){
  if (!isMouseDown) return;
  if (wsw?.readyState != WebSocket.OPEN) return;
  let bound = canvas.getBoundingClientRect();
  let color = document.getElementById('color').value;
  let size = document.getElementById('size').value;
  wsw.send(`{
  "x": ${Math.ceil((event.x-bound.left)/bound.width*size)},
  "y": ${Math.ceil((event.y-bound.top)/bound.height*size)},
  "r": ${parseInt(color.substr(1,2), 16)},
  "g": ${parseInt(color.substr(3,2), 16)},
  "b": ${parseInt(color.substr(5,2), 16)}
}`)
};

function imag() {
  document.getElementById('file').click()
}
document.getElementById('file').onchange = function(event){
  let file = event.target.files[0];
  if (!file) return;
  event.target.value = '';

  let ox = Number(prompt('X offset')??0);
  let oy = Number(prompt('Y offset')??0);

  let fc = document.getElementById('file-canvas');
  let fctx = fc.getContext('2d');
  const img = new Image();
  img.onload = () => {
    fc.width = img.width;
    fc.height = img.height;

    fctx.drawImage(img, 0, 0);

    const imageData = fctx.getImageData(0, 0, fc.width, fc.height);
    const pixels = imageData.data;

    for (let i = 0; i<pixels.length; i+=4) {
      let idx = i/4;
      let x = idx % img.width;
      let y = Math.floor(idx / img.width);
      wsw.send(`{
  "x": ${x+ox},
  "y": ${y+oy},
  "r": ${pixels[i]},
  "g": ${pixels[i+1]},
  "b": ${pixels[i+2]}
}`)
    }
  };

  const reader = new FileReader();
  reader.onload = (e) => {
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function pp() {
  let x = Number(prompt('X')??0);
  let y = Number(prompt('Y')??0);
  let width = Number(prompt('width')??10);
  let height = Number(prompt('height')??10);
  let color = document.getElementById('color').value;
  let r = parseInt(color.substr(1,2), 16);
  let g = parseInt(color.substr(3,2), 16);
  let b = parseInt(color.substr(5,2), 16);

  for (let xx = x; xx<x+width; xx++) {
    for (let yy = y; yy<y+height; yy++) {
      wsw.send(`{
  "x": ${xx},
  "y": ${yy},
  "r": ${r},
  "g": ${g},
  "b": ${b}
}`)
    }
  }
}