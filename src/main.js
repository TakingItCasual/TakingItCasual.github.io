"use strict";
(function(){

ctx.strokeStyle = COLOR.WHITE;
ctx.font = Math.floor(NUM.CHAR_HEIGHT/3*4) + "pt tis-100-copy";

let nodeManager = new NodeContainer([
  [1, 1, 2, 0],
  [0, 1, 1, 1],
  [1, 2, 0, 1]
]);

// Source: https://stackoverflow.com/a/17130415
function getMousePos(canvas, evt) {
  let rect = canvas.getBoundingClientRect();
  let scaleX = canvas.width / rect.width;
  let scaleY = canvas.height / rect.height;

  return {
    x: Math.floor((evt.clientX - rect.left) * scaleX),
    y: Math.floor((evt.clientY - rect.top) * scaleY)
  };
}

let mPos = { x: 0, y: 0 }; // Mouse position
canvas.addEventListener("mousemove", function(evt) {
  mPos = getMousePos(canvas, evt);
  if(evt.buttons % 2 === 1) nodeManager.lmbDrag(mPos);
});
canvas.addEventListener("mousedown", function(evt) {
  if(evt.button === 0){
    nodeManager.lmbDown(mPos);
  }else if(evt.button === 2){
    nodeManager.rmbDown(mPos, evt.clipboardData);
  }
});

canvas.addEventListener("keydown", function(evt) {
  // Prevent space and arrow keys from causing unwanted scrolling
  // Prevent backspace causing the browser to navigate backwards
  // Prevent ' and / from opening quick find in Firefox
  if([
    " ", "ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown",
    "Backspace",
    "'", "/"
  ].indexOf(evt.key) > -1){
    evt.preventDefault();
  }

  if(nodeManager.select.nodeI === null) return;

  if(!evt.ctrlKey){
    switch(evt.key){
      case "Enter":
        nodeManager.newLine();
        break;
      case "Backspace":
        nodeManager.bakChar();
        break;
      case "Delete":
        nodeManager.delChar();
        break;
      case "ArrowLeft":
        nodeManager.arrowKey(0);
        break;
      case "ArrowUp":
        nodeManager.arrowKey(1);
        break;
      case "ArrowRight":
        nodeManager.arrowKey(2);
        break;
      case "ArrowDown":
        nodeManager.arrowKey(3);
        break;
      case "Escape":
        nodeManager.select.focusLost();
        break;
      default:
        nodeManager.addChar(evt.key);
        break;
    }
  }else if(evt.key === "A" || evt.key === "a"){
    nodeManager.selectAll();
  }
});
canvas.addEventListener("blur", function(evt) {
  nodeManager.select.focusLost();
});

// Handle copying/cutting/pasting into code boxes
canvas.addEventListener("copy", function(evt){
  let copiedStr = nodeManager.attemptCopy()
  if(copiedStr !== null)
    evt.clipboardData.setData("text/plain", copiedStr);

  evt.preventDefault();
});
canvas.addEventListener("cut", function(evt){
  let cutStr = nodeManager.attemptCut()
  if(cutStr !== null)
    evt.clipboardData.setData("text/plain", cutStr);

  evt.preventDefault();
});
canvas.addEventListener("paste", function(evt){
  evt.preventDefault();
  evt.stopPropagation();

  let pastedStr = evt.clipboardData.getData("text/plain").toUpperCase();
  nodeManager.attemptPaste(pastedStr);
});

// Disable unwanted behaviors in canvas
canvas.addEventListener("contextmenu", function(evt) {
  evt.preventDefault();
});
canvas.addEventListener("dragstart", function(evt) {
  evt.preventDefault();
});

for(let i=0; i<NUM.NODE_HEIGHT-1; i++)
  nodeManager.nodes[0].mainTextBox.lines.strSet(
    i, "testing " + i);
nodeManager.nodes[0].mainTextBox.lines.strSet(
  NUM.NODE_HEIGHT-1, "1: mov r#ght right");

for(let i=0; i<NUM.NODE_HEIGHT-1; i++)
  nodeManager.nodes[1].mainTextBox.lines.strSet(
    i, "testing " + (i+NUM.NODE_HEIGHT-1));
nodeManager.nodes[1].mainTextBox.lines.strSet(
  NUM.NODE_HEIGHT-1, "1: mov r#ght right");
nodeManager.nodes[1].codeBox.activeLine = NUM.NODE_HEIGHT-1;
nodeManager.nodes[1].BAK = -999;

nodeManager.nodes[2].memoryBox.lines.strSet(0, "254");
nodeManager.nodes[2].memoryBox.lines.strSet(1, "498");
nodeManager.nodes[2].memoryBox.lines.strSet(2, "782");

function gameLoop() {
  ctx.beginPath();
  ctx.fillStyle = COLOR.BLACK;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = COLOR.WHITE;
  ctx.fillText("ThE qUiCk BrOwN fOx JuMpS oVeR tHe LaZy DoG.", 10, 22);
  ctx.fillText("1234567890", 10, 22+NUM.LINE_HEIGHT);
  ctx.fillText("!\"#$%&'()*+,-./:;", 10, 22+NUM.LINE_HEIGHT*2);
  ctx.fillText("<=>?@[\\]_`{|}~", 10, 22+NUM.LINE_HEIGHT*3);

  nodeManager.drawNodes();

  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

})();
