"use strict";
(function(){

const NODE_WIDTH = 18; // Characters that will fit on a BoxCode's line
const NODE_HEIGHT = 15; // Number of string lines in a node. Min: 14
const ACC_MAX = 999; // Maximum value that an ACC can contain
const ACC_MIN = -ACC_MAX; // Minimum value
const CHAR_HEIGHT = 9; // Height of the actual characters. Multiple of 9
const CHAR_WIDTH = CHAR_HEIGHT/9*8; // Characters' width, including pixel after
const CHAR_GAP = 3; // Gap between rows and from sides. Min: 2
const LINE_HEIGHT = CHAR_HEIGHT + CHAR_GAP; // Used for spacing lines apart
const INFO_BOXES = 5; // For ACC, BAK, LAST, MODE, and IDLE

const DIM_WHITE = "#C8C8C8"; // Used for the boxes and code
const DESC_WHITE = "#B4B4B4" // Used for text not in a node
const CURSOR_WHITE = "#E2E2E2"; // Used for that blinking thingy
const WHITE = "#FFFFFF"; // White
const BLACK = "#000000"; // Black
const COMMENT_GRAY = "#7A7A7A"; // Used for comments within code
const INFO_GRAY = "#8D8D8D"; // Used for the ACC, BAK, etc.
const SELECT_GRAY = "#ABABAB"; // Used for highlighting sections of code
const ACTIVE_EXEC = "#FBFBFB"; // Used for the bar over executing code
const WAIT_EXEC = "#9C9C9C"; // Used for the bar over stalled code
const DARK_RED = "#A60D0D"; // Used for corruptNode boxes and text
const LIGHT_RED = "#BF0D0D"; // Used for corruptNode's red bars and syntax error
const MEM_RED = "#480A0A"; // Used for highlighting the top stack memory value

const ALLOWED_CHARS = /^[\x20-\x7E]*$/; // printable ASCII characters in regex
const RN_END = "\x0D\x0A"; // \r\n: Added to ends for copy/paste compatibility

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

class StringList{
	constructor(lineW, maxLines){
		this.lineW = lineW;
		this.maxLines = maxLines;

		let lineString = [];
		lineString.push("");
		this.strAdd = function(index){
			lineString.splice(index+1, 0, "");
		}
		this.strDel = function(index){
			if(index >= lineString.length) return;
			if(lineString.length <= 1) return; // Don't want an empty lineString
			lineString.splice(index, 1);
		}
		this.strCount = function(){
			return lineString.length;
		}
		this.strGet = function(index){
			if(index >= lineString.length) return "";
			return lineString[index];
		}
		this.strSet = function(index, stringVar){
			if(index >= this.maxLines) return; // Index out of range
			while(index >= lineString.length) 
				lineString.push(""); // Expand lineString
			// The substr crops the stringVar to prevent text overflow
			lineString[index] = stringVar.substr(0, this.lineW);
		}
		this.strLength = function(index){
			if(index >= lineString.length) return 0;
			return lineString[index].length;
		}
		this.strCut = function(index, charI){ // Cuts string charI from end
			if(index >= lineString.length) return "";
			if(charI > lineString[index].length) return "";
			let cutStr = lineString[index].substr(-charI);
			lineString[index] = lineString[index].slice(0, -charI);
			return cutStr;
		}
		this.charAdd = function(index, charI, charVar){
			if(index >= lineString.length) return;
			if(charI > lineString[index].length) 
				charI = lineString[index].length;
			let str = lineString[index];
			this.strSet(index, 
				str.substr(0, charI) + charVar + str.substr(charI));
		}
		this.charDel = function(index, charI){
			if(index >= lineString.length) return;
			if(charI > lineString[index].length) return;
			let str = lineString[index];
			this.strSet(index, str.substr(0, charI-1) + str.substr(charI));
		}
	}
}
// Can draw text and bars now. Dimensions set relative to font dimensions
class BoxText extends Box{
	constructor(
		x, y, lineW, maxLines, extraH, offsetY, centered=false, borderW=1
	){
		super(
			x, y, 
			lineW*CHAR_WIDTH + CHAR_GAP*2, 
			maxLines*LINE_HEIGHT + CHAR_GAP + 1 + extraH,
			borderW
		);
		this.lineW = lineW; // Width of the box in terms of characters
		this.maxLines = maxLines; // Maximum number of string lines
		this.extraH = extraH; // Extra height of the box in pixels
		this.offsetY = offsetY; // Custom y-offset for text lines in pixels
		this.centered = centered; // If true, center text within box's width

		this.str = new StringList(this.lineW, this.maxLines);
	}

	// Draws text from lineString to the canvas (extraY used for "FAILURE")
	drawLine(line, color=ctx.fillStyle, extraY=0){
		let offsetX = 0;
		if(this.centered){ // Centers text within box's width
			offsetX = (CHAR_WIDTH/2)*(this.lineW - this.str.strLength(line));
		}
		ctx.fillStyle = color;
		ctx.fillText(
			this.str.strGet(line), 
			this.x+CHAR_GAP + offsetX, 
			this.y+this.offsetY + extraY + (line+1)*LINE_HEIGHT
		);
	}
	// Used to draw those solid color boxes (and bars)
	drawBar(line, startChar, endChar, barColor, extraStart=0, extraEnd=0){
		let offsetX = 0;
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
		// charI2 accounts for expected charI position during shorter lines
		this.cursor = { line: -1, charI: 0, charI2: 0 }; // Cursor location
		this.start = { line: -1, charI: 0 }; // Start of selection
		this.end = { line: -1, charI: 0 }; // End of selection

		// Ensures the blinking thingy doesn't fade when it moves around
		this.cursorTime = new Date().getTime();
	}

	lineSelected(line){
		if(
			this.start.line == this.end.line && 
			this.start.charI == this.end.charI
		) return false;
		if(this.start.line <= line && this.end.line >= line) return true;
		return false;
	}
	charSelected(line, charI){
		if(!this.lineSelected(line)) return false;
		if(this.start.charI <= charI && this.end.charI > charI) return true;
		return false;
	}

	cursorMove(){
		this.cursorTime = new Date().getTime();
	}

	resetSelection(){
		this.start = { line: -1, charI: 0 };
		this.end = { line: -1, charI: 0 };
	}
	focusLost(){
		if(all) this.cursor = { line: -1, charI: 0, charI2: 0 };
		resetSelection();
	}
}
// Can divide a line into different colors for comments and selection
class BoxCode extends BoxText{
	constructor(x, y, lineW, maxLines, extraH, offsetY){
		super(x, y, lineW, maxLines, extraH, offsetY, false, 1);
		this.currentLine = -1; // Indicates currently executing line
		this.executable = true; // True if the current line was just reached
	}

	// Draws text, executing line or selected text bars, and the blinking thingy
	drawAllLinesAndBars(select){
		// Draws bar under currently executing line
		if(this.currentLine != -1){ // Only false before the program is started
			if(this.executable) ctx.fillStyle = ACTIVE_EXEC;
			else ctx.fillStyle = WAIT_EXEC;
			this.drawBar(
				this.currentLine, 0, this.lineW, ctx.fillStyle, 
				CHAR_GAP, CHAR_GAP-2
			);
		}

		// Draws bars under selected text and the text itself
		for(let i=0; i<this.maxLines; i++){ 
			if(!this.str.strGet(i)) continue; // String is empty

			let commentStart = this.str.strGet(i).indexOf("#");
			let selectStart = -1;
			let selectEnd = -1;
			// Draws bar under selected text
			if(select.lineSelected(i) && this.currentLine == -1){
				if(select.start.line < i) selectStart = 0;
				else selectStart = select.start.charI;

				if(select.end.line > i) selectEnd = this.str.strLength(i);
				else selectEnd = select.end.charI;

				this.drawBar(i, selectStart, selectEnd, SELECT_GRAY);
			}

			this.drawSplitLine(i, commentStart, selectStart, selectEnd);
		}

		// Blinking thingy
		if(this.currentLine == -1 && select.cursor.line != -1){
			let time = new Date();
			time = time.getTime() % 800;
			if(time > 400){ // Get the blinking thingy to blink every 800ms
				this.drawBar(
					select.cursor.line, select.cursor.charI, 
					select.cursor.charI+1, CURSOR_WHITE
				);
			}
		}
	}
	// Draws text lines, using seperate coloring for comments/selection
	drawSplitLine(line, commentStart, selectStart, selectEnd){
		// Only one color needed if executing, or if no comments/selections
		if(
			this.currentLine == line || 
			(commentStart == -1 && selectStart == -1)
		){
			if(this.currentLine == line) ctx.fillStyle = BLACK;
			else ctx.fillStyle = DIM_WHITE;

			this.drawLine(line);
			return;
		}
		// To ensure that the Math.min calculations work properly
		if(commentStart == -1) commentStart = NODE_WIDTH;
		if(selectStart == -1) selectStart = selectEnd = NODE_WIDTH;

		let stringParts = []; // The cut string
		let stringStart = []; // Index number of from where the string was cut
		let stringColor = []; // Color of the string_part

		if(Math.min(commentStart, selectStart) > 0){
			stringParts.push(this.str.strGet(line).substr(
				0, Math.min(commentStart, selectStart)));
			stringStart.push(0);
			stringColor.push(DIM_WHITE);
		}
		if(commentStart != NODE_WIDTH && selectStart == NODE_WIDTH){
			if(commentStart > 0){
				stringParts.push(this.str.strGet(line).substr(commentStart));
				stringStart.push(commentStart);
				stringColor.push(COMMENT_GRAY);
			}else{
				stringParts.push(this.str.strGet(line));
				stringStart.push(0);
				stringColor.push(COMMENT_GRAY);
			}
		}else if(commentStart == NODE_WIDTH && selectStart != NODE_WIDTH){
			if(selectStart > 0){
				stringParts.push(this.str.strGet(line).substr(
					selectStart, selectEnd));
				stringStart.push(selectStart);
				stringColor.push(WHITE);

				if(selectEnd < this.str.strLength(line)){
					stringParts.push(this.str.strGet(line).substr(selectEnd));
					stringStart.push(selectEnd);
					stringColor.push(DIM_WHITE);
				}
			}else{
				stringParts.push(this.str.strGet(line).substr(
					selectStart, selectEnd));
				stringStart.push(selectStart);
				stringColor.push(WHITE);

				if(selectEnd < this.str.strLength(line)){
					stringParts.push(this.str.strGet(line).substr(selectEnd));
					stringStart.push(selectEnd);
					stringColor.push(DIM_WHITE);
				}
			}
		}else{
			if(commentStart <= selectStart){
				if(commentStart < selectStart){
					stringParts.push(this.str.strGet(line).substr(
						commentStart, selectStart));
					stringStart.push(commentStart);
					stringColor.push(COMMENT_GRAY);
				}

				stringParts.push(this.str.strGet(line).substr(
					selectStart, selectEnd));
				stringStart.push(selectStart);
				stringColor.push(DIM_WHITE);

				if(selectEnd < this.str.strLength(line)){
					stringParts.push(this.str.strGet(line).substr(selectEnd));
					stringStart.push(selectEnd);
					stringColor.push(COMMENT_GRAY);
				}
			}else if(selectStart < commentStart && commentStart < selectEnd){
				stringParts.push(this.str.strGet(line).substr(
					selectStart, commentStart));
				stringStart.push(selectStart);
				stringColor.push(WHITE);

				stringParts.push(this.str.strGet(line).substr(
					commentStart, selectEnd));
				stringStart.push(commentStart);
				stringColor.push(DIM_WHITE);

				if(selectEnd < this.str.strLength(line)){
					stringParts.push(this.str.strGet(line).substr(selectEnd));
					stringStart.push(selectEnd);
					stringColor.push(COMMENT_GRAY);
				}
			}else if(commentStart >= selectEnd){
				stringParts.push(this.str.strGet(line).substr(
					selectStart, selectEnd));
				stringStart.push(selectStart);
				stringColor.push(WHITE);

				if(commentStart > selectEnd){
					stringParts.push(this.str.strGet(line).substr(
						selectEnd, commentStart));
					stringStart.push(commentStart);
					stringColor.push(DIM_WHITE);
				}

				stringParts.push(this.str.strGet(line).substr(commentStart));
				stringStart.push(commentStart);
				stringColor.push(COMMENT_GRAY);
			}
		}

		for(let i=0; i<stringParts.length; i++){
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
		this.nodeType = 0;

		this.descBox = new BoxText(
			x+2, y+2, 
			sizeInit.lineW, 
			sizeInit.maxLines, 
			sizeInit.extraH, 
			sizeInit.offsetY, 
			true
		);

		this.descBox.str.strSet(4, "COMMUNICATION");
		this.descBox.str.strSet(5, "FAILURE");
		
		const remainder = (this.descBox.h-2)%4;
		const sideX = x+this.descBox.w + 2;
		const sideW = sizeInit.sideWPx + 4;
		const sideH = (this.descBox.h - remainder)/2 + 3;
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
		this.descBox.drawBar(2, 0, this.descBox.str.strLength(4), LIGHT_RED);
		this.descBox.drawLine(4, DARK_RED);
		this.descBox.drawLine(5, DARK_RED, 2);
		this.descBox.drawBar(7, 0, this.descBox.str.strLength(4), LIGHT_RED);

		this.sideBox1.drawBox(DARK_RED);
		this.sideBox2.drawBox(DARK_RED);
		this.sideBox3.drawBox(DARK_RED);
	}
}
// Node within which the user writes their code
class ComputeNode{
	constructor(x, y, sizeInit){
		this.nodeType = 1;

		this.codeBox = new BoxCode(
			x+2, y+2, 
			sizeInit.lineW, 
			sizeInit.maxLines, 
			sizeInit.extraH, 
			sizeInit.offsetY
		);

		// Expands the five boxes next to the codeBox to match its height
		const expand = this.codeBox.h - 5*(2*LINE_HEIGHT + CHAR_GAP*3 + 1) - 8;
		if(expand < 0) expand = 0; // Don't want them to compress
		function expandCalc(boxNum, divide){ 
			if(expand == 0) return 0;
			boxNum *= 2;
			let total = 2*(Math.floor((expand-boxNum-1)/(INFO_BOXES*2))+1);
			if((expand-boxNum-1)%(INFO_BOXES*2) == 0) total -= 1;
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
		this.accBox.str.strSet(0, "ACC");
		
		// Initialize the BAK box
		this.bakBox = new BoxText(
			x+this.codeBox.w+4, 
			this.accBox.y+this.accBox.h + 2, 
			sizeInit.sideW, 
			2, sizeInit.extraH + expandCalc(1, false),
			sizeInit.offsetY + expandCalc(1, true), true
		);
		this.BAK = 0;
		this.bakBox.str.strSet(0, "BAK");
		
		// Initialize the LAST box
		this.lastBox = new BoxText(
			x+this.codeBox.w+4, 
			this.bakBox.y+this.bakBox.h + 2, 
			sizeInit.sideW, 
			2, sizeInit.extraH + expandCalc(2, false),
			sizeInit.offsetY + expandCalc(2, true), true
		);
		this.LAST = null;
		this.lastBox.str.strSet(0, "LAST");
		
		// Initialize the MODE box
		this.modeBox = new BoxText(
			x+this.codeBox.w+4, 
			this.lastBox.y+this.lastBox.h + 2, 
			sizeInit.sideW, 
			2, sizeInit.extraH + expandCalc(3, false),
			sizeInit.offsetY + expandCalc(3, true), true
		);
		this.MODE = "IDLE";
		this.modeBox.str.strSet(0, "MODE");
		
		// Initialize the IDLE box
		this.idleBox = new BoxText(
			x+this.codeBox.w+4, 
			this.modeBox.y+this.modeBox.h + 2, 
			sizeInit.sideW, 
			2, sizeInit.extraH + expandCalc(4, false),
			sizeInit.offsetY + expandCalc(4, true), true
		);
		this.IDLE = 0;
		this.idleBox.str.strSet(0, "IDLE");

		this.nodeBox = new Box(
			x, y, this.codeBox.w+sizeInit.sideWPx + 6, this.codeBox.h + 4
		);
	}
	
	drawNode(select = new Selection()){
		this.nodeBox.drawBox(DIM_WHITE);
		
		// Draws the editable codeBox and all relevant bars
		this.codeBox.drawBox(DIM_WHITE);
		this.codeBox.drawAllLinesAndBars(select);

		// Draws the ACC box
		this.accBox.drawBox(DIM_WHITE);
		this.accBox.drawLine(0, INFO_GRAY);
		this.accBox.str.strSet(1, this.ACC.toString());
		this.accBox.drawLine(1, DIM_WHITE);
		
		// Draws the BAK box
		this.bakBox.drawBox(DIM_WHITE);
		this.bakBox.drawLine(0, INFO_GRAY);
		if(this.BAK.toString().length + 2 <= this.bakBox.lineW){
			this.bakBox.str.strSet(1, "(" + this.BAK.toString() + ")");
		}else{
			this.bakBox.str.strSet(1, this.BAK.toString());
		}
		this.bakBox.drawLine(1, DIM_WHITE);
		
		// Draws the LAST box
		this.lastBox.drawBox(DIM_WHITE);
		this.lastBox.drawLine(0, INFO_GRAY);
		if(this.LAST){
			this.lastBox.str.strSet(1, this.LAST.toString());
		}else{
			this.lastBox.str.strSet(1, "N/A");
		}
		this.lastBox.drawLine(1, DIM_WHITE);
		
		// Draws the MODE box
		this.modeBox.drawBox(DIM_WHITE);
		this.modeBox.drawLine(0, INFO_GRAY);
		this.modeBox.str.strSet(1, this.MODE.toString());
		this.modeBox.drawLine(1, DIM_WHITE);
		
		// Draws the IDLE box
		this.idleBox.drawBox(DIM_WHITE);
		this.idleBox.drawLine(0, INFO_GRAY);
		this.idleBox.str.strSet(1, this.IDLE.toString() + "%");
		this.idleBox.drawLine(1, DIM_WHITE);
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
		this.nodeType = 2;

		this.descBox = new BoxText(
			x+2, y+2, 
			sizeInit.lineW, 
			sizeInit.maxLines, 
			sizeInit.extraH, 
			sizeInit.offsetY, 
			true
		);
		this.descBox.str.strSet(7, "STACK MEMORY NODE");
		
		this.memoryBox = new BoxText(
			x+this.descBox.w+4, y+2, 
			sizeInit.sideW, 
			sizeInit.maxLines, 
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
		this.nodeBox.drawBox(DIM_WHITE);
		
		// Draws the description box ("STACK MEMORY NODE")
		this.descBox.drawBox(DIM_WHITE);
		this.descBox.drawBar(5, 0, this.descBox.str.strLength(7), WHITE);
		this.descBox.drawLine(7, DIM_WHITE);
		this.descBox.drawBar(9, 0, this.descBox.str.strLength(7), WHITE);
		
		this.memoryBox.drawBox(DIM_WHITE);
		// Prints out each value in memory
		for(let i=0; i<NODE_HEIGHT; i++){
			// There shouldn't be any lower ones if the current line is empty
			if(!this.memoryBox.str.strGet(i)) break;
			this.memoryBox.drawLine(i, DIM_WHITE);
		}
	}
}

// Holds all nodes. Coordinates keyboard input and mouse selection
class NodeContainer{
	constructor(nodesType){
		this.nodesW = nodesType[0].length; // Width of table of nodes
		this.nodesH = nodesType.length; // Height of table of nodes

		this.focusNodeI = -1; // Indicates which node the user is focused on
		this.focusNode = nodesType; // Used as an object reference (redefined)

		this.select = new Selection(); // Passed to the currently focused node
		this.cursor = this.select.cursor; // Used as an object reference

		let sizeInit = {
			lineW: NODE_WIDTH+1, // Width of line (chars)
			maxLines: NODE_HEIGHT, // Maximum number of lines
			extraH: CHAR_GAP*2, // Extra height of main text box (px)
			offsetY: CHAR_GAP, // Distance lines are pushed down (px)
			sideW: ACC_MIN.toString().length+1, // Width of side boxes (chars)
			sideWPx: 0 // Width of side boxes (px)
		}
		sizeInit.sideWPx = sizeInit.sideW*CHAR_WIDTH + CHAR_GAP*2;

		this.nodes = [];
		let nodeY = 53;
		for(let y=0; y<this.nodesH; y++){
			let nodeX = 355;
			for(let x=0; x<this.nodesW; x++){
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

	mouseMove(mPos){ // Mouse held down, mouse movement

	}
	lmbDown(mPos){ // Left mouse button clicked
		let boxX = 0;
		let boxY = 0;
		for(let i=0; i<=this.nodes.length; i++){
			// No nodes were selected
			if(i == this.nodes.length){
				this.focusNodeI = -1;
				break;
			}
			// codeBox only exists within computeNodes
			if(this.nodes[i].nodeType != 1) continue;

			boxX = this.nodes[i].codeBox.x + CHAR_GAP;
			boxY = this.nodes[i].codeBox.y + 
				this.nodes[i].codeBox.offsetY + CHAR_GAP - 
				Math.floor(CHAR_GAP/2);
			if(
				mPos.x >= boxX && 
				mPos.x < boxX + (NODE_WIDTH+1)*CHAR_WIDTH && 
				mPos.y >= boxY && 
				mPos.y < boxY + NODE_HEIGHT*LINE_HEIGHT
			){ // Collision detection
				this.focusNodeI = i;
				// Huzzah for object references
				this.focusNode = this.nodes[this.focusNodeI].codeBox.str;

				this.cursor.line = Math.min(
					this.nodes[i].codeBox.str.strCount()-1,
					Math.floor((mPos.y-boxY)/LINE_HEIGHT));

				this.cursor.charI = Math.min(
					this.nodes[i].codeBox.str.strLength(this.cursor.line), 
					Math.floor((mPos.x-boxX)/CHAR_WIDTH));

				break;
			}
		}
	}
	lmbUp(mPos){ // Left mouse button released

	}

	addChar(char){
		if(this.focusNodeI == -1) return;
		if(this.focusNode.strLength(this.cursor.line) >= NODE_WIDTH) return;

		this.focusNode.charAdd(this.cursor.line, this.cursor.charI, char);
		this.cursor.charI += 1;
	}
	newLine(){
		if(this.focusNode.strCount() >= NODE_HEIGHT) return;

		let distToEndOfLine = 
			this.focusNode.strLength(this.cursor.line) - this.cursor.charI;

		this.focusNode.strAdd(this.cursor.line);
		this.cursor.line += 1;
		this.cursor.charI = 0;

		if(distToEndOfLine > 0){ // Cursor not at the end of the line
			let strToMove = this.focusNode.strCut(
				this.cursor.line-1, distToEndOfLine);
			this.focusNode.strSet(this.cursor.line, strToMove);
		}
	}
	bakChar(){
		if(this.cursor.charI > 0){
			this.focusNode.charDel(this.cursor.line, this.cursor.charI);
			this.cursor.charI -= 1;
		}else if(this.cursor.line > 0){
			if(
				this.focusNode.strLength(this.cursor.line-1) + 
				this.focusNode.strLength(this.cursor.line) <=
				NODE_WIDTH
			){
				this.cursor.line -= 1;
				this.cursor.charI = this.focusNode.strLength(this.cursor.line);

				let combinedStr = 
					this.focusNode.strGet(this.cursor.line) + 
					this.focusNode.strGet(this.cursor.line+1);
				this.focusNode.strSet(this.cursor.line, combinedStr);

				this.focusNode.strDel(this.cursor.line+1);
			}
		}
	}
	delChar(){
		if(this.cursor.charI < this.focusNode.strLength(this.cursor.line)){
			this.focusNode.charDel(this.cursor.line, this.cursor.charI+1);
		}else if(this.cursor.line < this.focusNode.strCount()){
			if(
				this.focusNode.strLength(this.cursor.line) + 
				this.focusNode.strLength(this.cursor.line+1) <=
				NODE_WIDTH
			){
				let combinedStr = 
					this.focusNode.strGet(this.cursor.line) + 
					this.focusNode.strGet(this.cursor.line+1);
				this.focusNode.strSet(this.cursor.line, combinedStr);

				this.focusNode.strDel(this.cursor.line+1);
			}
		}
	}

	arrowKey(keyCode){
		if(keyCode == 0){ // Left
			if(this.cursor.charI > 0){
				this.cursor.charI -= 1;
			}else if(this.cursor.line > 0){
				this.cursor.line -= 1;
				this.cursor.charI = this.focusNode.strLength(this.cursor.line);
			}
		}else if(keyCode == 1){ // Up

		}else if(keyCode == 2){ // Right
			if(this.cursor.charI < this.focusNode.strLength(this.cursor.line)){
				this.cursor.charI += 1;
			}else if(this.cursor.line + 1 < this.focusNode.strCount()){
				this.cursor.line += 1;
				this.cursor.charI = 0;
			}
		}else if(keyCode == 3){ // Down
			
		}
	}

	drawNodes(){
		for(let i=0; i<this.nodes.length; i++){
			if(this.focusNodeI == i) this.nodes[i].drawNode(this.select);
			else this.nodes[i].drawNode();
		}
	}
}

let canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");

ctx.strokeStyle = WHITE;
ctx.font = CHAR_HEIGHT/3*4 + "pt tis-100-copy";

let allNodes = new NodeContainer([
	[1, 1, 2, 0], 
	[0, 1, 1, 1], 
	[1, 2, 0, 1]
]);

// Source: https://stackoverflow.com/a/17130415
function  getMousePos(canvas, evt) {
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
}, false);
window.addEventListener("mousedown", function(evt) {
	mDown = true;
	allNodes.lmbDown(mPos);
}, false);
window.addEventListener("mouseup", function(evt) {
	mDown = false;
	allNodes.lmbUp(mPos);
}, false);

window.addEventListener("keypress", function(evt) {
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
}, false);
window.addEventListener("keydown", function(evt) {
	// Prevent space and arrow keys from causing unwanted scrolling
	if([32, 37, 38, 39, 40].indexOf(evt.keyCode) > -1)
		evt.preventDefault();

	switch(evt.keyCode){
		case 13: allNodes.newLine(); // Enter
			break;
		case 32: allNodes.addChar(" "); // Space
			break;
		case  8: allNodes.bakChar(); // Backspace
			break;
		case 46: allNodes.delChar(); // Delete
			break;
		case 37: allNodes.arrowKey(0); // Left
			break;
		case 38: allNodes.arrowKey(1); // Up
			break;
		case 39: allNodes.arrowKey(2); // Right
			break;
		case 40: allNodes.arrowKey(3); // Down
			break;
	}
}, false);
window.addEventListener("blur", function(evt) {
	allNodes.focusNodeI = -1;
	allNodes.select.focusLost();
}, false);

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
