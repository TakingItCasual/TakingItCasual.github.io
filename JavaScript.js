var NODE_WIDTH = 18; // Characters that will fit on a EditBoxText's line
var NODE_HEIGHT = 15; // Number of writable lines in a node. min: 14
var ACC_MAX = 999; // Maximum value that an ACC can contain
var ACC_MIN = -ACC_MAX; // Minimum value
var CHAR_HEIGHT = 9; // Height of the actual characters. Multiple of 9
var CHAR_WIDTH = CHAR_HEIGHT/9*8; // Characters' width, including pixel after
var CHAR_GAP = 3; // Gap between rows and from sides. Min: 2
var LINE_HEIGHT = CHAR_HEIGHT + CHAR_GAP; // Used for spacing lines apart
var INFO_BOXES = 5; // For ACC, BAK, LAST, MODE, and IDLE

var WHITE = "#C8C8C8"; // Used for the boxes and code
var TRUE_WHITE = "#FFFFFF"; // White
var BLACK = "#000000"; // Black
var DESC_WHITE = "#B4B4B4" // Used for text not in a node
var COMMENT_GRAY = "#7A7A7A"; // Used for comments within code
var INFO_GRAY = "#8D8D8D"; // Used for the ACC, BAK, etc.
var SELECT_GRAY = "#ABABAB"; // Used for highlighting sections of code
var ACTIVE_FOCUS = "#FBFBFB"; // Used for the bar over executing code
var WAIT_FOCUS = "#9C9C9C"; // Used for the bar over stalled code
var DARK_RED = "#A60D0D"; // Used for corruptNode boxes and text
var LIGHT_RED = "#BF0D0D"; // Used for red bars in corruptNode and syntax error
var MEM_RED = "#480A0A"; // Used for highlighting the top stack memory value

// Just your standard box, containing nothing more than its own dimensions
class Box{
	constructor(x, y, w, h, borderW = 1){
		this.x = x + ((borderW-1)/2) + 0.5; // x-pos of box's top left
		this.y = y + ((borderW-1)/2) + 0.5; // y-pos of box's top left
		this.w = w - (borderW - 1); // Box's width
		this.h = h - (borderW - 1); // Box's height
		this.borderW = borderW; // Width of box's border
	}

	drawBox(color = ctx.strokeStyle){
		ctx.strokeStyle = color;
		ctx.lineWidth = this.borderW;
		ctx.strokeRect(this.x, this.y, this.w, this.h);
		ctx.lineWidth = 1;
	}
}
// Can draw text and bars now. Dimensions set relative to font dimensions
class BoxText extends Box{
	constructor(x, y, lineW, lines, extraH, offsetY, centered = false, borderW = 1){
		super(
			x, y, 
			lineW*CHAR_WIDTH + CHAR_GAP*2, 
			lines*LINE_HEIGHT + CHAR_GAP + 1 + extraH,
			borderW
		);
		this.line_string = [];
		for(var i=0; i<lines; i++) this.line_string.push("");
		this.lineW = lineW; // Width of the box in terms of characters
		this.extraH = extraH; // Extra height of the box in pixels
		this.offsetY = offsetY; // Custom y-offset for text lines in pixels
		this.centered = centered; // If true, center text within box's width
	}
	
	// Draws text from line_string to the canvas
	drawLine(line, color = ctx.fillStyle, extraY = 0){ // extraY used for "FAILURE"
		var offsetX = 0;
		if(this.centered){ // Centers text within box's width
			offsetX = (CHAR_WIDTH/2)*(this.lineW - this.line_string[line].length);
		}
		ctx.fillStyle = color;
		ctx.fillText(
			this.line_string[line], 
			this.x+CHAR_GAP + offsetX + 0.5, 
			this.y+this.offsetY + extraY + (line+1)*LINE_HEIGHT + 0.5
		);
	}
	// Used to draw those solid color bars
	drawBar(line, startChar, endChar, barColor, extraStart = 0, extraEnd = 0){
		var offsetX = 0;
		if(this.centered){ // Centers text within box's width
			offsetX = (CHAR_WIDTH/2)*(this.lineW - (endChar - startChar));
		}
		ctx.fillStyle = barColor;
		ctx.fillRect(
			this.x+CHAR_GAP+1 + offsetX + startChar*CHAR_WIDTH - extraStart - 0.5, 
			this.y+this.extraH + (line)*LINE_HEIGHT - 0.5, 
			(endChar-startChar)*CHAR_WIDTH + extraStart + extraEnd, 
			LINE_HEIGHT
		);
	}

	setString(index, string){
		if(index < 0 || index > this.line_string.length-1) return "";
		this.line_string[index] = string;
	}
	stringLength(index){
		if(index < 0 || index > this.line_string.length-1) return 0;
		return this.line_string[index].length;
	}
}

// Used for when the user highlights text in their code
class Selection{
	constructor(){
		this.start = { line: -1, char: 0 };
		this.end = { line: 0, char: 0 };
	}

	get active(){
		if(this.start.line == -1) return false;
		return true;
	}

	reset(){
		this.start.line = -1;
	}
}
// Can divide a line into different colors to accomodate for comments and selection
class EditBoxText extends BoxText{
	constructor(x, y, lineW, lines, extraH, offsetY){
		super(x, y, lineW, lines, extraH, offsetY, false, 1);
		this.currentLine = -1; // Indicates currently executing line 
		this.select = new Selection();
		this.typeFocus = { line: -1, char: 0 }; // Where the user is typing
	}

	// Draws text from all line_strings to the canvas
	drawAllLines(){
		for(var i=0; i<NODE_HEIGHT; i++){ 
			if(!this.line_string[i]) continue;
			if(this.currentLine == i){
				ctx.fillStyle = BLACK;
			}else{
				ctx.fillStyle = WHITE;
			}
			var commentStart = this.line_string[i].indexOf("#");
			if(commentStart == -1 || this.currentLine == i){
				this.drawLine(i);
			}else{
				this.drawLineWComment(i, commentStart);
			}
		}
	}

	// Draws lines containing comments, using another color for the comment
	drawLineWComment(line, split){
		var before_string = this.line_string[line].substr(0, split);
		var after_string = this.line_string[line].substr(split);
		
		ctx.fillStyle = WHITE;
		ctx.fillText(
			before_string, 
			this.x+CHAR_GAP+0.5, 
			this.y+this.offsetY + (line+1)*LINE_HEIGHT + 0.5
		);

		ctx.fillStyle = COMMENT_GRAY;
		ctx.fillText(
			after_string, 
			this.x+CHAR_GAP + CHAR_WIDTH*split + 0.5, 
			this.y+this.offsetY + (line+1)*LINE_HEIGHT + 0.5
		);
	}
}

class CorruptNode{
	constructor(x, y){
		this.descBox = new BoxText(
			x+2, 
			y+2, 
			NODE_WIDTH+1, 
			NODE_HEIGHT, CHAR_GAP*2, 
			CHAR_GAP, true
		);
		this.descBox.setString(4, "COMMUNICATION");
		this.descBox.setString(5, "FAILURE");
		
		var remainder = (this.descBox.h-2)%4;
		var sideBoxX = x+this.descBox.w + 2;
		var sideBoxW = (ACC_MIN.toString().length+1)*CHAR_WIDTH + CHAR_GAP*2 + 4;
		var sideBoxH = (this.descBox.h - remainder)/2 + 3;
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
			sideBoxX,
			y,
			sideBoxW,
			sideBoxH + expandCalc(1, false), 3
		)
		this.sideBox2 = new Box(
			sideBoxX,
			y+(this.descBox.h-remainder)/4 + 1 + expandCalc(2, true) - 0.5,
			sideBoxW,
			sideBoxH + expandCalc(2, false), 3
		)
		this.sideBox3 = new Box(
			sideBoxX,
			y + this.sideBox1.h,
			sideBoxW,
			sideBoxH + expandCalc(3, false), 3
		)

		this.nodeBox = new Box(
			x, y,
			this.descBox.w + this.sideBox1.w + 4,
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
class LogicNode{
	constructor(x, y){
		this.codeBox = new EditBoxText(
			x+2, 
			y+2, 
			NODE_WIDTH+1, 
			NODE_HEIGHT, CHAR_GAP*2, 
			CHAR_GAP
		);
		this.executable = true; // True if the current line was just reached
		
		// Expands the five boxes next to the codeBox to match its height
		var expand = this.codeBox.h - 5*(2*LINE_HEIGHT + CHAR_GAP*3 + 1) - 8;
		if(expand < 0) expand = 0; // Don't want them to compress
		function expandCalc(boxNum, divide){ 
			if(expand == 0) return 0;
			boxNum *= 2;
			var total = 2*(Math.floor((expand-boxNum-1)/(INFO_BOXES*2))+1); // lolwut
			if((expand-boxNum-1)%(INFO_BOXES*2) == 0) total--; // ???
			if(divide) total = Math.floor(total/2); // True for offsetY, false for extraH
			return total;
		} // See expand.txt to see the desired I/O behavior
		
		// Initialize the ACC box
		this.accBox = new BoxText(
			x+this.codeBox.w+4, 
			y+2, 
			ACC_MIN.toString().length+1, 
			2, CHAR_GAP*2 + expandCalc(0, false),
			CHAR_GAP + expandCalc(0, true), true
		);
		this.ACC = this.codeBox.h - 5*(2*LINE_HEIGHT + CHAR_GAP*3 + 1) - 8;
		this.accBox.setString(0, "ACC");
		
		// Initialize the BAK box
		this.bakBox = new BoxText(
			x+this.codeBox.w+4, 
			this.accBox.y+this.accBox.h + 1.5, 
			ACC_MIN.toString().length+1, 
			2, CHAR_GAP*2 + expandCalc(1, false),
			CHAR_GAP + expandCalc(1, true), true
		);
		this.BAK = 0;
		this.bakBox.setString(0, "BAK");
		
		// Initialize the LAST box
		this.lastBox = new BoxText(
			x+this.codeBox.w+4, 
			this.bakBox.y+this.bakBox.h + 1.5, 
			ACC_MIN.toString().length+1, 
			2, CHAR_GAP*2 + expandCalc(2, false),
			CHAR_GAP + expandCalc(2, true), true
		);
		this.LAST = null;
		this.lastBox.setString(0, "LAST");
		
		// Initialize the MODE box
		this.modeBox = new BoxText(
			x+this.codeBox.w+4, 
			this.lastBox.y+this.lastBox.h + 1.5, 
			ACC_MIN.toString().length+1, 
			2, CHAR_GAP*2 + expandCalc(3, false),
			CHAR_GAP + expandCalc(3, true), true
		);
		this.MODE = "IDLE";
		this.modeBox.setString(0, "MODE");
		
		// Initialize the IDLE box
		this.idleBox = new BoxText(
			x+this.codeBox.w+4, 
			this.modeBox.y+this.modeBox.h + 1.5, 
			ACC_MIN.toString().length+1, 
			2, CHAR_GAP*2 + expandCalc(4, false),
			CHAR_GAP + expandCalc(4, true), true
		);
		this.IDLE = 0;
		this.idleBox.setString(0, "IDLE");

		this.nodeBox = new Box(
			x, y, this.codeBox.w+this.accBox.w + 6, this.codeBox.h + 4
		);
	}
	
	drawNode(){
		this.nodeBox.drawBox(WHITE);
		
		this.codeBox.drawBox(WHITE);
		// Draws bar indicating currently executing line
		if(this.codeBox.currentLine != -1){ // Only false before the program is started
			if(this.executable){
				ctx.fillStyle = ACTIVE_FOCUS;
			}else{
				ctx.fillStyle = WAIT_FOCUS;
			}
			this.codeBox.drawBar(
				this.codeBox.currentLine, 0, this.codeBox.lineW, ctx.fillStyle, 3, 1
			);
		}
		this.codeBox.drawAllLines(); // Prints out all of codeBox's lines


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
class StackMemNode{
	constructor(x, y){
		this.descBox = new BoxText(
			x+2, 
			y+2, 
			NODE_WIDTH+1, 
			NODE_HEIGHT, CHAR_GAP*2, 
			CHAR_GAP, true
		);
		this.descBox.setString(7, "STACK MEMORY NODE");
		
		this.memoryBox = new BoxText(
			x+this.descBox.w+4, 
			y+2, 
			ACC_MIN.toString().length+1, 
			NODE_HEIGHT, CHAR_GAP*2,
			CHAR_GAP, true
		);
		this.memoryBox.setString(0, "254");
		this.memoryBox.setString(1, "498");
		this.memoryBox.setString(2, "782");
		
		this.nodeBox = new Box(
			x, y, this.descBox.w+this.memoryBox.w + 6, this.descBox.h + 4
		);
	}
	
	drawNode(){
		this.nodeBox.drawBox(WHITE);
		
		this.descBox.drawBox(WHITE);
		this.descBox.drawBar(5, 0, this.descBox.stringLength(7), WHITE);
		this.descBox.drawLine(7, WHITE);
		this.descBox.drawBar(9, 0, this.descBox.stringLength(7), WHITE);
		
		this.memoryBox.drawBox(WHITE);
		// Prints out each value in memory
		for(var i=0; i<NODE_HEIGHT; i++){ 
			if(!this.memoryBox.line_string[i]) continue;
			this.memoryBox.drawLine(i, WHITE);
		}
	}
}

function  getMousePos(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	var scaleX = canvas.width / rect.width;
	var scaleY = canvas.height / rect.height;

	return {
		x: Math.floor((evt.clientX - rect.left) * scaleX), 
		y: Math.floor((evt.clientY - rect.top) * scaleY)
	}
}

var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");
var mPos = {
	x: 0, y: 0
}
ctx.strokeStyle = TRUE_WHITE;
ctx.imageSmoothingEnabled = false;
ctx.font = CHAR_HEIGHT/3*4 + "pt tis-100-copy";

canvas.addEventListener('mousemove', function(evt) {
	mPos = getMousePos(canvas, evt);
}, false);

var node1 = new LogicNode(100, 100);
for(var i=0; i<NODE_HEIGHT-1; i++){
	node1.codeBox.setString(i, "testing " + i);
}
node1.codeBox.setString(NODE_HEIGHT-1, "1: mov r#ght, right");
node1.codeBox.currentLine = NODE_HEIGHT-1;

var node2 = new CorruptNode(100, 300);
var node3 = new CorruptNode(315, 100);
var node4 = new StackMemNode(315, 300);

function gameLoop() {

	ctx.rect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = BLACK;
	ctx.fill();

	ctx.fillStyle = TRUE_WHITE;
	ctx.fillText("ThE qUiCk BrOwN fOx JuMpS oVeR tHe LaZy DoG.", 50, 50);
	ctx.fillText("1234567890", 50, 62); 
	ctx.fillText("()<>-+!_=.,?", 50, 74);
	
	node1.drawNode();
	node2.drawNode();
	node3.drawNode();
	node4.drawNode();

    ctx.fillStyle = WHITE;
    ctx.fillRect(mPos.x, mPos.y, 5, 5);
	
	requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);