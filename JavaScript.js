﻿var NODE_WIDTH = 18; // characters that will fit on a node's line
var NODE_HEIGHT = 15; // number of writable lines in a node. min: 14
var ACC_MAX = 999; // maximum value that an ACC can contain
var ACC_MIN = -ACC_MAX; // minimum value
var CHAR_HEIGHT = 9; // height of the actual characters. multiple of 9
var CHAR_WIDTH = CHAR_HEIGHT/9*8; // characters' width, including pixel after
var CHAR_GAP = 3; // gap between rows and from sides. min: 2
var LINE_HEIGHT = CHAR_HEIGHT + CHAR_GAP;
var INFO_BOXES = 5; // for ACC, BAK, LAST, MODE, and IDLE

var WHITE = "#C8C8C8"; // Used for the boxes and code
var BLACK = "#000000"; // Black
var DESC_WHITE = "#B4B4B4" // Used for text not in a node
var COMMENT_GRAY = "#7A7A7A"; // Used for comments within code
var INFO_GRAY = "#8D8D8D"; // Used for the ACC, BAK, etc.
var SELECT = "#ABABAB"; // Used for selecting sections of code
var ACTIVE_FOCUS = "#FBFBFB"; // Used for the bar over executing code
var WAIT_FOCUS = "#9C9C9C"; // Used for the bar over stalled code
var DARK_RED = "A60D0D"; // Used for broken nodes
var LIGHT_RED = "BF0D0D"; // Used for those 2 red bars in a broken node

class box{
	constructor(x, y, w, h, lineW = 1){
		this.x = x + 0.5; // x-pos of box's top left
		this.y = y + 0.5; // y-pos of box's top left
		this.w = w; // box's width
		this.h = h; // box's height
		this.lineW = lineW; // width of box's border
	}

	drawBox(color = ctx.strokeStyle){
		ctx.strokeStyle = color;
		ctx.strokeRect(this.x, this.y, this.w, this.h);
	}
}
class boxText extends box{
	constructor(x, y, lineW, lines, extraH, offsetY = 0, centered = false){
		super(
			x, y, 
			lineW*CHAR_WIDTH + CHAR_GAP*2, 
			lines*LINE_HEIGHT + CHAR_GAP + 1 + extraH
		);
		this.line_string = [];
		for(var i=0; i<lines; i++) this.line_string.push("");
		this.lineW = lineW; // width of the box in terms of characters
		this.extraH = extraH; // extra height of the box in pixels
		this.offsetY = offsetY; // custom y-offset for text lines
		this.centered = centered; // if true, center text within box's width
	}
	
	drawLine(line, color = ctx.fillStyle){
		var offsetX = 0;
		if(this.centered){ // centers text within box's width
			offsetX = (CHAR_WIDTH/2)*(this.lineW - this.line_string[line].length);
		}
		ctx.fillStyle = color;
		ctx.fillText(
			this.line_string[line], 
			this.x+CHAR_GAP + offsetX + 0.5, 
			this.y+this.offsetY + (line+1)*LINE_HEIGHT + 0.5
		);
	}
	// Used for code containing comments (shouldn't be centered)
	drawLineSplit(line, split, color2, color1 = ctx.fillStyle){
		var before_string = this.line_string[line].substr(0, split);
		var after_string = this.line_string[line].substr(split);
		
		ctx.fillStyle = color1;
		ctx.fillText(
			before_string, 
			this.x+CHAR_GAP+0.5, 
			this.y+this.offsetY + (line+1)*LINE_HEIGHT + 0.5
		);

		ctx.fillStyle = color2;
		ctx.fillText(
			after_string, 
			this.x+CHAR_GAP + CHAR_WIDTH*split + 0.5, 
			this.y+this.offsetY + (line+1)*LINE_HEIGHT + 0.5
		);
	}
}

class corruptNode{
	constructor(x, y){
		this.errorBox = new boxText(
			x+2, 
			y+2, 
			NODE_WIDTH+1, 
			NODE_HEIGHT, CHAR_GAP*2, 
			CHAR_GAP, true
		);
	}
}
class logicNode{
	constructor(x, y){
		this.codeBox = new boxText(
			x+2, 
			y+2, 
			NODE_WIDTH+1, 
			NODE_HEIGHT, CHAR_GAP*2, 
			CHAR_GAP
		);
		this.current_line = -1;
		this.executable = true; // true if the current line was just reached
		
		// expands the five boxes next to the codeBox to match its height
		var expand = this.codeBox.h - 5*(2*LINE_HEIGHT + CHAR_GAP*3 + 1) - 8;
		if(expand < 0) expand = 0; // don't want them to compress
		function expandCalc(boxNum, divide){ 
			if(expand == 0) return 0;
			boxNum *= 2;
			var total = 2*(Math.floor((expand-boxNum-1)/(INFO_BOXES*2))+1); // lolwut
			if((expand-boxNum-1)%(INFO_BOXES*2) == 0) total--; // ???
			if(divide) total = Math.floor(total/2); // true for offsetY, false for extraH
			return total;
		} // see expand.txt to see the desired I/O behavior
		
		// initialize the ACC box
		this.accBox = new boxText(
			x+this.codeBox.w+4, 
			y+2, 
			ACC_MIN.toString().length+1, 
			2, CHAR_GAP*2 + expandCalc(0, false),
			CHAR_GAP + expandCalc(0, true), true
		);
		this.ACC = this.codeBox.h - 5*(2*LINE_HEIGHT + CHAR_GAP*3 + 1) - 8;
		this.accBox.line_string[0] = "ACC";
		
		// initialize the BAK box
		this.bakBox = new boxText(
			x+this.codeBox.w+4, 
			this.accBox.y+this.accBox.h + 1.5, 
			ACC_MIN.toString().length+1, 
			2, CHAR_GAP*2 + expandCalc(1, false),
			CHAR_GAP + expandCalc(1, true), true
		);
		this.BAK = 0;
		this.bakBox.line_string[0] = "BAK";
		
		// initialize the LAST box
		this.lastBox = new boxText(
			x+this.codeBox.w+4, 
			this.bakBox.y+this.bakBox.h + 1.5, 
			ACC_MIN.toString().length+1, 
			2, CHAR_GAP*2 + expandCalc(2, false),
			CHAR_GAP + expandCalc(2, true), true
		);
		this.LAST = null;
		this.lastBox.line_string[0] = "LAST";
		
		// initialize the MODE box
		this.modeBox = new boxText(
			x+this.codeBox.w+4, 
			this.lastBox.y+this.lastBox.h + 1.5, 
			ACC_MIN.toString().length+1, 
			2, CHAR_GAP*2 + expandCalc(3, false),
			CHAR_GAP + expandCalc(3, true), true
		);
		this.MODE = "IDLE";
		this.modeBox.line_string[0] = "MODE";
		
		// initialize the IDLE box
		this.idleBox = new boxText(
			x+this.codeBox.w+4, 
			this.modeBox.y+this.modeBox.h + 1.5, 
			ACC_MIN.toString().length+1, 
			2, CHAR_GAP*2 + expandCalc(4, false),
			CHAR_GAP + expandCalc(4, true), true
		);
		this.IDLE = 0;
		this.idleBox.line_string[0] = "IDLE";

		this.nodeBox = new box(
			x, y, this.codeBox.w+this.accBox.w+6, this.codeBox.h+4
		);
	}
	
	drawNode(){
		this.nodeBox.drawBox(WHITE);
		
		ctx.strokeRect(
			this.codeBox.x, this.codeBox.y, 
			this.codeBox.w, this.codeBox.h
		);
		// draws bar indicating currently executing line
		if(this.current_line != -1){ // only false before the program is started
			if(this.executable){
				ctx.fillStyle = ACTIVE_FOCUS;
			}else{
				ctx.fillStyle = WAIT_FOCUS;
			}
			ctx.fillRect(
				this.codeBox.x+1 - 0.5, 
				this.codeBox.y+this.codeBox.extraH + (this.current_line)*LINE_HEIGHT - 0.5,
				this.codeBox.w-2,
				LINE_HEIGHT
			);
		}
		// prints out each of codeBox's lines
		for(var i=0; i<NODE_HEIGHT; i++){ 
			if(!this.codeBox.line_string[i]) continue;
			if(this.current_line == i){
				ctx.fillStyle = BLACK;
			}else{
				ctx.fillStyle = WHITE;
			}
			var commentStart = this.codeBox.line_string[i].indexOf("#");
			if(commentStart == -1 || this.current_line == i){
				this.codeBox.drawLine(i);
			}else{
				this.codeBox.drawLineSplit(i, commentStart, COMMENT_GRAY);
			}
		}
		// draws the ACC box
		this.accBox.drawBox(WHITE);
		this.accBox.drawLine(0, INFO_GRAY);
		this.accBox.line_string[1] = this.ACC.toString();
		this.accBox.drawLine(1, WHITE);
		
		// draws the BAK box
		this.bakBox.drawBox(WHITE);
		this.bakBox.drawLine(0, INFO_GRAY);
		if(this.BAK.toString().length + 2 <= this.bakBox.lineW){
			this.bakBox.line_string[1] = "(" + this.BAK.toString() + ")";
		}else{
			this.bakBox.line_string[1] = this.BAK.toString();
		}
		this.bakBox.drawLine(1, WHITE);
		
		// draws the LAST box
		this.lastBox.drawBox(WHITE);
		this.lastBox.drawLine(0, INFO_GRAY);
		if(this.LAST){
			this.lastBox.line_string[1] = this.LAST.toString();
		}else{
			this.lastBox.line_string[1] = "N/A";
		}
		this.lastBox.drawLine(1, WHITE);
		
		// draws the MODE box
		this.modeBox.drawBox(WHITE);
		this.modeBox.drawLine(0, INFO_GRAY);
		this.modeBox.line_string[1] = this.MODE.toString();
		this.modeBox.drawLine(1, WHITE);
		
		// draws the IDLE box
		this.idleBox.drawBox(WHITE);
		this.idleBox.drawLine(0, INFO_GRAY);
		this.idleBox.line_string[1] = this.IDLE.toString() + "%";
		this.idleBox.drawLine(1, WHITE);
	}
	
	haltExecution(){
		this.current_line = -1;
		this.ACC = 0;
		this.BAK = 0;
		this.LAST = null;
		this.MODE = "IDLE";
		this.IDLE = 0;
	}
}

var c = document.getElementById("game");
var ctx = c.getContext("2d");
ctx.strokeStyle = "#FFFFFF";
ctx.imageSmoothingEnabled = false;
ctx.font = CHAR_HEIGHT*4/3 + "pt tis-100-copy";

var node1 = new logicNode(100, 100);
for(var i=0; i<node1.codeBox.line_string.length-1; i++){
	node1.codeBox.line_string[i] = "testing " + i;
}
node1.codeBox.line_string[NODE_HEIGHT-1] = "1: mov r#ght, right"
node1.current_line = 0;

function gameLoop() {

	ctx.rect(0, 0, c.width, c.height);
	ctx.fillStyle = BLACK;
	ctx.fill();

	ctx.fillStyle = "#FFFFFF";
	ctx.fillText("ThE qUiCk BrOwN fOx JuMpS oVeR tHe LaZy DoG.", 50, 50);
	ctx.fillText("1234567890", 50, 62); 
	ctx.fillText("()<>-+!_=.,?", 50, 74);
	
	node1.drawNode();
	
	requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);