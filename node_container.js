"use strict";

// Used for when the user highlights text in their code
class Selection{
    constructor(){
        this.nodeI = null; // Index of ComputeNode being focused
        this.cursor = { line: -1, charI: 0 }; // Cursor location
        this.range = {
            lower: { line: 0, charI: 0 },
            upper: { line: 0, charI: 0 },
        }; // Selection range
        this.cursorBlink = Date.now();
    }

    lineSelected(line){
        if(
            this.range.lower.line == this.range.upper.line &&
            this.range.lower.charI == this.range.upper.charI
        ) return false;
        if(
            this.range.lower.line <= line &&
            this.range.upper.line >= line
        ) return true;
        return false;
    }
    charSelected(line, charI){
        if(!this.lineSelected(line)) return false;
        if(
            this.range.lower.charI <= charI &&
            this.range.upper.charI > charI
        ) return true;
        return false;
    }

    resetSelection(){
        this.range = {
            lower: { line: 0, charI: 0 },
            upper: { line: 0, charI: 0 },
        };
    }
    focusLost(){
        this.nodeI = null;
        this.cursor.line = -1;
        this.cursor.charI = 0;
        this.resetSelection();
    }
    resetBlinker(){
        this.cursorBlink = Date.now();
    }
}

// Holds all nodes. Coordinates keyboard input and mouse selection
class NodeContainer{
    constructor(nodesType){
        this.nodesW = nodesType[0].length; // Width of table of nodes
        this.nodesH = nodesType.length; // Height of table of nodes

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

    initCompareCursors(){
        if(this.select.nodeI === null) return;

        return {
            line: this.cursor.line,
            charI: this.cursor.charI
        }
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
                this.focusNode = this.nodes[this.select.nodeI].codeBox.lines;

                this.cursor.line = Math.min(
                    this.nodes[i].codeBox.lines.strCount()-1,
                    Math.floor((mPos.y-boxY)/LINE_HEIGHT));
                this.select.range.lower.line = this.cursor.line
                this.select.range.upper.line = this.cursor.line

                this.cursor.charI = Math.min(
                    this.nodes[i].codeBox.lines.strLength(this.cursor.line),
                    Math.floor((mPos.x-boxX)/CHAR_WIDTH));
                this.select.range.lower.charI = this.cursor.charI
                this.select.range.upper.charI = this.cursor.charI

                this.select.resetBlinker();
                break;
            }
        }
    }
    lmbUp(mPos){ // Left mouse button released

    }

    addChar(char){
        if(this.select.nodeI === null) return;
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
        }else if(this.cursor.line < this.focusNode.strCount()-1){
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
            if(this.cursor.line > 0){
                this.cursor.line -= 1;
                if(
                    this.cursor.charI >
                    this.focusNode.strLength(this.cursor.line)
                ){
                    this.cursor.charI =
                        this.focusNode.strLength(this.cursor.line);
                }
            }else{
                this.cursor.charI = 0;
            }
        }else if(keyCode == 2){ // Right
            if(this.cursor.charI < this.focusNode.strLength(this.cursor.line)){
                this.cursor.charI += 1;
            }else if(this.cursor.line < this.focusNode.strCount()-1){
                this.cursor.line += 1;
                this.cursor.charI = 0;
            }
        }else if(keyCode == 3){ // Down
            if(this.cursor.line < this.focusNode.strCount()-1){
                this.cursor.line += 1;
                if(
                    this.cursor.charI >
                    this.focusNode.strLength(this.cursor.line)
                ){
                    this.cursor.charI =
                        this.focusNode.strLength(this.cursor.line);
                }
            }else{
                this.cursor.charI =
                    this.focusNode.strLength(this.cursor.line)
            }
        }
    }

    drawNodes(){
        for(let i=0; i<this.nodes.length; i++){
            if(this.select.nodeI === i)
                this.nodes[i].drawNode(this.select);
            else
                this.nodes[i].drawNode(new Selection());
        }
    }
}
