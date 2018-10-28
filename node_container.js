"use strict";

// Used for when the user highlights text in their code
class Selection{
    constructor(){
        this.nodeI = null; // Index of ComputeNode being focused
        this.cursor = { lineI: -1, charI: 0 }; // Cursor location
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
                if(
                    this.start.lineI === this.current.lineI &&
                    this.start.charI === this.current.charI
                ) return true;
                return false;
            }
        }; // Selection range
        this.cursorBlink = Date.now();
    }

    lineSelected(lineI){
        if(this.range.isNull) return false;
        if(
            this.range.lowerLineI <= lineI &&
            this.range.upperLineI >= lineI
        ) return true;
        return false;
    }

    focusLost(){
        this.nodeI = null;
        this.cursor.lineI = -1;
        this.cursor.charI = 0;
        this.range.initTo(0, 0);
    }
    resetBlinker(){
        this.cursorBlink = Date.now();
    }
}

// Holds all nodes. Coordinates keyboard input and mouse selection
class NodeContainer{
    constructor(nodeTypes){
        this.nodesW = nodeTypes[0].length; // Width of table of nodes
        this.nodesH = nodeTypes.length; // Height of table of nodes

        this.nodeLines = null; // Object reference for codeBox's lines

        this.select = new Selection(); // Passed to the currently focused node
        this.emptySelect = new Selection(); // Passed to unfocused nodes
        this.cursor = this.select.cursor; // Used as an object reference

        let sizeInit = {
            lineW: NODE_WIDTH+1, // Width of line (chars)
            maxLines: NODE_HEIGHT, // Maximum number of lines
            sideW: ACC_MIN.toString().length+1, // Width of side boxes (chars)
            sideWPx: 0 // Width of side boxes (px)
        };
        sizeInit.sideWPx = sizeInit.sideW*CHAR_WIDTH + CHAR_GAP*2;

        this.nodes = [];
        let nodeY = 53;
        for(let y=0; y<this.nodesH; y++){
            let nodeX = 355;
            for(let x=0; x<this.nodesW; x++){
                if(nodeTypes[y][x] === 0){
                    this.nodes.push(new CorruptNode(nodeX, nodeY, sizeInit));
                }else if(nodeTypes[y][x] === 1){
                    this.nodes.push(new ComputeNode(nodeX, nodeY, sizeInit));
                }else if(nodeTypes[y][x] === 2){
                    this.nodes.push(new StackMemNode(nodeX, nodeY, sizeInit));
                }
                nodeX += this.nodes[0].nodeBox.w + 46;
            }
            nodeY += this.nodes[0].nodeBox.h + 40;
        }
    }

    initCompareCursors(){
        if(this.select.nodeI === null) return null;

        return {
            lineI: this.cursor.lineI,
            charI: this.cursor.charI
        };
    }
    compareCursors(prevCursor){
        if(
            prevCursor.lineI !== this.cursor.lineI ||
            prevCursor.charI !== this.cursor.charI
        ){
            this.select.resetBlinker();
        }
    }

    mouseDrag(mPos){ // Mouse held down, mouse movement
        if(this.select.nodeI === null) return;

        let [cornerX, cornerY] = this._nodeTopLeft(this.select.nodeI);
        this._cursorToMouse(this.select.nodeI, mPos, cornerX, cornerY);
        this.select.range.current.lineI = this.cursor.lineI;
        this.select.range.current.charI = this.cursor.charI;
        this.select.resetBlinker();
    }
    lmbDown(mPos){ // Left mouse button clicked
        let cornerX = 0;
        let cornerY = 0;
        for(let i=0; i<=this.nodes.length; i++){
            if(i === this.nodes.length){ // No nodes were selected
                this.select.nodeI = this.nodeLines = null;
                break;
            }
            // codeBox only exists within computeNodes
            if(this.nodes[i].nodeType !== 1) continue;

            [cornerX, cornerY] = this._nodeTopLeft(i);
            if(
                mPos.x >= cornerX &&
                mPos.x < cornerX + (NODE_WIDTH+1)*CHAR_WIDTH &&
                mPos.y >= cornerY &&
                mPos.y < cornerY + NODE_HEIGHT*LINE_HEIGHT
            ){ // Collision detection
                this.select.nodeI = i;
                // Huzzah for object references
                this.nodeLines = this.nodes[i].codeBox.lines;

                this._cursorToMouse(i, mPos, cornerX, cornerY);
                this.select.range.initTo(this.cursor.lineI, this.cursor.charI);
                this.select.resetBlinker();
                break;
            }
        }
    }
    _nodeTopLeft(nodeI){
        let cornerX = this.nodes[nodeI].codeBox.x + CHAR_GAP;
        let cornerY = this.nodes[nodeI].codeBox.y + 2*CHAR_GAP +
            this.nodes[nodeI].codeBox.offsetY - Math.floor(CHAR_GAP/2);
        return [cornerX, cornerY];
    }
    _cursorToMouse(nodeI, mPos, cornerX, cornerY){
        this.cursor.lineI = Math.max(0, Math.min(
            this.nodes[nodeI].codeBox.lines.strCount()-1,
            Math.floor((mPos.y-cornerY)/LINE_HEIGHT)));
        this.cursor.charI = Math.max(0, Math.min(
            this.nodes[nodeI].codeBox.lines.strLen(this.cursor.lineI),
            Math.floor((mPos.x-cornerX)/CHAR_WIDTH)));
    }

    addChar(char){
        if(!ALLOWED_CHARS.test(char) || char.length !== 1) return;

        if(!this.select.range.isNull){
            let afterDel = this._delSelectionInfo();
            if(afterDel === null) return;
            if(afterDel.lowerLineLen + 1 > NODE_WIDTH) return;

            this.delSelection();
        }else if(this.nodeLines.strLen(this.cursor.lineI) >= NODE_WIDTH){
            return;
        }

        this.nodeLines.charAdd(this.cursor.lineI, this.cursor.charI, char);
        this.cursor.charI += 1;
    }
    newLine(){
        if(this.nodeLines.strCount() >= NODE_HEIGHT) return;

        let distToEndOfLine =
            this.nodeLines.strLen(this.cursor.lineI) - this.cursor.charI;

        this.nodeLines.strAdd(this.cursor.lineI);
        this.cursor.lineI += 1;
        this.cursor.charI = 0;

        if(distToEndOfLine > 0){
            let strToMove = this.nodeLines.strCut(
                this.cursor.lineI-1, distToEndOfLine);
            this.nodeLines.strSet(this.cursor.lineI, strToMove);
        }
    }
    bakChar(){
        if(!this.select.range.isNull){
            this.delSelection();
        }else if(this.cursor.charI > 0){
            this.nodeLines.charDel(this.cursor.lineI, this.cursor.charI);
            this.cursor.charI -= 1;
        }else if(this.cursor.lineI > 0){
            if(
                this.nodeLines.strLen(this.cursor.lineI-1) +
                this.nodeLines.strLen(this.cursor.lineI) <=
                NODE_WIDTH
            ){
                this.cursor.lineI -= 1;
                this.cursor.charI = this.nodeLines.strLen(this.cursor.lineI);

                let combinedStr =
                    this.nodeLines.strGet(this.cursor.lineI) +
                    this.nodeLines.strGet(this.cursor.lineI+1);
                this.nodeLines.strSet(this.cursor.lineI, combinedStr);

                this.nodeLines.strDel(this.cursor.lineI+1);
            }
        }
    }
    delChar(){
        if(!this.select.range.isNull){
            this.delSelection();
        }else if(this.cursor.charI < this.nodeLines.strLen(this.cursor.lineI)){
            this.nodeLines.charDel(this.cursor.lineI, this.cursor.charI+1);
        }else if(this.cursor.lineI < this.nodeLines.strCount()-1){
            if(
                this.nodeLines.strLen(this.cursor.lineI) +
                this.nodeLines.strLen(this.cursor.lineI+1) <=
                NODE_WIDTH
            ){
                let combinedStr =
                    this.nodeLines.strGet(this.cursor.lineI) +
                    this.nodeLines.strGet(this.cursor.lineI+1);
                this.nodeLines.strSet(this.cursor.lineI, combinedStr);

                this.nodeLines.strDel(this.cursor.lineI+1);
            }
        }
    }
    delSelection(){
        if(this._delSelectionInfo() !== null){
            let combinedStr =
                this.nodeLines.strGet(this.select.range.lowerLineI).substr(
                    0, this.select.range.lowerCharI) +
                this.nodeLines.strGet(this.select.range.upperLineI).substr(
                    this.select.range.upperCharI);
            this.nodeLines.strSet(this.select.range.lowerLineI, combinedStr);

            for(let i=this.select.range.lineCount-1; i>0; i--){
                this.nodeLines.strDel(this.select.range.lowerLineI+1);
            }

            this.cursor.lineI = this.select.range.lowerLineI;
            this.cursor.charI = this.select.range.lowerCharI;
            this.select.range.initTo(this.cursor.lineI, this.cursor.charI);
        }
    }
    _delSelectionInfo(){
        if(this.select.range.isNull) return null;

        let newLowerLineLen =
            this.select.range.lowerCharI +
            this.nodeLines.strLen(this.select.range.upperLineI) -
            this.select.range.upperCharI;
        if(newLowerLineLen > NODE_WIDTH) return null;

        let newLineCount = this.nodeLines.strCount() -
            this.select.range.upperLineI + this.select.range.lowerLineI;
        return {
            lowerLineLen: newLowerLineLen,
            lineCount: newLineCount
        };
    }

    arrowKey(keyCode){
        this.select.range.initTo(0, 0);
        if(keyCode === 0){ // Left
            if(this.cursor.charI > 0){
                this.cursor.charI -= 1;
            }else if(this.cursor.lineI > 0){
                this.cursor.lineI -= 1;
                this.cursor.charI = this.nodeLines.strLen(this.cursor.lineI);
            }
        }else if(keyCode === 1){ // Up
            if(this.cursor.lineI > 0){
                this.cursor.lineI -= 1;
                if(
                    this.cursor.charI >
                    this.nodeLines.strLen(this.cursor.lineI)
                ){
                    this.cursor.charI =
                        this.nodeLines.strLen(this.cursor.lineI);
                }
            }else{
                this.cursor.charI = 0;
            }
        }else if(keyCode === 2){ // Right
            if(this.cursor.charI < this.nodeLines.strLen(this.cursor.lineI)){
                this.cursor.charI += 1;
            }else if(this.cursor.lineI < this.nodeLines.strCount()-1){
                this.cursor.lineI += 1;
                this.cursor.charI = 0;
            }
        }else if(keyCode === 3){ // Down
            if(this.cursor.lineI < this.nodeLines.strCount()-1){
                this.cursor.lineI += 1;
                if(
                    this.cursor.charI >
                    this.nodeLines.strLen(this.cursor.lineI)
                ){
                    this.cursor.charI =
                        this.nodeLines.strLen(this.cursor.lineI);
                }
            }else{
                this.cursor.charI =
                    this.nodeLines.strLen(this.cursor.lineI);
            }
        }
    }

    attemptCopy(){
        if(this.select.nodeI === null) return null;

        if(this.select.range.lineCount === 0){
            return null;
        }else if(this.select.range.lineCount === 1){
            return this.nodeLines.strGet(
                this.select.range.lowerLineI).substring(
                    this.select.range.lowerCharI,
                    this.select.range.upperCharI);
        }else{
            let strParts = [this.nodeLines.strGet(
                this.select.range.lowerLineI).substr(
                    this.select.range.lowerCharI)];
            for(let i=1; i<this.select.range.lineCount-1; i++){
                strParts.push(this.nodeLines.strGet(
                    this.select.range.lowerLineI + i));
            }
            strParts.push(this.nodeLines.strGet(
                this.select.range.upperLineI).substr(
                    0, this.select.range.upperCharI));

            return strParts.join("\n");
        }
    }
    attemptCut(){
        let savedSelection = this.attemptCopy();
        if(savedSelection === null) return null;

        if(this._delSelectionInfo() === null) return null;
        this.delSelection();

        return savedSelection;
    }
    attemptPaste(clipboardStr){
        if(this.select.nodeI === null) return;
        if(!clipboardStr) return;

        let pastedLines = clipboardStr.split(/\r?\n/);
        for(let pastedLine of pastedLines){
            if(!ALLOWED_CHARS.test(pastedLine)) return;
        }

        let newCursorLineI = pastedLines.length-1; // Appended to later
        let newCursorCharI = null; // Set later
        if(this.select.range.isNull){
            if(this.nodeLines.strCount() + pastedLines.length-1 > NODE_HEIGHT)
                return;

            pastedLines[0] = this.nodeLines.strGet(this.cursor.lineI).substr(
                0, this.cursor.charI) + pastedLines[0];

            newCursorLineI += this.cursor.lineI;
            newCursorCharI = pastedLines[pastedLines.length-1].length;

            pastedLines[pastedLines.length-1] += this.nodeLines.strGet(
                this.cursor.lineI).substr(this.cursor.charI);

            for(let pastedLine of pastedLines){
                if(pastedLine.length > NODE_WIDTH) return;
            }
        }else{
            let afterDel = this._delSelectionInfo();

            if(afterDel === null) return;
            if(afterDel.lineCount + pastedLines.length-1 > NODE_HEIGHT) return;

            pastedLines[0] = this.nodeLines.strGet(
                this.select.range.lowerLineI).substr(
                0, this.select.range.lowerCharI) + pastedLines[0];

            newCursorLineI += this.select.range.lowerLineI;
            newCursorCharI = pastedLines[pastedLines.length-1].length;

            pastedLines[pastedLines.length-1] += this.nodeLines.strGet(
                this.select.range.upperLineI).substr(
                this.select.range.upperCharI);

            for(let pastedLine of pastedLines){
                if(pastedLine.length > NODE_WIDTH) return;
            }

            this.delSelection();
        }
        for(let i=0; i<pastedLines.length-1; i++)
            this.nodeLines.strAdd(this.cursor.lineI);
        for(let i=0; i<pastedLines.length; i++)
            this.nodeLines.strSet(this.cursor.lineI+i, pastedLines[i]);

        this.cursor.lineI = newCursorLineI;
        this.cursor.charI = newCursorCharI;
    }
    selectAll(){
        this.select.range.start.lineI = this.select.range.start.charI = 0
        this.cursor.lineI = this.select.range.current.lineI =
            this.nodeLines.strCount()-1;
        this.cursor.charI = this.select.range.current.charI =
            this.nodeLines.strLen(this.cursor.lineI);
    }

    drawNodes(){
        for(let i=0; i<this.nodes.length; i++){
            if(this.select.nodeI === i)
                this.nodes[i].drawNode(this.select);
            else
                this.nodes[i].drawNode(this.emptySelect);
        }
    }
}
