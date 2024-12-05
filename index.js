let wsr;
let wsw;

let inp = document.querySelector('input');
inp.onchange = function() {
  if (wsr) wsr.close();
  if (wsw) wsw.close();
  wsr = new WebSocket('ws://'+inp.value+'/ws/stream');
  wsw = new WebSocket('ws://'+inp.value+'/ws/draw');

  wsr.addEventListener("open", (event) => {
    socket.send("Hello Server!");
  });
  wsr.addEventListener("message", (event) => {
    console.log("Message from server ", event.data);
  });

  wsw.addEventListener("open", (event) => {
    socket.send("Hello Server!");
  });
  wsw.addEventListener("message", (event) => {
    console.log("Message from server ", event.data);
  });
}
