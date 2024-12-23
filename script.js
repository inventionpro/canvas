const canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
const hmcanvas = document.getElementById('heatmap');
let hmctx = hmcanvas.getContext('2d');

function setPixel(x, y, r, g, b, ct) {
  ct.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ct.fillRect(x, y, 1, 1);
}

let wsr;
let wsw;
let heatmap = new Array(2048*2048).fill(0);
function connect() {
  if (wsr) wsr.close();
  if (wsw) wsw.close();
  let size = document.getElementById('size').value;
  heatmap = new Array(size*size).fill(0);
  let url = document.getElementById('url').value.split('://').slice(-1)[0].split('/')[0];
  wsr = new WebSocket('wss://'+url+'/ws/stream');
  wsr.binaryType = "arraybuffer";
  wsw = new WebSocket('wss://'+url+'/ws/draw');
  document.getElementById('status').innerText = 'Connected';

  function handleClose() {
    document.getElementById('status').innerText = 'Reconnecting';
    wsr.removeEventListener("close", handleClose);
    wsw.removeEventListener("close", handleClose);
    setTimeout(connect, 1000);
  }

  wsr.addEventListener("close", handleClose);
  wsw.addEventListener("close", handleClose);

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
      setPixel(x, y, red, green, blue, ctx);
      let idx = x+(y*size);
      if (idx<=size*size) {
        heatmap[idk] += 1;
        paintHeat();
      }
    }
  };
}
document.getElementById('url').onchange = connect;
connect();

document.getElementById('size').onchange = function(){
  let size = document.getElementById('size').value;
  canvas.width = size;
  canvas.height = size;
  hmcanvas.width = size;
  hmcanvas.height = size;
  connect();
};

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

let mousex = 0;
let mousey = 0;
let tool = 'pencil';
canvas.onmousemove = function(event){
  let bound = canvas.getBoundingClientRect();
  let size = document.getElementById('size').value;
  mousex = Math.ceil((event.x-bound.left)/bound.width*size);
  mousey = Math.ceil((event.y-bound.top)/bound.height*size);
  document.getElementById('pos').innerText = `x: ${mousex} y: ${mousey}`;
  if (tool!=='pencil') return;
  if (!isMouseDown) return;
  if (wsw?.readyState != WebSocket.OPEN) return;
  let color = document.getElementById('color').value;
  wsw.send(`{
  "x": ${mousex},
  "y": ${mousey},
  "r": ${parseInt(color.substr(1,2), 16)},
  "g": ${parseInt(color.substr(3,2), 16)},
  "b": ${parseInt(color.substr(5,2), 16)}
}`)
};
canvas.addEventListener('mousedown', () => {
  if (tool==='square') {
    pp()
  } else if (tool==='image') {
    document.getElementById('file').click()
  }
});

Array.from(document.querySelectorAll('.tools button')).forEach(e=>{
  e.onclick = function(){
    tool = e.innerText.toLowerCase();
  }
})

function pp() {
  let width = Number(prompt('width')??10);
  let height = Number(prompt('height')??10);
  let color = document.getElementById('color').value;
  let r = parseInt(color.substr(1,2), 16);
  let g = parseInt(color.substr(3,2), 16);
  let b = parseInt(color.substr(5,2), 16);

  if (document.getElementById('rainbow').checked) {
    for (let x = mousex; x<mousex+width; x++) {
      for (let y = mousey; y<mousey+height; y++) {
        r = Math.floor(Math.random()*256);
        g = Math.floor(Math.random()*256);
        b = Math.floor(Math.random()*256);
        wsw.send(`{
  "x": ${x},
  "y": ${y},
  "r": ${r},
  "g": ${g},
  "b": ${b}
}`)
      }
    }
  } else {
    for (let x = mousex; x<mousex+width; x++) {
      for (let y = mousey; y<mousey+height; y++) {
        wsw.send(`{
  "x": ${x},
  "y": ${y},
  "r": ${r},
  "g": ${g},
  "b": ${b}
}`)
      }
    }
  }
}

document.getElementById('file').onchange = function(event){
  let file = event.target.files[0];
  if (!file) return;
  event.target.value = '';

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
  "x": ${x+mousex},
  "y": ${y+mousey},
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

setInterval(()=>{
  if (document.getElementById('rainbow').checked) {
    document.getElementById('color').value = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }
}, 10)

var paintHeat = ()=>{};
document.getElementById('hm').onchange = function(event){
  document.getElementById('heatmap').style.display = (event.target.checked ? '' : 'none');
  if (event.target.checked) {
    paintHeat = function(){
      let size = document.getElementById('size').value;
      let max = 0;
      for (let i = 0; i < size*size; i++) {
        if (heatmap[i] > max) {
          max = heatmap[i];
        }
      }
      for (let i = 0; i<size*size; i++) {
        let x = i%size;
        let y = Math.floor(i/size);
        setPixel(x, y, ...chroma.scale(['blue', 'green', 'yellow', 'red']).mode('rgb')(heatmap[i]/max).rgb())
      }
    }
  } else {
    paintHeat = ()=>{};
  }
}
