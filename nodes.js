"use strict";

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

        this.descBox.lines.strSet(4, "COMMUNICATION");
        this.descBox.lines.strSet(5, "FAILURE");

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
        this.descBox.drawBar(2, 0, this.descBox.lines.strLength(4), LIGHT_RED);
        this.descBox.drawLine(4, DARK_RED);
        this.descBox.drawLine(5, DARK_RED, 2);
        this.descBox.drawBar(7, 0, this.descBox.lines.strLength(4), LIGHT_RED);

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
        this.accBox.lines.strSet(0, "ACC");

        // Initialize the BAK box
        this.bakBox = new BoxText(
            x+this.codeBox.w+4,
            this.accBox.y+this.accBox.h + 2,
            sizeInit.sideW,
            2, sizeInit.extraH + expandCalc(1, false),
            sizeInit.offsetY + expandCalc(1, true), true
        );
        this.BAK = 0;
        this.bakBox.lines.strSet(0, "BAK");

        // Initialize the LAST box
        this.lastBox = new BoxText(
            x+this.codeBox.w+4,
            this.bakBox.y+this.bakBox.h + 2,
            sizeInit.sideW,
            2, sizeInit.extraH + expandCalc(2, false),
            sizeInit.offsetY + expandCalc(2, true), true
        );
        this.LAST = null;
        this.lastBox.lines.strSet(0, "LAST");

        // Initialize the MODE box
        this.modeBox = new BoxText(
            x+this.codeBox.w+4,
            this.lastBox.y+this.lastBox.h + 2,
            sizeInit.sideW,
            2, sizeInit.extraH + expandCalc(3, false),
            sizeInit.offsetY + expandCalc(3, true), true
        );
        this.MODE = "IDLE";
        this.modeBox.lines.strSet(0, "MODE");

        // Initialize the IDLE box
        this.idleBox = new BoxText(
            x+this.codeBox.w+4,
            this.modeBox.y+this.modeBox.h + 2,
            sizeInit.sideW,
            2, sizeInit.extraH + expandCalc(4, false),
            sizeInit.offsetY + expandCalc(4, true), true
        );
        this.IDLE = 0;
        this.idleBox.lines.strSet(0, "IDLE");

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
        this.accBox.lines.strSet(1, this.ACC.toString());
        this.accBox.drawLine(1, DIM_WHITE);

        // Draws the BAK box
        this.bakBox.drawBox(DIM_WHITE);
        this.bakBox.drawLine(0, INFO_GRAY);
        if(this.BAK.toString().length + 2 <= this.bakBox.lineW){
            this.bakBox.lines.strSet(1, "(" + this.BAK.toString() + ")");
        }else{
            this.bakBox.lines.strSet(1, this.BAK.toString());
        }
        this.bakBox.drawLine(1, DIM_WHITE);

        // Draws the LAST box
        this.lastBox.drawBox(DIM_WHITE);
        this.lastBox.drawLine(0, INFO_GRAY);
        if(this.LAST){
            this.lastBox.lines.strSet(1, this.LAST.toString());
        }else{
            this.lastBox.lines.strSet(1, "N/A");
        }
        this.lastBox.drawLine(1, DIM_WHITE);

        // Draws the MODE box
        this.modeBox.drawBox(DIM_WHITE);
        this.modeBox.drawLine(0, INFO_GRAY);
        this.modeBox.lines.strSet(1, this.MODE.toString());
        this.modeBox.drawLine(1, DIM_WHITE);

        // Draws the IDLE box
        this.idleBox.drawBox(DIM_WHITE);
        this.idleBox.drawLine(0, INFO_GRAY);
        this.idleBox.lines.strSet(1, this.IDLE.toString() + "%");
        this.idleBox.drawLine(1, DIM_WHITE);
    }

    haltExecution(){
        this.codeBox.activeLine = null;
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
        this.descBox.lines.strSet(7, "STACK MEMORY NODE");

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
        this.descBox.drawBar(5, 0, this.descBox.lines.strLength(7), WHITE);
        this.descBox.drawLine(7, DIM_WHITE);
        this.descBox.drawBar(9, 0, this.descBox.lines.strLength(7), WHITE);

        this.memoryBox.drawBox(DIM_WHITE);
        // Prints out each value in memory
        for(let i=0; i<NODE_HEIGHT; i++){
            // There shouldn't be any lower ones if the current line is empty
            if(!this.memoryBox.lines.strGet(i)) break;
            this.memoryBox.drawLine(i, DIM_WHITE);
        }
    }
}
