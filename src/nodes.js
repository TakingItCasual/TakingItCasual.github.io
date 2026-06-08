"use strict";

/** Template parent class for all node types */
class _BaseNode{
  _sideWidthPx = NUM.NODE_WIDTH_SIDE*NUM.CHAR_WIDTH + NUM.CHAR_GAP*2;

  constructor({nodeType, x, y, isMainTextCentered, isBorderFull=false}){
    this.nodeType = nodeType;
    this.connections = {
      "left": null,
      "up": null,
      "right": null,
      "down": null,
    }
    this.mainTextBox = new BoxText({
      x: x + 2,
      y: y + 2,
      lineW: NUM.NODE_WIDTH_MAIN+1,
      maxLines: NUM.NODE_HEIGHT,
      isTextCentered: isMainTextCentered,
    });
    this.nodeBox = new Box({
      x: x,
      y: y,
      w: this.mainTextBox.w + this._sideWidthPx + 6,
      h: this.mainTextBox.h + 4,
      isBorderFull: isBorderFull,
    });
  }

  drawConnections(){
    if(this.connections["left"] !== null){}
    if(this.connections["up"] !== null){}
    if(this.connections["right"] !== null){}
    if(this.connections["down"] !== null){}
  }
  drawNode(select){
    this.nodeBox.drawBox(COLOR.LIGHT_GRAY);
  }
}

/** Red "Communication Error" node (no functionality) */
class CorruptNode extends _BaseNode{
  constructor(x, y){
    super({
      nodeType: 0,
      x: x,
      y: y,
      isMainTextCentered: true,
      isBorderFull: true,
    });

    this.mainTextBox.lines.strSet(4, "COMMUNICATION");
    this.mainTextBox.lines.strSet(5, "FAILURE");

    const remainder = (this.mainTextBox.h-2)%4;
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
    const sideX = x+this.mainTextBox.w + 2;
    const sideW = this._sideWidthPx + 4;
    const sideH = (this.mainTextBox.h - remainder)/2 + 3;

    this.sideBox1 = new Box({
      x: sideX,
      y: y,
      w: sideW,
      h: sideH + expandCalc(1, false),
      isBorderFull: true,
    });
    this.sideBox2 = new Box({
      x: sideX,
      y: y+(this.mainTextBox.h-remainder)/4 + 1 + expandCalc(2, true) - 0.5,
      w: sideW,
      h: sideH + expandCalc(2, false),
      isBorderFull: true,
    });
    this.sideBox3 = new Box({
      x: sideX,
      y: y + this.sideBox1.h,
      w: sideW,
      h: sideH + expandCalc(3, false),
      isBorderFull: true,
    });
  }

  drawNode(select){
    this.nodeBox.drawBox(COLOR.CORRUPT_RED);

    this.mainTextBox.drawBox(COLOR.CORRUPT_RED);
    this.mainTextBox.drawBar(COLOR.CORRUPT_RED, 2, 0, 13);
    this.mainTextBox.drawStr(COLOR.CORRUPT_RED, 4);
    this.mainTextBox.drawStr(COLOR.CORRUPT_RED, 5, 2);
    this.mainTextBox.drawBar(COLOR.CORRUPT_RED, 7, 0, 13);

    this.sideBox1.drawBox(COLOR.CORRUPT_RED);
    this.sideBox2.drawBox(COLOR.CORRUPT_RED);
    this.sideBox3.drawBox(COLOR.CORRUPT_RED);
  }
}

/** Node within which user can write code */
class ComputeNode extends _BaseNode{
  constructor(x, y){
    super({
      nodeType: 1,
      x: x,
      y: y,
    });

    this.codeBox = new BoxCode({
      x: this.mainTextBox.x,
      y: this.mainTextBox.y,
      lineW: this.mainTextBox.lineW,
      maxLines: this.mainTextBox.maxLines,
    });
    // Overwrite default main text box with object reference to codeBox
    this.mainTextBox = this.codeBox;

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
    const sideX = x+this.codeBox.w + 4;

    // Initialize the ACC box
    this.accBox = new BoxText({
      x: sideX,
      y: y + 2,
      lineW: NUM.NODE_WIDTH_SIDE,
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
      lineW: NUM.NODE_WIDTH_SIDE,
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
      lineW: NUM.NODE_WIDTH_SIDE,
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
      lineW: NUM.NODE_WIDTH_SIDE,
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
      lineW: NUM.NODE_WIDTH_SIDE,
      maxLines: 2,
      extraH: expandCalc(4),
      isTextCentered: true,
    });
    this.IDLE = 0;
    this.idleBox.lines.strSet(0, "IDLE");
  }

  drawNode(select){
    this.nodeBox.drawBox(COLOR.LIGHT_GRAY);

    // Draws the editable codeBox and all relevant bars
    this.codeBox.drawBox(COLOR.LIGHT_GRAY);
    this.codeBox.drawAllLinesAndBars(select);

    // Draws the ACC box
    this.accBox.drawBox(COLOR.LIGHT_GRAY);
    this.accBox.drawStr(COLOR.TEXT.DARKER, 0);
    this.accBox.lines.strSet(1, this.ACC.toString());
    this.accBox.drawStr(COLOR.LIGHT_GRAY, 1);

    // Draws the BAK box
    this.bakBox.drawBox(COLOR.LIGHT_GRAY);
    this.bakBox.drawStr(COLOR.TEXT.DARKER, 0);
    this.bakBox.lines.strSet(1,
      this.BAK.toString().length + 2 <= this.bakBox.lineW ?
        "(" + this.BAK.toString() + ")" :
        this.BAK.toString());
    this.bakBox.drawStr(COLOR.LIGHT_GRAY, 1);

    // Draws the LAST box
    this.lastBox.drawBox(COLOR.LIGHT_GRAY);
    this.lastBox.drawStr(COLOR.TEXT.DARKER, 0);
    this.lastBox.lines.strSet(1,
      this.LAST !== null ? this.LAST.toString() : "N/A");
    this.lastBox.drawStr(COLOR.LIGHT_GRAY, 1);

    // Draws the MODE box
    this.modeBox.drawBox(COLOR.LIGHT_GRAY);
    this.modeBox.drawStr(COLOR.TEXT.DARKER, 0);
    this.modeBox.lines.strSet(1, this.MODE.toString());
    this.modeBox.drawStr(COLOR.LIGHT_GRAY, 1);

    // Draws the IDLE box
    this.idleBox.drawBox(COLOR.LIGHT_GRAY);
    this.idleBox.drawStr(COLOR.TEXT.DARKER, 0);
    this.idleBox.lines.strSet(1, this.IDLE.toString() + "%");
    this.idleBox.drawStr(COLOR.LIGHT_GRAY, 1);
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

/** Node which stores retrievable values given to it */
class StackMemNode extends _BaseNode{
  constructor(x, y){
    super({
      nodeType: 2,
      x: x,
      y: y,
      isMainTextCentered: true,
    });

    this.mainTextBox.lines.strSet(7, "STACK MEMORY NODE");

    this.memoryBox = new BoxText({
      x: x+this.mainTextBox.w+4,
      y: y+2,
      lineW: NUM.NODE_WIDTH_SIDE,
      maxLines: NUM.NODE_HEIGHT,
      isTextCentered: true,
    });
  }

  drawNode(select){
    this.nodeBox.drawBox(COLOR.LIGHT_GRAY);

    // Draws the description box ("STACK MEMORY NODE")
    this.mainTextBox.drawBox(COLOR.LIGHT_GRAY);
    this.mainTextBox.drawBar(COLOR.WHITE, 5, 0, 17);
    this.mainTextBox.drawStr(COLOR.LIGHT_GRAY, 7);
    this.mainTextBox.drawBar(COLOR.WHITE, 9, 0, 17);

    this.memoryBox.drawBox(COLOR.LIGHT_GRAY);
    // Draws each memory entry value
    for(let i=0; i<NUM.NODE_HEIGHT; i++){
      // Draws colored bar under newest entry
      if(this.memoryBox.lines.strGet(i) && !this.memoryBox.lines.strGet(i+1))
        this.memoryBox.drawBar(COLOR.BAR.MEM_RED,
          i, 0, this.memoryBox.lineW, NUM.CHAR_GAP, NUM.CHAR_GAP-1);
      this.memoryBox.drawStr(COLOR.LIGHT_GRAY, i);
      // No newer entries if the next line is empty
      if(!this.memoryBox.lines.strGet(i+1)) break;
    }
  }
}
