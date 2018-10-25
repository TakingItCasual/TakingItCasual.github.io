"use strict";
(function(){

ctx.strokeStyle = WHITE;
ctx.font = CHAR_HEIGHT/3*4 + "pt tis-100-copy";

let allNodes = new NodeContainer([
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
window.addEventListener("mousemove", function(evt) {
    mPos = getMousePos(canvas, evt);
    if(evt.buttons % 2 === 1) allNodes.mouseDrag(mPos);
});
window.addEventListener("mousedown", function(evt) {
    allNodes.lmbDown(mPos);
});

window.addEventListener("keypress", function(evt) {
    if(evt.ctrlKey) return;
    let prevCursor = allNodes.initCompareCursors();

    // Required for cross-browser compatibility
    let charCode = (typeof evt.which === "number") ? evt.which : evt.keyCode;
    let char = String.fromCharCode(charCode).toUpperCase();

    // Prevents Firefox from opening quick find
    if(["'", "/"].indexOf(char) > -1)
        evt.preventDefault();

    if(prevCursor === null) return;

    if(ALLOWED_CHARS.test(char)){
        allNodes.addChar(char);
        allNodes.compareCursors(prevCursor);
    }
});
window.addEventListener("keydown", function(evt) {
    let prevCursor = allNodes.initCompareCursors();

    // Prevent space and arrow keys from causing unwanted scrolling
    // Prevent backspace causing the browser to navigate backwards
    if([32, 37, 38, 39, 40, 8].indexOf(evt.keyCode) > -1)
        evt.preventDefault();

    if(prevCursor === null) return;

    switch(evt.keyCode){
        case 13: // Enter
            allNodes.newLine();
            break;
        case 32: // Space
            allNodes.addChar(" ");
            break;
        case 8: // Backspace
            allNodes.bakChar();
            break;
        case 46: // Delete
            allNodes.delChar();
            break;
        case 37: // Left
            allNodes.arrowKey(0);
            break;
        case 38: // Up
            allNodes.arrowKey(1);
            break;
        case 39: // Right
            allNodes.arrowKey(2);
            break;
        case 40: // Down
            allNodes.arrowKey(3);
            break;
    }

    if (evt.ctrlKey && evt.code === "KeyA") {
        allNodes.selectAll();
    }

    allNodes.compareCursors(prevCursor);
});
window.addEventListener("blur", function(evt) {
    allNodes.select.focusLost();
});

window.addEventListener("copy", function(evt){
    let copiedStr = allNodes.attemptCopy()
    if(copiedStr !== null)
        evt.clipboardData.setData("text/plain", copiedStr);

    evt.preventDefault();
});
window.addEventListener("cut", function(evt){
    let cutStr = allNodes.attemptCut()
    if(cutStr !== null)
        evt.clipboardData.setData("text/plain", cutStr);

    evt.preventDefault();
});
window.addEventListener("paste", function(evt){
    evt.preventDefault();
    evt.stopPropagation();

    allNodes.attemptPaste(evt.clipboardData.getData("text/plain"))
});

for(let i=0; i<NODE_HEIGHT-1; i++)
    allNodes.nodes[0].codeBox.lines.strSet(i, "testing " + i);
allNodes.nodes[0].codeBox.lines.strSet(NODE_HEIGHT-1, "1: mov r#ght, righ");

for(let i=0; i<NODE_HEIGHT-1; i++)
    allNodes.nodes[1].codeBox.lines.strSet(i, "testing " + (i+NODE_HEIGHT-1));
allNodes.nodes[1].codeBox.lines.strSet(NODE_HEIGHT-1, "1: mov r#ght, righ");
allNodes.nodes[1].codeBox.activeLine = NODE_HEIGHT-1;

allNodes.nodes[2].memoryBox.lines.strSet(0, "254");
allNodes.nodes[2].memoryBox.lines.strSet(1, "498");
allNodes.nodes[2].memoryBox.lines.strSet(2, "782");

function gameLoop() {

    ctx.beginPath();
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = WHITE;
    ctx.fillText("ThE qUiCk BrOwN fOx JuMpS oVeR tHe LaZy DoG.", 10, 22);
    ctx.fillText("1234567890", 10, 22+LINE_HEIGHT);
    ctx.fillText("!\"#$%&'()*+,-./:;", 10, 22+LINE_HEIGHT*2);
    ctx.fillText("<=>?@[\\]_`{|}~", 10, 22+LINE_HEIGHT*3);

    allNodes.drawNodes();

    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

})();
