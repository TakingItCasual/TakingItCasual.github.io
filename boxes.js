"use strict";

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
        this.strCount = function(is_zero_indexed){
            return is_zero_indexed ? lineString.length - 1 : lineString.length;
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
        this.cursor = { line: -1, charI: 0 }; // Cursor location
        this.start = { line: -1, charI: 0 }; // Start of selection
        this.end = { line: -1, charI: 0 }; // End of selection

        // Ensures the blinking thingy doesn't fade when it moves around
        this.cursorBlink = Date.now();
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

    resetSelection(){
        this.start.line = -1;
        this.start.charI = 0;
        this.end.line = -1;
        this.end.charI = 0;
    }
    focusLost(){
        this.cursor.line = -1;
        this.cursor.charI = 0;
        this.resetSelection();
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

        // Draws bars under selected text, as well as the text itself
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
            let blinkTime = (Date.now() - select.cursorBlink) % 800;
            if(blinkTime < 400){ // Get the blinking thingy to blink every 800ms
                this.drawBar(
                    select.cursor.line, select.cursor.charI, 
                    select.cursor.charI+1, CURSOR_WHITE
                );
            }
        }
    }
    // Draws text lines, using seperate coloring for comments/selection
    drawSplitLine(line, commentStart, selectStart, selectEnd){
        if(
            this.currentLine == line || 
            (commentStart == -1 && selectStart == -1)
        ){ // Only a single color will be used to draw the text
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
