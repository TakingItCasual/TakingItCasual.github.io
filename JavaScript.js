var NODE_WIDTH = 18; // Characters that will fit on a BoxCode's line
var NODE_HEIGHT = 15; // Number of writable lines in a node. min: 14
var ACC_MAX = 999; // Maximum value that an ACC can contain
var ACC_MIN = -ACC_MAX; // Minimum value
var CHAR_HEIGHT = 9; // Height of the actual characters. Multiple of 9
var CHAR_WIDTH = CHAR_HEIGHT/9*8; // Characters' width, including pixel after
var CHAR_GAP = 3; // Gap between rows and from sides. Min: 2
var LINE_HEIGHT = CHAR_HEIGHT + CHAR_GAP; // Used for spacing lines apart
var INFO_BOXES = 5; // For ACC, BAK, LAST, MODE, and IDLE

var WHITE = "#C8C8C8"; // Used for the boxes and code
var FOCUS_WHITE = "#E2E2E2"; // Used for that blinking thingy
var DESC_WHITE = "#B4B4B4" // Used for text not in a node
var TRUE_WHITE = "#FFFFFF"; // White
var BLACK = "#000000"; // Black
var COMMENT_GRAY = "#7A7A7A"; // Used for comments within code
var INFO_GRAY = "#8D8D8D"; // Used for the ACC, BAK, etc.
var SELECT_GRAY = "#ABABAB"; // Used for highlighting sections of code
var ACTIVE_FOCUS = "#FBFBFB"; // Used for the bar over executing code
var WAIT_FOCUS = "#9C9C9C"; // Used for the bar over stalled code
var DARK_RED = "#A60D0D"; // Used for corruptNode boxes and text
var LIGHT_RED = "#BF0D0D"; // Used for red bars in corruptNode and syntax error
var MEM_RED = "#480A0A"; // Used for highlighting the top stack memory value

var ALLOWED_CHARS = new RegExp("^[\x00-\x7F]*$"); // ASCII characters

// Just your standard box, containing nothing more than its own dimensions
class Box{
	constructor(x, y, w, h, borderW=1){
		this.x = x + ((borderW-1)/2); // x-pos of box's top left
		this.y = y + ((borderW-1)/2); // y-pos of box's top left
		this.w = w - (borderW - 1); // Box's width
		this.h = h - (borderW - 1); // Box's height
		this.borderW = borderW; // Width of box's border
	}

	drawBox(color = ctx.strokeStyle){
		ctx.strokeStyle = color;
		ctx.lineWidth = this.borderW;
		ctx.strokeRect(this.x-0.5, this.y-0.5, this.w, this.h);
		ctx.lineWidth = 1;
	}
}
// Can draw text and bars now. Dimensions set relative to font dimensions
class BoxText extends Box{
	constructor(x, y, lineW, lines, extraH, offsetY, centered=false, borderW=1){
		super(
			x, y, 
			lineW*CHAR_WIDTH + CHAR_GAP*2, 
			lines*LINE_HEIGHT + CHAR_GAP + 1 + extraH,
			borderW
		);
		this.lineW = lineW; // Width of the box in terms of characters
		this.lines = lines; // Number of string lines
		this.extraH = extraH; // Extra height of the box in pixels
		this.offsetY = offsetY; // Custom y-offset for text lines in pixels
		this.centered = centered; // If true, center text within box's width

		// Why make it private? Because I was experimenting. Too lazy to revert
		var lineString = [];
		for(var i=0; i<this.lines; i++) lineString.push("");
		this.getString = function(index){
			if(index < 0 || index > lineString.length-1) return "";
			return lineString[index];
		}
		this.setString = function(index, string){
			if(index < 0 || index > lineString.length-1) return;
			lineString[index] = string;
		}
		this.stringLength = function(index){
			if(index < 0 || index > lineString.length-1) return 0;
			return lineString[index].length;
		}
	}

	// Draws text from lineString to the canvas (extraY used for "FAILURE")
	drawLine(line, color=ctx.fillStyle, extraY=0){
		var offsetX = 0;
		if(this.centered){ // Centers text within box's width
			offsetX = (CHAR_WIDTH/2)*(this.lineW - this.stringLength(line));
		}
		ctx.fillStyle = color;
		ctx.fillText(
			this.getString(line), 
			this.x+CHAR_GAP + offsetX, 
			this.y+this.offsetY + extraY + (line+1)*LINE_HEIGHT
		);
	}
	// Used to draw those solid color boxes (and bars)
	drawBar(line, startChar, endChar, barColor, extraStart=0, extraEnd=0){
		var offsetX = 0;
		if(this.centered){ // Centers text within box's width
			offsetX = (CHAR_WIDTH/2)*(this.lineW - (endChar - startChar));
		}
		ctx.fillStyle = barColor;
		ctx.fillRect(
			this.x+CHAR_GAP + offsetX + startChar*CHAR_WIDTH - extraStart, 
			this.y+this.offsetY+CHAR_GAP + (line)*LINE_HEIGHT - 
				Math.floor(CHAR_GAP/2), 
			(endChar-startChar)*CHAR_WIDTH + extraStart+extraEnd, 
			LINE_HEIGHT
		);
	}
}

// Used for when the user highlights text in their code
class Selection{
	constructor(){
		this.focus = { line: -1, char: 0 }; // Where the user is typing
		this.start = { line: -1, char: 0 }; // Start of selection
		this.end = { line: -1, char: 0 }; // End of selection
	}

	lineSelected(line){
		if(
			this.start.line == this.end.line && 
			this.start.char == this.end.char
		) return false;
		if(this.start.line <= line && this.end.line >= line) return true;
		return false;
	}
	charSelected(line, char){
		if(!lineSelected(line)) return false;
		if(this.start.char <= char && this.end.char > char) return true;
		return false;
	}

	reset(all){
		if(all) this.focus = { line: -1, char: 0 };
		this.start = { line: -1, char: 0 };
		this.end = { line: -1, char: 0 };
	}
}
// Can divide a line into different colors for comments and selection
class BoxCode extends BoxText{
	constructor(x, y, lineW, lines, extraH, offsetY){
		super(x, y, lineW, lines, extraH, offsetY, false, 1);
		this.currentLine = -1; // Indicates currently executing line
		this.executable = true; // True if the current line was just reached
	}

	// Draws text, executing line or selected text bars, and the blinking thingy
	drawAllLinesAndBars(select){
		// Draws bar under currently executing line
		if(this.currentLine != -1){ // Only false before the program is started
			if(this.executable) ctx.fillStyle = ACTIVE_FOCUS;
			else ctx.fillStyle = WAIT_FOCUS;
			this.drawBar(
				this.currentLine, 0, this.lineW, ctx.fillStyle, 3, 1
			);
		}

		// Draws bars under selected text and the text itself
		for(var i=0; i<this.lines; i++){ 
			if(!this.getString(i)) continue;

			var commentStart = this.getString(i).indexOf("#");
			var selectStart = -1;
			var selectEnd = -1;
			// Draws bar under selected text
			if(select.lineSelected(i)){
				if(select.start.line < i) selectStart = 0;
				else selectStart = select.start.char;

				if(select.end.line > i) selectEnd = this.stringLength(i);
				else selectEnd = select.end.char;

				this.drawBar(i, selectStart, selectEnd, SELECT_GRAY);
			}

			this.drawSplitLine(i, commentStart, selectStart, selectEnd);
		}

		// Blinking thingy
		if(this.currentLine == -1 && select.focus.line != -1){
			var time = new Date();
			time = time.getTime() % 800;
			if(time > 400){ // Get the blinking thingy to blink every 800ms
				this.drawBar(
					select.focus.line, select.focus.char, 
					select.focus.char+1, FOCUS_WHITE
				);
			}
		}
	}
	// Draws lines containing comments, using another color for the comment
	drawSplitLine(line, commentStart, selectStart, selectEnd){
		// Only one color needed if executing, or if no comments/selections
		if(
			this.currentLine == line || 
			(commentStart == -1 && selectStart == -1)
		){
			if(this.currentLine == line) ctx.fillStyle = BLACK;
			else ctx.fillStyle = WHITE;

			this.drawLine(line);
			return;
		}
		// To ensure that the Math.min calculations work properly
		if(commentStart == -1) commentStart = NODE_WIDTH;
		if(selectStart == -1) selectStart = selectEnd = NODE_WIDTH;

		var stringParts = []; // The cut string value
		var stringStart = []; // Index number of from where the string was cut
		var stringColor = []; // Color of the string_part

		if(Math.min(commentStart, selectStart) > 0){
			stringParts.push(this.getString(line).substr(
				0, Math.min(commentStart, selectStart)));
			stringStart.push(0);
			stringColor.push(WHITE);
		}
		if(commentStart != NODE_WIDTH && selectStart == NODE_WIDTH){
			if(commentStart > 0){
				stringParts.push(this.getString(line).substr(commentStart));
				stringStart.push(commentStart);
				stringColor.push(COMMENT_GRAY);
			}else{
				stringParts.push(this.getString(line));
				stringStart.push(0);
				stringColor(COMMENT_GRAY);
			}
		}else if(commentStart == NODE_WIDTH && selectStart != NODE_WIDTH){
			if(selectStart > 0){
				stringParts.push(this.getString(line).substr(
					selectStart, selectEnd));
				stringStart.push(selectStart);
				stringColor.push(TRUE_WHITE);

				if(selectEnd < this.stringLength(line)){
					stringParts.push(this.getString(line).substr(selectEnd));
					stringStart.push(selectEnd);
					stringColor.push(WHITE);
				}
			}else{
				stringParts.push(this.getString(line).substr(
					selectStart, selectEnd));
				stringStart.push(selectStart);
				stringColor.push(TRUE_WHITE);

				if(selectEnd < this.stringLength(line)){
					stringParts.push(this.getString(line).substr(selectEnd));
					stringStart.push(selectEnd);
					stringColor.push(WHITE);
				}
			}
		}else{
			if(commentStart <= selectStart){
				if(commentStart < selectStart){
					stringParts.push(this.getString(line).substr(
						commentStart, selectStart));
					stringStart.push(commentStart);
					stringColor.push(COMMENT_GRAY);
				}

				stringParts.push(this.getString(line).substr(
					selectStart, selectEnd));
				stringStart.push(selectStart);
				stringColor.push(WHITE);

				if(selectEnd < this.stringLength(line)){
					stringParts.push(this.getString(line).substr(selectEnd));
					stringStart.push(selectEnd);
					stringColor.push(COMMENT_GRAY);
				}
			}else if(selectStart < commentStart && commentStart < selectEnd){
				stringParts.push(this.getString(line).substr(
					selectStart, commentStart));
				stringStart.push(selectStart);
				stringColor.push(TRUE_WHITE);

				stringParts.push(this.getString(line).substr(
					commentStart, selectEnd));
				stringStart.push(commentStart);
				stringColor.push(WHITE);

				if(selectEnd < this.stringLength(line)){
					stringParts.push(this.getString(line).substr(selectEnd));
					stringStart.push(selectEnd);
					stringColor.push(COMMENT_GRAY);
				}
			}else if(commentStart >= selectEnd){
				stringParts.push(this.getString(line).substr(
					selectStart, selectEnd));
				stringStart.push(selectStart);
				stringColor.push(TRUE_WHITE);

				if(commentStart > selectEnd){
					stringParts.push(this.getString(line).substr(
						selectEnd, commentStart));
					stringStart.push(commentStart);
					stringColor.push(WHITE);
				}

				stringParts.push(this.getString(line).substr(commentStart));
				stringStart.push(commentStart);
				stringColor.push(COMMENT_GRAY);
			}
		}

		for(var i=0; i<stringParts.length; i++){
			ctx.fillStyle = stringColor[i];
			ctx.fillText(
				stringParts[i], 
				this.x+CHAR_GAP + CHAR_WIDTH*stringStart[i], 
				this.y+this.offsetY + (line+1)*LINE_HEIGHT
			);
		}
	}
}

// Red "Communication Error" node. No functionality
class CorruptNode{
	constructor(x, y, sizeInit){
		this.descBox = new BoxText(
			x+2, y+2, 
			sizeInit.lineW, 
			sizeInit.lines, 
			sizeInit.extraH, 
			sizeInit.offsetY, 
			true
		);

		this.descBox.setString(4, "COMMUNICATION");
		this.descBox.setString(5, "FAILURE");
		
		var remainder = (this.descBox.h-2)%4;
		var sideX = x+this.descBox.w + 2;
		var sideW = sizeInit.sideWPx + 4;
		var sideH = (this.descBox.h - remainder)/2 + 3;
		function expandCalc(boxNum, y_pos){
			if(remainder == 0) return 0;
			if(boxNum == 1){
				if(remainder == 3) return 2;
				return remainder;
			}else if(boxNum == 2){
				if(y_pos) return 1;
				return remainder-1;
			}else{
				if(y_pos){
					if(remainder == 3) return 2;
					return remainder;
				}
				if(remainder == 3) return 1;
			}
			return 0;
		} // See expandCorrupt.txt to see the desired I/O behavior
		
		this.sideBox1 = new Box(
			sideX,
			y,
			sideW,
			sideH + expandCalc(1, false), 3
		);
		this.sideBox2 = new Box(
			sideX,
			y+(this.descBox.h-remainder)/4 + 1 + expandCalc(2, true) - 0.5,
			sideW,
			sideH + expandCalc(2, false), 3
		);
		this.sideBox3 = new Box(
			sideX,
			y + this.sideBox1.h,
			sideW,
			sideH + expandCalc(3, false), 3
		);

		this.nodeBox = new Box(
			x, y, 
			this.descBox.w + sizeInit.sideWPx + 6, 
			this.descBox.h + 4, 3
		);
	}

	drawNode(){
		this.nodeBox.drawBox(DARK_RED);

		this.descBox.drawBox(DARK_RED);
		this.descBox.drawBar(2, 0, this.descBox.stringLength(4), LIGHT_RED);
		this.descBox.drawLine(4, DARK_RED);
		this.descBox.drawLine(5, DARK_RED, 2);
		this.descBox.drawBar(7, 0, this.descBox.stringLength(4), LIGHT_RED);

		this.sideBox1.drawBox(DARK_RED);
		this.sideBox2.drawBox(DARK_RED);
		this.sideBox3.drawBox(DARK_RED);
	}
}
// Node within which the user writes their code
class ComputeNode{
	constructor(x, y, sizeInit){
		this.codeBox = new BoxCode(
			x+2, y+2, 
			sizeInit.lineW, 
			sizeInit.lines, 
			sizeInit.extraH, 
			sizeInit.offsetY
		);

		this.nodeType = 1;

		// Expands the five boxes next to the codeBox to match its height
		var expand = this.codeBox.h - 5*(2*LINE_HEIGHT + CHAR_GAP*3 + 1) - 8;
		if(expand < 0) expand = 0; // Don't want them to compress
		function expandCalc(boxNum, divide){ 
			if(expand == 0) return 0;
			boxNum *= 2;
			var total = 2*(Math.floor((expand-boxNum-1)/(INFO_BOXES*2))+1);
			if((expand-boxNum-1)%(INFO_BOXES*2) == 0) total--;
			if(divide) total = Math.floor(total/2);
			return total;
		} // See expand.txt to see the desired I/O behavior
		
		// Initialize the ACC box
		this.accBox = new BoxText(
			x+this.codeBox.w+4, 
			y+2, 
			sizeInit.sideW, 
			2, sizeInit.extraH + expandCalc(0, false),
			sizeInit.offsetY + expandCalc(0, true), true
		);
		this.ACC = 0;
		this.accBox.setString(0, "ACC");
		
		// Initialize the BAK box
		this.bakBox = new BoxText(
			x+this.codeBox.w+4, 
			this.accBox.y+this.accBox.h + 2, 
			sizeInit.sideW, 
			2, sizeInit.extraH + expandCalc(1, false),
			sizeInit.offsetY + expandCalc(1, true), true
		);
		this.BAK = 0;
		this.bakBox.setString(0, "BAK");
		
		// Initialize the LAST box
		this.lastBox = new BoxText(
			x+this.codeBox.w+4, 
			this.bakBox.y+this.bakBox.h + 2, 
			sizeInit.sideW, 
			2, sizeInit.extraH + expandCalc(2, false),
			sizeInit.offsetY + expandCalc(2, true), true
		);
		this.LAST = null;
		this.lastBox.setString(0, "LAST");
		
		// Initialize the MODE box
		this.modeBox = new BoxText(
			x+this.codeBox.w+4, 
			this.lastBox.y+this.lastBox.h + 2, 
			sizeInit.sideW, 
			2, sizeInit.extraH + expandCalc(3, false),
			sizeInit.offsetY + expandCalc(3, true), true
		);
		this.MODE = "IDLE";
		this.modeBox.setString(0, "MODE");
		
		// Initialize the IDLE box
		this.idleBox = new BoxText(
			x+this.codeBox.w+4, 
			this.modeBox.y+this.modeBox.h + 2, 
			sizeInit.sideW, 
			2, sizeInit.extraH + expandCalc(4, false),
			sizeInit.offsetY + expandCalc(4, true), true
		);
		this.IDLE = 0;
		this.idleBox.setString(0, "IDLE");

		this.nodeBox = new Box(
			x, y, this.codeBox.w+sizeInit.sideWPx + 6, this.codeBox.h + 4
		);
	}
	
	drawNode(select){
		this.nodeBox.drawBox(WHITE);
		
		// Draws the editable codeBox and all relevant bars
		this.codeBox.drawBox(WHITE);
		this.codeBox.drawAllLinesAndBars(select);

		// Draws the ACC box
		this.accBox.drawBox(WHITE);
		this.accBox.drawLine(0, INFO_GRAY);
		this.accBox.setString(1, this.ACC.toString());
		this.accBox.drawLine(1, WHITE);
		
		// Draws the BAK box
		this.bakBox.drawBox(WHITE);
		this.bakBox.drawLine(0, INFO_GRAY);
		if(this.BAK.toString().length + 2 <= this.bakBox.lineW){
			this.bakBox.setString(1, "(" + this.BAK.toString() + ")");
		}else{
			this.bakBox.setString(1, this.BAK.toString());
		}
		this.bakBox.drawLine(1, WHITE);
		
		// Draws the LAST box
		this.lastBox.drawBox(WHITE);
		this.lastBox.drawLine(0, INFO_GRAY);
		if(this.LAST){
			this.lastBox.setString(1, this.LAST.toString());
		}else{
			this.lastBox.setString(1, "N/A");
		}
		this.lastBox.drawLine(1, WHITE);
		
		// Draws the MODE box
		this.modeBox.drawBox(WHITE);
		this.modeBox.drawLine(0, INFO_GRAY);
		this.modeBox.setString(1, this.MODE.toString());
		this.modeBox.drawLine(1, WHITE);
		
		// Draws the IDLE box
		this.idleBox.drawBox(WHITE);
		this.idleBox.drawLine(0, INFO_GRAY);
		this.idleBox.setString(1, this.IDLE.toString() + "%");
		this.idleBox.drawLine(1, WHITE);
	}
	
	haltExecution(){
		this.codeBox.currentLine = -1;
		this.ACC = 0;
		this.BAK = 0;
		this.LAST = null;
		this.MODE = "IDLE";
		this.IDLE = 0;
	}
}
// Stack memory node. Stores values given to it, which can then be retrieved
class StackMemNode{
	constructor(x, y, sizeInit){
		this.descBox = new BoxText(
			x+2, y+2, 
			sizeInit.lineW, 
			sizeInit.lines, 
			sizeInit.extraH, 
			sizeInit.offsetY, 
			true
		);
		this.descBox.setString(7, "STACK MEMORY NODE");
		
		this.memoryBox = new BoxText(
			x+this.descBox.w+4, y+2, 
			sizeInit.sideW, 
			sizeInit.lines, 
			sizeInit.extraH,
			sizeInit.offsetY, 
			true
		);

		this.nodeBox = new Box(
			x, y, 
			this.descBox.w + sizeInit.sideWPx + 6, 
			this.descBox.h + 4
		);
	}
	
	drawNode(){
		this.nodeBox.drawBox(WHITE);
		
		// Draws the description box ("STACK MEMORY NODE")
		this.descBox.drawBox(WHITE);
		this.descBox.drawBar(5, 0, this.descBox.stringLength(7), TRUE_WHITE);
		this.descBox.drawLine(7, WHITE);
		this.descBox.drawBar(9, 0, this.descBox.stringLength(7), TRUE_WHITE);
		
		this.memoryBox.drawBox(WHITE);
		// Prints out each value in memory
		for(var i=0; i<NODE_HEIGHT; i++){
			// There shouldn't be any lower ones if the current line is empty
			if(!this.memoryBox.getString(i)) break;
			this.memoryBox.drawLine(i, WHITE);
		}
	}
}

// Holds all nodes. Coordinates node communication and mouse selection
class NodeContainer{
	constructor(nodesType){
		this.nodesW = nodesType[0].length; // Width of table of nodes
		this.nodesH = nodesType.length; // Height of table of nodes

		this.selectedNode = -1;
		this.noSelect = new Selection(); // Passed to unselected nodes
		this.select = new Selection(); // Used for actually selected node
		this.select.focus.line = 1;
		this.select.focus.char = 3;
		this.select.start.line = 2;
		this.select.start.char = 2;
		this.select.end.line = 2;
		this.select.end.char = 3;

		var sizeInit = {
			lineW: NODE_WIDTH+1, // Width of line (chars)
			lines: NODE_HEIGHT, // Number of lines
			extraH: CHAR_GAP*2, // Extra height of main text box (px)
			offsetY: CHAR_GAP, // Distance lines are pushed down (px)
			sideW: ACC_MIN.toString().length+1, // Width of side boxes (chars)
			sideWPx: 0 // Width of side boxes (px)
		}
		sizeInit.sideWPx = sizeInit.sideW*CHAR_WIDTH + CHAR_GAP*2;

		this.nodes = [];
		var nodeY = 53;
		for(var y=0; y<this.nodesH; y++){
			var nodeX = 355;
			for(var x=0; x<this.nodesW; x++){
				if(nodesType[y][x] == 0){
					this.nodes.push(new CorruptNode(nodeX, nodeY, sizeInit));
				}else if(nodesType[y][x] == 1){
					this.nodes.push(new ComputeNode(nodeX, nodeY, sizeInit));
				}else if(nodesType[y][x] == 2){
					this.nodes.push(new StackMemNode(nodeX, nodeY, sizeInit));
				}
				nodeX += this.nodes[0].nodeBox.w + 46;
			}
			nodeY += this.nodes[0].nodeBox.h + 40;
		}
	}

	setSelection(mPos, cont_start_end){

	}

	drawNodes(){
		for(var i=0; i<this.nodes.length; i++){
			if(this.nodes[i].nodeType == 1){
				this.nodes[i].drawNode(this.noSelect);
			}else{
				this.nodes[i].drawNode();
			}
		}
	}
}

var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");

ctx.strokeStyle = TRUE_WHITE;
ctx.imageSmoothingEnabled = false;
ctx.font = CHAR_HEIGHT/3*4 + "pt tis-100-copy";

var allNodes = new NodeContainer([
	[1, 1, 2, 0], 
	[0, 1, 1, 1], 
	[1, 2, 0, 1]
]);

// Source: https://stackoverflow.com/a/17130415
function  getMousePos(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	var scaleX = canvas.width / rect.width;
	var scaleY = canvas.height / rect.height;

	return {
		x: Math.floor((evt.clientX - rect.left) * scaleX), 
		y: Math.floor((evt.clientY - rect.top) * scaleY)
	}
}

var mPos = { x: 0, y: 0 } // Mouse position
var mDown = false; // If the left mouse button is held down
canvas.addEventListener("mousemove", function(evt) {
	mPos = getMousePos(canvas, evt);
	if(mDown) allNodes.setSelection(mPos, 0);
}, false);
canvas.addEventListener("mousedown", function(evt) {
	mDown = true;
	allNodes.setSelection(mPos, 1);
}, false);
canvas.addEventListener("mouseup", function(evt) {
	mDown = false;
	allNodes.setSelection(mPos, 2);
}, false);

for(var i=0; i<NODE_HEIGHT-1; i++){
	allNodes.nodes[0].codeBox.setString(i, "testing " + i);
}
allNodes.nodes[0].codeBox.setString(NODE_HEIGHT-1, "1: mov r#ght, right");

for(var i=0; i<NODE_HEIGHT-1; i++){
	allNodes.nodes[1].codeBox.setString(i, "testing " + (i+NODE_HEIGHT-1));
}
allNodes.nodes[1].codeBox.setString(NODE_HEIGHT-1, "1: mov r#ght, right");
allNodes.nodes[1].codeBox.currentLine = NODE_HEIGHT-1;

allNodes.nodes[2].memoryBox.setString(0, "254");
allNodes.nodes[2].memoryBox.setString(1, "498");
allNodes.nodes[2].memoryBox.setString(2, "782");

function gameLoop() {
	
	ctx.beginPath();
	ctx.rect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = BLACK;
	ctx.fill();

	ctx.fillStyle = TRUE_WHITE;
	ctx.fillText("ThE qUiCk BrOwN fOx JuMpS oVeR tHe LaZy DoG.", 10, 22);
	ctx.fillText("1234567890", 10, 22+LINE_HEIGHT);
	ctx.fillText("!\"#$%&'()*+,-./:;<=>?@[\\]_`{|}~", 10, 22+LINE_HEIGHT*2);

	allNodes.drawNodes();

	ctx.fillStyle = WHITE;
	ctx.fillRect(mPos.x, mPos.y, 5, 5);

	requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);