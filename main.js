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
    }
}

let mPos = { x: 0, y: 0 } // Mouse position
let mDown = false; // If the left mouse button is held down
window.addEventListener("mousemove", function(evt) {
    mPos = getMousePos(canvas, evt);
    if(mDown) allNodes.mouseMove(mPos);
});
window.addEventListener("mousedown", function(evt) {
    mDown = true;
    allNodes.lmbDown(mPos);
});
window.addEventListener("mouseup", function(evt) {
    mDown = false;
    allNodes.lmbUp(mPos);
});

window.addEventListener("keypress", function(evt) {
    allNodes.initCompareCursors();

    // Required for cross-browser compatibility
    let charCode = (typeof evt.which == "number") ? evt.which : evt.keyCode;
    let char = String.fromCharCode(charCode);

    // Prevents Firefox from opening quick find
    if(["'", "/"].indexOf(char) > -1)
        evt.preventDefault();

    if(ALLOWED_CHARS.test(char)){
        char = char.toUpperCase();
        allNodes.addChar(char);
    }

    allNodes.compareCursors();
});
window.addEventListener("keydown", function(evt) {
    allNodes.initCompareCursors();

    // Prevent space and arrow keys from causing unwanted scrolling
    // Prevent backspace causing the browser to navigate backwards
    if([32, 37, 38, 39, 40, 8].indexOf(evt.keyCode) > -1)
        evt.preventDefault();

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

    allNodes.compareCursors();
});
window.addEventListener("blur", function(evt) {
    allNodes.select.focusLost();
    allNodes.focusNodeI = -1;
});

for(let i=0; i<NODE_HEIGHT-1; i++){
    allNodes.nodes[0].codeBox.str.strSet(i, "testing " + i);
}
allNodes.nodes[0].codeBox.str.strSet(NODE_HEIGHT-1, "1: mov r#ght, righ");

for(let i=0; i<NODE_HEIGHT-1; i++){
    allNodes.nodes[1].codeBox.str.strSet(i, "testing " + (i+NODE_HEIGHT-1));
}
allNodes.nodes[1].codeBox.str.strSet(NODE_HEIGHT-1, "1: mov r#ght, righ");
allNodes.nodes[1].codeBox.currentLine = NODE_HEIGHT-1;

allNodes.nodes[2].memoryBox.str.strSet(0, "254");
allNodes.nodes[2].memoryBox.str.strSet(1, "498");
allNodes.nodes[2].memoryBox.str.strSet(2, "782");

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
