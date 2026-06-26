"use strict";

/** Handles user cursor and text selection/highlighting */
class EditorSelection{
  constructor(){
    /** Index of ComputeNode being focused */
    this.nodeI = null;
    /** Position of cursor within focused codeBox */
    this.cursor = {
      _lineI: 0,
      _charI: 0,
    };
    /** Holds time data/functions for scheduling cursor blinking */
    this.cursorBlink = { time: Date.now() };
    /** Holds selection range data/functions */
    this.range = {
      start: { lineI: 0, charI: 0 },
      current: { lineI: 0, charI: 0 },
      initTo(lineI, charI){
        this.start.lineI = this.current.lineI = lineI;
        this.start.charI = this.current.charI = charI;
      },
      get lowerLineI(){
        return Math.min(this.start.lineI, this.current.lineI);
      },
      get lowerCharI(){
        if(this.start.lineI < this.current.lineI)
          return this.start.charI;
        if(this.start.lineI > this.current.lineI)
          return this.current.charI;
        return Math.min(this.start.charI, this.current.charI);
      },
      get upperLineI(){
        return Math.max(this.start.lineI, this.current.lineI);
      },
      get upperCharI(){
        if(this.start.lineI > this.current.lineI)
          return this.start.charI;
        if(this.start.lineI < this.current.lineI)
          return this.current.charI;
        return Math.max(this.start.charI, this.current.charI);
      },
      get lineCount(){
        if(this.isNull) return 0;
        return this.upperLineI - this.lowerLineI + 1;
      },
      get isNull(){
        return (
          this.start.lineI === this.current.lineI &&
          this.start.charI === this.current.charI
        );
      },
      isLineSelected(lineI){
        if(this.isNull) return false;
        return lineI.within(this.lowerLineI, true, this.upperLineI, true);
      },
    };

    // Don't know how to create objects with self-referencing, so set here
    Object.defineProperties(this.cursorBlink, {
      reset: {
        value: () => { this.cursorBlink.time = Date.now() },
      },
      isActive: {
        value: () => {
          let timeRemainder =
            (Date.now() - this.cursorBlink.time) % NUM.CURSOR_PERIOD;
          return timeRemainder < Math.floor(NUM.CURSOR_PERIOD/2);
        },
      },
    });
    let blinkReset = this.cursorBlink.reset;
    Object.defineProperties(this.cursor, {
      lineI: {
        get: function() { return this._lineI },
        set: function(val) {
          this._lineI = val;
          blinkReset();
        },
      },
      charI: {
        get: function() { return this._charI },
        set: function(val) {
          this._charI = val;
          blinkReset();
        },
      },
    });
  }

  focusLost(){
    this.nodeI = null;
    this.cursor.lineI = this.cursor.charI = 0;
    this.range.initTo(0, 0);
  }
}

/** Holds all nodes, coordinates keyboard input and mouse selection */
class NodeContainer{
  constructor(nodeTypes){
    this.nodesW = nodeTypes[0].length; // Width of table of nodes
    this.nodesH = nodeTypes.length; // Height of table of nodes

    this.select = new EditorSelection();
    /** Object reference for focused codeBox's StringList */
    this.nodeLines = null;
    /** Object reference for selection cursor */
    this.cursor = this.select.cursor;

    this.nodes = [];
    let nodeY = 53;
    for(let y=0; y<this.nodesH; y++){
      let nodeX = 355;
      for(let x=0; x<this.nodesW; x++){
        if(nodeTypes[y][x] === 0){
          this.nodes.push(new CorruptNode(nodeX, nodeY));
        }else if(nodeTypes[y][x] === 1){
          this.nodes.push(new ComputeNode(nodeX, nodeY));
        }else if(nodeTypes[y][x] === 2){
          this.nodes.push(new StackMemNode(nodeX, nodeY));
        }
        nodeX += this.nodes[0].nodeBox.w + 46;
      }
      nodeY += this.nodes[0].nodeBox.h + 40;
    }
  }

  /** Mouse movement while left mouse button held down */
  lmbDrag(mPos){
    if(this.select.nodeI === null) return;

    this.#cursorToMouse(this.select.nodeI, mPos);
    this.select.range.current.lineI = this.cursor.lineI;
    this.select.range.current.charI = this.cursor.charI;
    this.select.cursorBlink.reset();
  }
  /** Left mouse button pressed down */
  lmbDown(mPos){
    let _nodeI = this.#getMousedOverNodeI(mPos);
    this.select.nodeI = this.nodeLines = null;
    if(_nodeI === -1){
      this.select.focusLost();
      return;
    }

    this.select.nodeI = _nodeI;
    this.nodeLines = this.nodes[_nodeI].mainTextBox.lines;

    this.#cursorToMouse(_nodeI, mPos);
    this.select.range.initTo(this.cursor.lineI, this.cursor.charI);
    this.select.cursorBlink.reset();
  }
  /** Right mouse button pressed down */
  async rmbDown(mPos){
    let _nodeI = this.#getMousedOverNodeI(mPos);
    if(_nodeI === -1 || _nodeI !== this.select.nodeI){
      this.select.focusLost();
      return;
    }

    if(this.select.range.isNull){
      navigator.clipboard.readText()
        .then(text => {
          this.attemptPaste(text);
        }).catch(err => {
          console.error('Failed to read clipboard contents: ', err);
        });
    }else{
      let cutStr = this.attemptCut();
      if(cutStr === null) return;
      navigator.clipboard.writeText(cutStr)
        .catch(err => {
          console.error('Failed to write clipboard contents: ', err);
        });
    }
  }

  /** Get pixel coordinates of node main text box text area top left corner */
  #nodeTopLeft(nodeI){
    let topLeftX = this.nodes[nodeI].mainTextBox.x + NUM.CHAR_GAP;
    let topLeftY = this.nodes[nodeI].mainTextBox.y + 2*NUM.CHAR_GAP +
      this.nodes[nodeI].mainTextBox.offsetY - Math.floor(NUM.CHAR_GAP/2);
    return [topLeftX, topLeftY];
  }
  /** Set selection cursor from mouse position */
  #cursorToMouse(nodeI, mPos){
    let topLeftX = 0;
    let topLeftY = 0;
    [topLeftX, topLeftY] = this.#nodeTopLeft(nodeI);
    this.cursor.lineI = Math.max(0, Math.min(
      this.nodes[nodeI].mainTextBox.lines.lineCount()-1,
      Math.floor((mPos.y-topLeftY)/NUM.LINE_HEIGHT)));
    this.cursor.charI = Math.max(0, Math.min(
      this.nodes[nodeI].mainTextBox.lines.strLen(this.cursor.lineI),
      Math.floor((mPos.x-topLeftX)/NUM.CHAR_WIDTH)));
  }
  /** Get index of moused-over codeBox (-1 if N/A or for executing node) */
  #getMousedOverNodeI(mPos){
    let topLeftX = 0;
    let topLeftY = 0;
    let bottomRightX = 0;
    let bottomRightY = 0;
    for(let i=0; i<this.nodes.length; i++){
      // codeBox only exists within ComputeNodes
      if(this.nodes[i].nodeType !== 1) continue;
      // Can't edit text in executing codeBox
      if(this.nodes[i].codeBox.activeLine !== null) continue;

      let codeBox = this.nodes[i].codeBox;
      [topLeftX, topLeftY] = this.#nodeTopLeft(i);
      bottomRightX = topLeftX + codeBox.boxCharW*NUM.CHAR_WIDTH;
      bottomRightY = topLeftY + codeBox.boxCharH*NUM.LINE_HEIGHT;
      if(
        mPos.x.within(topLeftX, true, bottomRightX, false) &&
        mPos.y.within(topLeftY, true, bottomRightY, false)
      ){
        return i;
      }
    }
    return -1;
  }

  addChar(char){
    if(this.select.nodeI === null) return;
    if(char.length !== 1) return;

    let _char = char.toUpperCase();
    if(!ALLOWED_CHARS.test(_char)) return;

    if(!this.select.range.isNull){
      let afterDel = this.#delSelectionInfo();
      if(afterDel === null) return;
      if(afterDel.lowerLineLen + 1 > NUM.NODE_WIDTH_MAIN) return;

      this.delSelection();
    }else if(this.nodeLines.strLen(this.cursor.lineI) >= NUM.NODE_WIDTH_MAIN){
      return;
    }

    this.nodeLines.charAdd(this.cursor.lineI, this.cursor.charI, _char);
    this.cursor.charI += 1;
  }
  newLine(){
    if(this.select.nodeI === null) return;

    if(!this.select.range.isNull){
      let afterDel = this.#delSelectionInfo();

      if(afterDel === null) return;
      if(afterDel.lineCount >= this.nodeLines.maxLines) return;

      this.delSelection();
    }else if(this.nodeLines.lineCount() >= this.nodeLines.maxLines){
      return;
    }

    let distToEndOfLine =
      this.nodeLines.strLen(this.cursor.lineI) - this.cursor.charI;

    this.nodeLines.lineAdd(this.cursor.lineI);
    this.cursor.lineI += 1;
    this.cursor.charI = 0;

    if(distToEndOfLine > 0){
      let strToMove = this.nodeLines
        .strCut(this.cursor.lineI-1, distToEndOfLine);
      this.nodeLines.strSet(this.cursor.lineI, strToMove);
    }
  }
  bakChar(){
    if(this.select.nodeI === null) return;

    if(!this.select.range.isNull){
      this.delSelection();
    }else if(this.cursor.charI > 0){
      this.nodeLines.charDel(this.cursor.lineI, this.cursor.charI);
      this.cursor.charI -= 1;
    }else if(this.cursor.lineI > 0){
      if(
        this.nodeLines.strLen(this.cursor.lineI-1) +
        this.nodeLines.strLen(this.cursor.lineI) <=
        NUM.NODE_WIDTH_MAIN
      ){
        this.cursor.lineI -= 1;
        this.cursor.charI = this.nodeLines.strLen(this.cursor.lineI);

        let combinedStr =
          this.nodeLines.strGet(this.cursor.lineI) +
          this.nodeLines.strGet(this.cursor.lineI+1);
        this.nodeLines.strSet(this.cursor.lineI, combinedStr);

        this.nodeLines.lineDel(this.cursor.lineI+1);
      }
    }
  }
  delChar(){
    if(this.select.nodeI === null) return;

    if(!this.select.range.isNull){
      this.delSelection();
    }else if(this.cursor.charI < this.nodeLines.strLen(this.cursor.lineI)){
      this.nodeLines.charDel(this.cursor.lineI, this.cursor.charI+1);
    }else if(this.cursor.lineI < this.nodeLines.lineCount()-1){
      if(
        this.nodeLines.strLen(this.cursor.lineI) +
        this.nodeLines.strLen(this.cursor.lineI+1) <=
        NUM.NODE_WIDTH_MAIN
      ){
        let combinedStr =
          this.nodeLines.strGet(this.cursor.lineI) +
          this.nodeLines.strGet(this.cursor.lineI+1);
        this.nodeLines.strSet(this.cursor.lineI, combinedStr);

        this.nodeLines.lineDel(this.cursor.lineI+1);
      }
    }
  }
  delSelection(){
    if(this.#delSelectionInfo() === null) return;

    let combinedStr =
      this.nodeLines.strGet(this.select.range.lowerLineI)
        .substring(0, this.select.range.lowerCharI) +
      this.nodeLines.strGet(this.select.range.upperLineI)
        .substring(this.select.range.upperCharI);
    this.nodeLines.strSet(this.select.range.lowerLineI, combinedStr);

    for(let i=this.select.range.lineCount-1; i>0; i--){
      this.nodeLines.lineDel(this.select.range.lowerLineI+1);
    }

    this.cursor.lineI = this.select.range.lowerLineI;
    this.cursor.charI = this.select.range.lowerCharI;
    this.select.range.initTo(this.cursor.lineI, this.cursor.charI);
  }
  #delSelectionInfo(){
    if(this.select.range.isNull) return null;

    let newLowerLineLen =
      this.select.range.lowerCharI +
      this.nodeLines.strLen(this.select.range.upperLineI) -
      this.select.range.upperCharI;
    if(newLowerLineLen > NUM.NODE_WIDTH_MAIN) return null;

    let newLineCount = this.nodeLines.lineCount() -
      this.select.range.upperLineI + this.select.range.lowerLineI;
    return {
      lowerLineLen: newLowerLineLen,
      lineCount: newLineCount,
    };
  }

  arrowKey(direction){
    if(this.select.nodeI === null) return;

    this.select.range.initTo(0, 0);
    if(direction === DIR.LEFT){
      if(this.cursor.charI > 0){
        this.cursor.charI -= 1;
      }else if(this.cursor.lineI > 0){
        this.cursor.lineI -= 1;
        this.cursor.charI = this.nodeLines.strLen(this.cursor.lineI);
      }
    }else if(direction === DIR.UP){
      if(this.cursor.lineI > 0){
        this.cursor.lineI -= 1;
        if(this.cursor.charI > this.nodeLines.strLen(this.cursor.lineI)){
          this.cursor.charI = this.nodeLines.strLen(this.cursor.lineI);
        }
      }else{
        this.cursor.charI = 0;
      }
    }else if(direction === DIR.RIGHT){
      if(this.cursor.charI < this.nodeLines.strLen(this.cursor.lineI)){
        this.cursor.charI += 1;
      }else if(this.cursor.lineI < this.nodeLines.lineCount()-1){
        this.cursor.lineI += 1;
        this.cursor.charI = 0;
      }
    }else if(direction === DIR.DOWN){
      if(this.cursor.lineI < this.nodeLines.lineCount()-1){
        this.cursor.lineI += 1;
        if(this.cursor.charI > this.nodeLines.strLen(this.cursor.lineI)){
          this.cursor.charI = this.nodeLines.strLen(this.cursor.lineI);
        }
      }else{
        this.cursor.charI = this.nodeLines.strLen(this.cursor.lineI);
      }
    }
  }

  attemptCopy(){
    if(this.select.nodeI === null) return null;
    if(this.select.range.lineCount === 0) return null;

    if(this.select.range.lineCount === 1){
      return this.nodeLines.strGet(this.select.range.lowerLineI)
        .substring(this.select.range.lowerCharI, this.select.range.upperCharI);
    }

    let strParts = [this.nodeLines.strGet(this.select.range.lowerLineI)
      .substring(this.select.range.lowerCharI)];
    for(let i=1; i<this.select.range.lineCount-1; i++){
      strParts.push(this.nodeLines.strGet(this.select.range.lowerLineI + i));
    }
    strParts.push(this.nodeLines.strGet(this.select.range.upperLineI)
      .substring(0, this.select.range.upperCharI));

    return strParts.join("\n");
  }
  attemptCut(){
    let savedSelection = this.attemptCopy();
    if(savedSelection === null) return null;
    if(this.#delSelectionInfo() === null) return null;
    
    this.delSelection();
    return savedSelection;
  }
  attemptPaste(clipboardStr){
    if(this.select.nodeI === null) return;
    if(!clipboardStr) return;
    if(typeof clipboardStr !== "string") return;

    let pastedLines = clipboardStr.split(/\r?\n/);
    for(let i=0; i<pastedLines.length-1; i++){
      pastedLines[i] = pastedLines[i].toUpperCase();
      if(!ALLOWED_CHARS.test(pastedLines[i])) return;
    }
    let zeroOrMoreSpaces = /^ *$/;
    let isLastEmpty = zeroOrMoreSpaces.test(pastedLines[pastedLines.length-1]);

    let newCursorLineI = pastedLines.length-1; // Appended to later
    let newCursorCharI = null; // Set later
    if(this.select.range.isNull){
      if(this.nodeLines.lineCount() + pastedLines.length -
        (isLastEmpty ? 2 : 1) > this.nodeLines.maxLines) return;

      pastedLines[0] = this.nodeLines.strGet(this.cursor.lineI)
        .substring(0, this.cursor.charI) + pastedLines[0];

      newCursorLineI += this.cursor.lineI;
      newCursorCharI = pastedLines[pastedLines.length-1].length;

      pastedLines[pastedLines.length-1] += this.nodeLines
        .strGet(this.cursor.lineI).substring(this.cursor.charI);

      for(let pastedLine of pastedLines){
        if(pastedLine.length > NUM.NODE_WIDTH_MAIN) return;
      }
    }else{
      let afterDel = this.#delSelectionInfo();

      if(afterDel === null) return;
      if(afterDel.lineCount + pastedLines.length -
        (isLastEmpty ? 2 : 1) > this.nodeLines.maxLines) return;

      pastedLines[0] = this.nodeLines.strGet(this.select.range.lowerLineI)
        .substring(0, this.select.range.lowerCharI) + pastedLines[0];

      newCursorLineI += this.select.range.lowerLineI;
      newCursorCharI = pastedLines[pastedLines.length-1].length;

      pastedLines[pastedLines.length-1] += this.nodeLines
        .strGet(this.select.range.upperLineI)
        .substring(this.select.range.upperCharI);

      for(let pastedLine of pastedLines){
        if(pastedLine.length > NUM.NODE_WIDTH_MAIN) return;
      }

      this.delSelection();
    }
    // If on last node line and last pastedLine is empty, remove empty line
    if(isLastEmpty && newCursorLineI === this.nodeLines.maxLines){
      newCursorLineI -= 1;
      pastedLines.splice(-1);
      newCursorCharI = pastedLines[pastedLines.length-1].length;
    }

    for(let i=0; i<pastedLines.length-1; i++)
      this.nodeLines.lineAdd(this.cursor.lineI);
    for(let i=0; i<pastedLines.length; i++)
      this.nodeLines.strSet(this.cursor.lineI+i, pastedLines[i]);

    this.cursor.lineI = newCursorLineI;
    this.cursor.charI = newCursorCharI;
  }
  selectAll(){
    if(this.select.nodeI === null) return;

    this.select.range.start.lineI = this.select.range.start.charI = 0;
    this.cursor.lineI = this.select.range.current.lineI =
      this.nodeLines.lineCount()-1;
    this.cursor.charI = this.select.range.current.charI =
      this.nodeLines.strLen(this.cursor.lineI);
  }

  drawNodes(){
    for(let i=0; i<this.nodes.length; i++){
      this.nodes[i].drawNode(this.select.nodeI === i ? this.select : null);
    }
  }
}
