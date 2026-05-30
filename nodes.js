"use strict";

class baseNode{
  constructor({nodeType}){
    this.nodeType = nodeType;
  }
}

// Red "Communication Error" node (no functionality)
class CorruptNode extends baseNode{
  constructor(x, y, sizeInit){
    super({
      nodeType: 0,
    });

    this.descBox = new BoxText({
      x: x+2,
      y: y+2,
      lineW: sizeInit.lineW,
      maxLines: sizeInit.maxLines,
      isTextCentered: true,
    });

    this.descBox.lines.strSet(4, "COMMUNICATION");
    this.descBox.lines.strSet(5, "FAILURE");

    const remainder = (this.descBox.h-2)%4;
    function expandCalc(boxNum, y_pos){
      if(remainder === 0) return 0;
      if(boxNum === 1){
        if(remainder === 3) return 2;
        return remainder;
      }else if(boxNum === 2){
        if(y_pos) return 1;
        return remainder-1;
      }else{
        if(y_pos){
          if(remainder === 3) return 2;
          return remainder;
        }
        if(remainder === 3) return 1;
      }
      return 0;
    } // See expandCorrupt.txt to see the desired I/O behavior
    const sideX = x+this.descBox.w + 2;
    const sideW = sizeInit.sideWPx + 4;
    const sideH = (this.descBox.h - remainder)/2 + 3;

    this.sideBox1 = new Box({
      x: sideX,
      y: y,
      w: sideW,
      h: sideH + expandCalc(1, false),
      borderW: 3,
    });
    this.sideBox2 = new Box({
      x: sideX,
      y: y+(this.descBox.h-remainder)/4 + 1 + expandCalc(2, true) - 0.5,
      w: sideW,
      h: sideH + expandCalc(2, false),
      borderW: 3,
    });
    this.sideBox3 = new Box({
      x: sideX,
      y: y + this.sideBox1.h,
      w: sideW,
      h: sideH + expandCalc(3, false),
      borderW: 3,
    });

    this.nodeBox = new Box({
      x: x,
      y: y,
      w: this.descBox.w + sizeInit.sideWPx + 6,
      h: this.descBox.h + 4,
      borderW: 3,
    });
  }

  drawNode(){
    this.nodeBox.drawBox(COLOR.CORRUPT_RED);

    this.descBox.drawBox(COLOR.CORRUPT_RED);
    this.descBox.drawBar(COLOR.CORRUPT_RED, 2, 0, this.descBox.lines.strLen(4));
    this.descBox.drawLine(COLOR.CORRUPT_RED, 4);
    this.descBox.drawLine(COLOR.CORRUPT_RED, 5, 2);
    this.descBox.drawBar(COLOR.CORRUPT_RED, 7, 0, this.descBox.lines.strLen(4));

    this.sideBox1.drawBox(COLOR.CORRUPT_RED);
    this.sideBox2.drawBox(COLOR.CORRUPT_RED);
    this.sideBox3.drawBox(COLOR.CORRUPT_RED);
  }
}

// Node within which user can write code
class ComputeNode extends baseNode{
  constructor(x, y, sizeInit){
    super({
      nodeType: 1,
    });

    this.codeBox = new BoxCode({
      x: x+2,
      y: y+2,
      lineW: sizeInit.lineW,
      maxLines: sizeInit.maxLines,
    });

    // Expand the five info boxes next to the codeBox to match its height
    const info_boxes = 5;
    const expand = Math.max(0,
      this.codeBox.h - info_boxes*(2*NUM.LINE_HEIGHT + NUM.CHAR_GAP*3 + 1) - 8);
    function expandCalc(boxNum){
      if(expand === 0) return 0;
      boxNum *= 2;
      let total = 2*(Math.floor((expand-boxNum-1)/(info_boxes*2))+1);
      if((expand-boxNum-1)%(info_boxes*2) === 0) total -= 1;
      return total;
    } // See expand.txt to see the desired I/O behavior
    const sideX = x+this.codeBox.w+4;

    // Initialize the ACC box
    this.accBox = new BoxText({
      x: sideX,
      y: y+2,
      lineW: sizeInit.sideW,
      maxLines: 2,
      extraH: expandCalc(0),
      isTextCentered: true,
    });
    this.ACC = 0;
    this.accBox.lines.strSet(0, "ACC");

    // Initialize the BAK box
    this.bakBox = new BoxText({
      x: sideX,
      y: this.accBox.y+this.accBox.h + 2,
      lineW: sizeInit.sideW,
      maxLines: 2,
      extraH: expandCalc(1),
      isTextCentered: true,
    });
    this.BAK = 0;
    this.bakBox.lines.strSet(0, "BAK");

    // Initialize the LAST box
    this.lastBox = new BoxText({
      x: sideX,
      y: this.bakBox.y+this.bakBox.h + 2,
      lineW: sizeInit.sideW,
      maxLines: 2,
      extraH: expandCalc(2),
      isTextCentered: true,
    });
    this.LAST = null;
    this.lastBox.lines.strSet(0, "LAST");

    // Initialize the MODE box
    this.modeBox = new BoxText({
      x: sideX,
      y: this.lastBox.y+this.lastBox.h + 2,
      lineW: sizeInit.sideW,
      maxLines: 2,
      extraH: expandCalc(3),
      isTextCentered: true,
    });
    this.MODE = "IDLE";
    this.modeBox.lines.strSet(0, "MODE");

    // Initialize the IDLE box
    this.idleBox = new BoxText({
      x: sideX,
      y: this.modeBox.y+this.modeBox.h + 2,
      lineW: sizeInit.sideW,
      maxLines: 2,
      extraH: expandCalc(4),
      isTextCentered: true,
    });
    this.IDLE = 0;
    this.idleBox.lines.strSet(0, "IDLE");

    this.nodeBox = new Box({
      x: x,
      y: y,
      w: this.codeBox.w + sizeInit.sideWPx + 6,
      h: this.codeBox.h + 4,
    });
  }

  drawNode(select){
    this.nodeBox.drawBox(COLOR.LIGHT_GRAY);

    // Draws the editable codeBox and all relevant bars
    this.codeBox.drawBox(COLOR.LIGHT_GRAY);
    this.codeBox.drawAllLinesAndBars(select);

    // Draws the ACC box
    this.accBox.drawBox(COLOR.LIGHT_GRAY);
    this.accBox.drawLine(COLOR.TEXT.DARKER, 0);
    this.accBox.lines.strSet(1, this.ACC.toString());
    this.accBox.drawLine(COLOR.LIGHT_GRAY, 1);

    // Draws the BAK box
    this.bakBox.drawBox(COLOR.LIGHT_GRAY);
    this.bakBox.drawLine(COLOR.TEXT.DARKER, 0);
    this.bakBox.lines.strSet(1,
      this.BAK.toString().length + 2 <= this.bakBox.lineW ?
        "(" + this.BAK.toString() + ")" :
        this.BAK.toString());
    this.bakBox.drawLine(COLOR.LIGHT_GRAY, 1);

    // Draws the LAST box
    this.lastBox.drawBox(COLOR.LIGHT_GRAY);
    this.lastBox.drawLine(COLOR.TEXT.DARKER, 0);
    this.lastBox.lines.strSet(1,
      this.LAST !== null ? this.LAST.toString() : "N/A");
    this.lastBox.drawLine(COLOR.LIGHT_GRAY, 1);

    // Draws the MODE box
    this.modeBox.drawBox(COLOR.LIGHT_GRAY);
    this.modeBox.drawLine(COLOR.TEXT.DARKER, 0);
    this.modeBox.lines.strSet(1, this.MODE.toString());
    this.modeBox.drawLine(COLOR.LIGHT_GRAY, 1);

    // Draws the IDLE box
    this.idleBox.drawBox(COLOR.LIGHT_GRAY);
    this.idleBox.drawLine(COLOR.TEXT.DARKER, 0);
    this.idleBox.lines.strSet(1, this.IDLE.toString() + "%");
    this.idleBox.drawLine(COLOR.LIGHT_GRAY, 1);
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

// Node which stores retrievable values given to it
class StackMemNode extends baseNode{
  constructor(x, y, sizeInit){
    super({
      nodeType: 2,
    });

    this.descBox = new BoxText({
      x: x+2,
      y: y+2,
      lineW: sizeInit.lineW,
      maxLines: sizeInit.maxLines,
      isTextCentered: true,
    });
    this.descBox.lines.strSet(7, "STACK MEMORY NODE");

    this.memoryBox = new BoxText({
      x: x+this.descBox.w+4,
      y: y+2,
      lineW: sizeInit.sideW,
      maxLines: sizeInit.maxLines,
      isTextCentered: true,
    });

    this.nodeBox = new Box({
      x: x,
      y: y,
      w: this.descBox.w + sizeInit.sideWPx + 6,
      h: this.descBox.h + 4,
    });
  }

  drawNode(){
    this.nodeBox.drawBox(COLOR.LIGHT_GRAY);

    // Draws the description box ("STACK MEMORY NODE")
    this.descBox.drawBox(COLOR.LIGHT_GRAY);
    this.descBox.drawBar(COLOR.WHITE, 5, 0, this.descBox.lines.strLen(7));
    this.descBox.drawLine(COLOR.LIGHT_GRAY, 7);
    this.descBox.drawBar(COLOR.WHITE, 9, 0, this.descBox.lines.strLen(7));

    this.memoryBox.drawBox(COLOR.LIGHT_GRAY);
    // Prints out each value in memory
    for(let i=0; i<NUM.NODE_HEIGHT; i++){
      // There shouldn't be any lower ones if the current line is empty
      if(!this.memoryBox.lines.strGet(i)) break;
      if(!this.memoryBox.lines.strGet(i+1))
        this.memoryBox.drawBar(COLOR.BAR.MEM_RED,
          i, 0, this.memoryBox.lineW, 3, 2);
      this.memoryBox.drawLine(COLOR.LIGHT_GRAY, i);
    }
  }
}
