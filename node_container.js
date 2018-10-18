"use strict";

// Used for when the user highlights text in their code
class Selection{
    constructor(){
        this.nodeI = null; // Index of ComputeNode being focused
        this.cursor = { line: -1, charI: 0 }; // Cursor location
        this.range = {
            start: { line: 0, charI: 0 },
            current: { line: 0, charI: 0 },
            initTo(line, charI){
                this.start.line = this.current.line = line;
                this.start.charI = this.current.charI = charI;
            },
            get lowerLine(){
                return Math.min(this.start.line, this.current.line);
            },
            get lowerCharI(){
                if(this.start.line < this.current.line)
                    return this.start.charI;
                if(this.start.line > this.current.line)
                    return this.current.charI;
                return Math.min(this.start.charI, this.current.charI);
            },
            get upperLine(){
                return Math.max(this.start.line, this.current.line);
            },
            get upperCharI(){
                if(this.start.line > this.current.line)
                    return this.start.charI;
                if(this.start.line < this.current.line)
                    return this.current.charI;
                return Math.max(this.start.charI, this.current.charI);
            }
        }; // Selection range
        this.cursorBlink = Date.now();
    }

    lineSelected(line){
        if(
            this.range.lowerLine == this.range.upperLine &&
            this.range.lowerCharI == this.range.upperCharI
        ) return false;
        if(
            this.range.lowerLine <= line &&
            this.range.upperLine >= line
        ) return true;
        return false;
    }
    charSelected(line, charI){
        if(!this.lineSelected(line)) return false;
        if(
            this.range.lowerCharI <= charI &&
            this.range.upperCharI > charI
        ) return true;
        return false;
    }

    focusLost(){
        this.nodeI = null;
        this.cursor.line = -1;
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
            extraH: CHAR_GAP*2, // Extra height of main text box (px)
            offsetY: CHAR_GAP, // Distance lines are pushed down (px)
            sideW: ACC_MIN.toString().length+1, // Width of side boxes (chars)
            sideWPx: 0 // Width of side boxes (px)
        };
        sizeInit.sideWPx = sizeInit.sideW*CHAR_WIDTH + CHAR_GAP*2;

        this.nodes = [];
        let nodeY = 53;
        for(let y=0; y<this.nodesH; y++){
            let nodeX = 355;
            for(let x=0; x<this.nodesW; x++){
                if(nodeTypes[y][x] == 0){
                    this.nodes.push(new CorruptNode(nodeX, nodeY, sizeInit));
                }else if(nodeTypes[y][x] == 1){
                    this.nodes.push(new ComputeNode(nodeX, nodeY, sizeInit));
                }else if(nodeTypes[y][x] == 2){
                    this.nodes.push(new StackMemNode(nodeX, nodeY, sizeInit));
                }
                nodeX += this.nodes[0].nodeBox.w + 46;
            }
            nodeY += this.nodes[0].nodeBox.h + 40;
        }
    }

    initCompareCursors(){
        if(this.select.nodeI === null) return;

        return {
            line: this.cursor.line,
            charI: this.cursor.charI
        };
    }
    compareCursors(prevCursor){
        if(this.select.nodeI === null) return;

        if(
            prevCursor.line != this.cursor.line ||
            prevCursor.charI != this.cursor.charI
        ){
            this.select.resetBlinker();
        }
    }

    mouseMove(mPos){ // Mouse held down, mouse movement
        let i = this.select.nodeI
        let boxX = this.nodes[i].codeBox.x + CHAR_GAP;
        let boxY = this.nodes[i].codeBox.y + CHAR_GAP +
            this.nodes[i].codeBox.offsetY - Math.floor(CHAR_GAP/2);

        this.cursor.line = Math.max(0, Math.min(
            this.nodes[i].codeBox.lines.strCount()-1,
            Math.floor((mPos.y-boxY)/LINE_HEIGHT)));
        this.select.range.current.line = this.cursor.line;

        this.cursor.charI = Math.max(0, Math.min(
            this.nodes[i].codeBox.lines.strLength(this.cursor.line),
            Math.floor((mPos.x-boxX)/CHAR_WIDTH)));
        this.select.range.current.charI = this.cursor.charI;

        this.select.resetBlinker();
    }
    lmbDown(mPos){ // Left mouse button clicked
        let boxX = 0;
        let boxY = 0;
        for(let i=0; i<=this.nodes.length; i++){
            // No nodes were selected
            if(i == this.nodes.length){
                this.select.nodeI = null;
                break;
            }
            // codeBox only exists within computeNodes
            if(this.nodes[i].nodeType != 1) continue;

            boxX = this.nodes[i].codeBox.x + CHAR_GAP;
            boxY = this.nodes[i].codeBox.y + CHAR_GAP +
                this.nodes[i].codeBox.offsetY - Math.floor(CHAR_GAP/2);
            if(
                mPos.x >= boxX &&
                mPos.x < boxX + (NODE_WIDTH+1)*CHAR_WIDTH &&
                mPos.y >= boxY &&
                mPos.y < boxY + NODE_HEIGHT*LINE_HEIGHT
            ){ // Collision detection
                this.select.nodeI = i;
                // Huzzah for object references
                this.nodeLines = this.nodes[this.select.nodeI].codeBox.lines;

                this.cursor.line = Math.max(0, Math.min(
                    this.nodes[i].codeBox.lines.strCount()-1,
                    Math.floor((mPos.y-boxY)/LINE_HEIGHT)));

                this.cursor.charI = Math.max(0, Math.min(
                    this.nodes[i].codeBox.lines.strLength(this.cursor.line),
                    Math.floor((mPos.x-boxX)/CHAR_WIDTH)));

                this.select.range.initTo(this.cursor.line, this.cursor.charI);
                this.select.resetBlinker();
                break;
            }
        }
    }
    lmbUp(mPos){ // Left mouse button released

    }

    addChar(char){
        if(this.select.nodeI === null) return;
        if(this.nodeLines.strLength(this.cursor.line) >= NODE_WIDTH) return;

        this.nodeLines.charAdd(this.cursor.line, this.cursor.charI, char);
        this.cursor.charI += 1;
    }
    newLine(){
        if(this.nodeLines.strCount() >= NODE_HEIGHT) return;

        let distToEndOfLine =
            this.nodeLines.strLength(this.cursor.line) - this.cursor.charI;

        this.nodeLines.strAdd(this.cursor.line);
        this.cursor.line += 1;
        this.cursor.charI = 0;

        if(distToEndOfLine > 0){
            let strToMove = this.nodeLines.strCut(
                this.cursor.line-1, distToEndOfLine);
            this.nodeLines.strSet(this.cursor.line, strToMove);
        }
    }
    bakChar(){
        if(this.cursor.charI > 0){
            this.nodeLines.charDel(this.cursor.line, this.cursor.charI);
            this.cursor.charI -= 1;
        }else if(this.cursor.line > 0){
            if(
                this.nodeLines.strLength(this.cursor.line-1) +
                this.nodeLines.strLength(this.cursor.line) <=
                NODE_WIDTH
            ){
                this.cursor.line -= 1;
                this.cursor.charI = this.nodeLines.strLength(this.cursor.line);

                let combinedStr =
                    this.nodeLines.strGet(this.cursor.line) +
                    this.nodeLines.strGet(this.cursor.line+1);
                this.nodeLines.strSet(this.cursor.line, combinedStr);

                this.nodeLines.strDel(this.cursor.line+1);
            }
        }
    }
    delChar(){
        if(this.cursor.charI < this.nodeLines.strLength(this.cursor.line)){
            this.nodeLines.charDel(this.cursor.line, this.cursor.charI+1);
        }else if(this.cursor.line < this.nodeLines.strCount()-1){
            if(
                this.nodeLines.strLength(this.cursor.line) +
                this.nodeLines.strLength(this.cursor.line+1) <=
                NODE_WIDTH
            ){
                let combinedStr =
                    this.nodeLines.strGet(this.cursor.line) +
                    this.nodeLines.strGet(this.cursor.line+1);
                this.nodeLines.strSet(this.cursor.line, combinedStr);

                this.nodeLines.strDel(this.cursor.line+1);
            }
        }
    }

    arrowKey(keyCode){
        this.select.range.initTo(0, 0);
        if(keyCode == 0){ // Left
            if(this.cursor.charI > 0){
                this.cursor.charI -= 1;
            }else if(this.cursor.line > 0){
                this.cursor.line -= 1;
                this.cursor.charI = this.nodeLines.strLength(this.cursor.line);
            }
        }else if(keyCode == 1){ // Up
            if(this.cursor.line > 0){
                this.cursor.line -= 1;
                if(
                    this.cursor.charI >
                    this.nodeLines.strLength(this.cursor.line)
                ){
                    this.cursor.charI =
                        this.nodeLines.strLength(this.cursor.line);
                }
            }else{
                this.cursor.charI = 0;
            }
        }else if(keyCode == 2){ // Right
            if(this.cursor.charI < this.nodeLines.strLength(this.cursor.line)){
                this.cursor.charI += 1;
            }else if(this.cursor.line < this.nodeLines.strCount()-1){
                this.cursor.line += 1;
                this.cursor.charI = 0;
            }
        }else if(keyCode == 3){ // Down
            if(this.cursor.line < this.nodeLines.strCount()-1){
                this.cursor.line += 1;
                if(
                    this.cursor.charI >
                    this.nodeLines.strLength(this.cursor.line)
                ){
                    this.cursor.charI =
                        this.nodeLines.strLength(this.cursor.line);
                }
            }else{
                this.cursor.charI =
                    this.nodeLines.strLength(this.cursor.line);
            }
        }
    }

    attemptCopy(){
        return "aoeui";
    }
    attemptCut(){
        return "iueoa";
    }
    attemptPaste(clipboardStr){
        this.nodes[0].codeBox.lines.strSet(NODE_HEIGHT-1, clipboardStr);
    }
    selectAll(){
        this.select.range.start.line = this.select.range.start.charI = 0
        this.cursor.line = this.select.range.current.line = 
            this.nodeLines.strCount()-1;
        this.cursor.charI = this.select.range.current.charI =
            this.nodeLines.strLength(this.cursor.line);
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
