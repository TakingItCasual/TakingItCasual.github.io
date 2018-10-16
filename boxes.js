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
        this.lineStrs = [""];
    }
    strAdd(index){
        this.lineStrs.splice(index+1, 0, "");
    }
    strDel(index){
        if(index >= this.lineStrs.length) return;
        if(this.lineStrs.length <= 1) return; // Don't want an empty lineStr
        this.lineStrs.splice(index, 1);
    }
    strCount(){
        return this.lineStrs.length;
    }
    strGet(index){
        if(index >= this.lineStrs.length) return "";
        return this.lineStrs[index];
    }
    strSet(index, strValue){
        if(index >= this.maxLines) return; // Index out of range
        while(index >= this.lineStrs.length)
            this.lineStrs.push(""); // Expand lineString
        // The substr crops the strValue to prevent text overflow
        this.lineStrs[index] = strValue.substr(0, this.lineW);
    }
    strLength(index){
        if(index >= this.lineStrs.length) return 0;
        return this.lineStrs[index].length;
    }
    strCut(index, charI){ // Cuts string charI from end
        if(index >= this.lineStrs.length) return "";
        if(charI > this.lineStrs[index].length) return "";
        let cutStr = this.lineStrs[index].substr(-charI);
        this.lineStrs[index] = this.lineStrs[index].slice(0, -charI);
        return cutStr;
    }
    charAdd(index, charI, charVar){
        if(index >= this.lineStrs.length) return;
        if(charI > this.lineStrs[index].length)
            charI = this.lineStrs[index].length;
        let str = this.lineStrs[index];
        this.strSet(index,
            str.substr(0, charI) + charVar + str.substr(charI));
    }
    charDel(index, charI){
        if(index >= this.lineStrs.length) return;
        if(charI > this.lineStrs[index].length) return;
        let str = this.lineStrs[index];
        this.strSet(index, str.substr(0, charI-1) + str.substr(charI));
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

        this.lines = new StringList(this.lineW, this.maxLines);
    }

    // Draws text from lineString to the canvas (extraY used for "FAILURE")
    drawLine(line, color=ctx.fillStyle, extraY=0){
        let offsetX = 0;
        if(this.centered){ // Centers text within box's width
            offsetX = (CHAR_WIDTH/2)*(this.lineW - this.lines.strLength(line));
        }
        ctx.fillStyle = color;
        ctx.fillText(
            this.lines.strGet(line),
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
        this.start.line = -1
        this.start.charI = 0
        this.end.line = -1
        this.end.charI = 0
    }
    focusLost(){
        this.cursor.line = -1
        this.cursor.charI = 0
        this.resetSelection();
    }
    resetBlinker(){
        this.cursorBlink = Date.now();
    }
}

// Can divide a line into different colors for comments and selection
class BoxCode extends BoxText{
    constructor(x, y, lineW, maxLines, extraH, offsetY){
        super(x, y, lineW, maxLines, extraH, offsetY, false, 1);
        this.activeLine = null; // Indicates currently executing line
        this.executable = true; // True if the current line was just reached
    }

    // Draws text, executing line or selected text bars, and the blinking thingy
    drawAllLinesAndBars(select){
        // Draws bar under currently executing line
        if(this.activeLine !== null){
            if(this.executable) ctx.fillStyle = ACTIVE_EXEC;
            else ctx.fillStyle = WAIT_EXEC;
            this.drawBar(
                this.activeLine, 0, this.lineW, ctx.fillStyle,
                CHAR_GAP, CHAR_GAP-2
            );
        }

        // Draws bars under selected text, as well as the text itself
        for(let i=0; i<this.maxLines; i++){
            if(!this.lines.strGet(i)) continue; // String is empty

            let commentStart = this.lines.strGet(i).indexOf("#");
            let selectStart = -1;
            let selectEnd = -1;
            // Draws bar under selected text
            if(select.lineSelected(i) && this.activeLine === null){
                if(select.start.line < i) selectStart = 0;
                else selectStart = select.start.charI;

                if(select.end.line > i) selectEnd = this.lines.strLength(i);
                else selectEnd = select.end.charI;

                this.drawBar(i, selectStart, selectEnd, SELECT_GRAY);
            }

            this.drawSplitLine(i, commentStart, selectStart, selectEnd);
        }

        // Blinking thingy
        if(this.activeLine === null && select.cursor.line != -1){
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
            this.activeLine === line ||
            (commentStart == -1 && selectStart == -1)
        ){ // Only a single color will be used to draw the text
            if(this.activeLine === line) ctx.fillStyle = BLACK;
            else ctx.fillStyle = DIM_WHITE;

            this.drawLine(line);
            return;
        }

        // To ensure that the Math.min calculations work properly
        if(commentStart == -1) commentStart = NODE_WIDTH;
        if(selectStart == -1) selectStart = selectEnd = NODE_WIDTH;

        let strParts = []; // The cut string
        let strStart = []; // Index number of from where the string was cut
        let strColor = []; // Color of the string_part

        if(Math.min(commentStart, selectStart) > 0){
            strParts.push(this.lines.strGet(line).substr(
                0, Math.min(commentStart, selectStart)));
            strStart.push(0);
            strColor.push(DIM_WHITE);
        }
        if(commentStart != NODE_WIDTH && selectStart == NODE_WIDTH){
            if(commentStart > 0){
                strParts.push(this.lines.strGet(line).substr(commentStart));
                strStart.push(commentStart);
                strColor.push(COMMENT_GRAY);
            }else{
                strParts.push(this.lines.strGet(line));
                strStart.push(0);
                strColor.push(COMMENT_GRAY);
            }
        }else if(commentStart == NODE_WIDTH && selectStart != NODE_WIDTH){
            if(selectStart > 0){
                strParts.push(this.lines.strGet(line).substr(
                    selectStart, selectEnd));
                strStart.push(selectStart);
                strColor.push(WHITE);

                if(selectEnd < this.lines.strLength(line)){
                    strParts.push(this.lines.strGet(line).substr(selectEnd));
                    strStart.push(selectEnd);
                    strColor.push(DIM_WHITE);
                }
            }else{
                strParts.push(this.lines.strGet(line).substr(
                    selectStart, selectEnd));
                strStart.push(selectStart);
                strColor.push(WHITE);

                if(selectEnd < this.lines.strLength(line)){
                    strParts.push(this.lines.strGet(line).substr(selectEnd));
                    strStart.push(selectEnd);
                    strColor.push(DIM_WHITE);
                }
            }
        }else{
            if(commentStart <= selectStart){
                if(commentStart < selectStart){
                    strParts.push(this.lines.strGet(line).substr(
                        commentStart, selectStart));
                    strStart.push(commentStart);
                    strColor.push(COMMENT_GRAY);
                }

                strParts.push(this.lines.strGet(line).substr(
                    selectStart, selectEnd));
                strStart.push(selectStart);
                strColor.push(DIM_WHITE);

                if(selectEnd < this.lines.strLength(line)){
                    strParts.push(this.lines.strGet(line).substr(selectEnd));
                    strStart.push(selectEnd);
                    strColor.push(COMMENT_GRAY);
                }
            }else if(selectStart < commentStart && commentStart < selectEnd){
                strParts.push(this.lines.strGet(line).substr(
                    selectStart, commentStart));
                strStart.push(selectStart);
                strColor.push(WHITE);

                strParts.push(this.lines.strGet(line).substr(
                    commentStart, selectEnd));
                strStart.push(commentStart);
                strColor.push(DIM_WHITE);

                if(selectEnd < this.lines.strLength(line)){
                    strParts.push(this.lines.strGet(line).substr(selectEnd));
                    strStart.push(selectEnd);
                    strColor.push(COMMENT_GRAY);
                }
            }else if(commentStart >= selectEnd){
                strParts.push(this.lines.strGet(line).substr(
                    selectStart, selectEnd));
                strStart.push(selectStart);
                strColor.push(WHITE);

                if(commentStart > selectEnd){
                    strParts.push(this.lines.strGet(line).substr(
                        selectEnd, commentStart));
                    strStart.push(commentStart);
                    strColor.push(DIM_WHITE);
                }

                strParts.push(this.lines.strGet(line).substr(commentStart));
                strStart.push(commentStart);
                strColor.push(COMMENT_GRAY);
            }
        }

        for(let i=0; i<strParts.length; i++){
            ctx.fillStyle = strColor[i];
            ctx.fillText(
                strParts[i],
                this.x+CHAR_GAP + CHAR_WIDTH*strStart[i],
                this.y+this.offsetY + (line+1)*LINE_HEIGHT
            );
        }
    }
}
