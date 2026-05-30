"use strict";

// Empty box, just has its dimensions and draw method
class Box{
  constructor({x, y, w, h, borderW=1}){
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
  strAdd(strI){
    this.lineStrs.splice(strI+1, 0, "");
  }
  strDel(strI){
    if(strI >= this.lineStrs.length) return;
    if(this.lineStrs.length <= 1) return; // Don't want an empty lineStr
    this.lineStrs.splice(strI, 1);
  }
  strCount(){
    return this.lineStrs.length;
  }
  strGet(strI){
    if(strI >= this.lineStrs.length) return "";
    return this.lineStrs[strI];
  }
  strSet(strI, strValue){
    if(strI >= this.maxLines) return;
    while(strI >= this.lineStrs.length)
      this.lineStrs.push(""); // Expand lineString
    // The substr crops the strValue to prevent text overflow
    this.lineStrs[strI] = strValue.substr(0, this.lineW);
  }
  strLen(strI){
    if(strI >= this.lineStrs.length) return 0;
    return this.lineStrs[strI].length;
  }
  strCut(strI, charI){ // Cuts string charI from end
    if(strI >= this.lineStrs.length) return "";
    if(charI > this.lineStrs[strI].length) return "";
    let cutStr = this.lineStrs[strI].substr(-charI);
    this.lineStrs[strI] = this.lineStrs[strI].slice(0, -charI);
    return cutStr;
  }
  charAdd(strI, charI, charVar){
    if(strI >= this.lineStrs.length) return;
    if(charI > this.lineStrs[strI].length)
      charI = this.lineStrs[strI].length;
    let str = this.lineStrs[strI];
    this.strSet(strI, str.substr(0, charI) + charVar + str.substr(charI));
  }
  charDel(strI, charI){
    if(strI >= this.lineStrs.length) return;
    if(charI > this.lineStrs[strI].length) return;
    let str = this.lineStrs[strI];
    this.strSet(strI, str.substr(0, charI-1) + str.substr(charI));
  }
}

// Can draw text and bars, dimensions set relative to font dimensions
class BoxText extends Box{
  constructor({
    x, y, lineW, maxLines, extraH=0, centered=false, borderW=1
  }){
    super({
      x: x,
      y: y,
      w: lineW*NUM.CHAR_WIDTH + NUM.CHAR_GAP*2,
      h: maxLines*NUM.LINE_HEIGHT + 3*NUM.CHAR_GAP + 1 + extraH,
      borderW: borderW
    });
    this.lineW = lineW; // Width of the box in terms of characters
    this.maxLines = maxLines; // Maximum number of string lines
    this.offsetY = Math.floor(extraH/2); // Y-padding for text lines (px)
    this.centered = centered; // If true, center text within box's width

    this.lines = new StringList(this.lineW, this.maxLines);
  }

  // Draws text from lineString to the canvas (extraY used for "FAILURE")
  drawLine(lineI, color=ctx.fillStyle, extraY=0){
    let offsetX = 0;
    if(this.centered){ // Centers text within box's width
      offsetX = (NUM.CHAR_WIDTH/2)*(this.lineW - this.lines.strLen(lineI));
    }
    ctx.fillStyle = color;
    ctx.fillText(
      this.lines.strGet(lineI),
      this.x+NUM.CHAR_GAP + offsetX,
      this.y+NUM.CHAR_GAP + (lineI+1)*NUM.LINE_HEIGHT + this.offsetY+extraY
    );
  }
  // Used to draw those solid color boxes (and bars)
  drawBar(lineI, startChar, endChar, barColor, extraStart=0, extraEnd=0){
    let offsetX = 0;
    if(this.centered){ // Centers text within box's width
      offsetX = (NUM.CHAR_WIDTH/2)*(this.lineW - (endChar - startChar));
    }
    ctx.fillStyle = barColor;
    ctx.fillRect(
      this.x+NUM.CHAR_GAP + offsetX + startChar*NUM.CHAR_WIDTH - extraStart,
      this.y + lineI*NUM.LINE_HEIGHT + 2*NUM.CHAR_GAP
        - Math.floor(NUM.CHAR_GAP/2) + this.offsetY,
      (endChar-startChar)*NUM.CHAR_WIDTH + extraStart+extraEnd,
      NUM.LINE_HEIGHT
    );
  }
}

// Can divide a line into different colors for comments and selection
class BoxCode extends BoxText{
  constructor({x, y, lineW, maxLines}){
    super({
      x: x,
      y: y,
      lineW: lineW,
      maxLines: maxLines
    });
    this.activeLine = null; // Indicates currently executing line
    this.executable = true; // True if the current line was just reached
  }

  // Draws text, executing line or selected text bars, and the blinking thingy
  drawAllLinesAndBars(select){
    // Draws bar under currently executing line
    if(this.activeLine !== null){
      if(this.executable)
        ctx.fillStyle = COLOR.ACTIVE_EXEC;
      else
        ctx.fillStyle = COLOR.WAIT_EXEC;
      this.drawBar(
        this.activeLine, 0, this.lineW, ctx.fillStyle,
        NUM.CHAR_GAP, NUM.CHAR_GAP-2
      );
    }

    // Draws bars under selected text, as well as the text itself
    for(let i=0; i<this.maxLines; i++){
      if(!this.lines.strGet(i)) continue; // String is empty

      let selectStart = -1;
      let selectEnd = -1;
      // Draws bar under selected text
      if(select !== null && select.lineSelected(i)){
        if(select.range.lowerLineI < i)
          selectStart = 0;
        else
          selectStart = select.range.lowerCharI;

        if(select.range.upperLineI > i)
          selectEnd = this.lines.strLen(i);
        else
          selectEnd = select.range.upperCharI;

        this.drawBar(i, selectStart, selectEnd, COLOR.SELECT_GRAY);
      }

      let commentStart = this.lines.strGet(i).indexOf("#");
      if(this.activeLine === i){
        this.drawLine(i, COLOR.BLACK);
      }else if(commentStart === -1 && selectStart === -1){
        this.drawLine(i, COLOR.DIM_WHITE);
      }else{
        this.drawSplitLine(i, commentStart, selectStart, selectEnd);
      }
    }

    // Blinking thingy
    if(select !== null){
      let blinkTime = (Date.now() - select.cursorBlink) % 800;
      if(blinkTime < 400){ // Blink every 0.8s
        this.drawBar(
          select.cursor.lineI, select.cursor.charI,
          select.cursor.charI+1, COLOR.CURSOR_WHITE
        );
      }
    }
  }
  // Draws text lines, using seperate coloring for comments/selection
  drawSplitLine(lineI, commentStart, selectStart, selectEnd){
    let strParts = []; // List of lists of string indexes and colors

    if(Math.max(commentStart, selectStart) > 0)
      strParts.push([0, COLOR.DIM_WHITE]);
    if(commentStart !== -1 && selectStart === -1){
      strParts.push([commentStart, COLOR.COMMENT_GRAY]);
    }else if(commentStart === -1 && selectStart !== -1){
      strParts.push([selectStart, COLOR.WHITE]);
      if(selectEnd < this.lines.strLen(lineI))
        strParts.push([selectEnd, COLOR.DIM_WHITE]);
    }else{
      if(commentStart <= selectStart){
        if(commentStart < selectStart)
          strParts.push([commentStart, COLOR.COMMENT_GRAY]);
        strParts.push([selectStart, COLOR.DIM_WHITE]);
        if(selectEnd < this.lines.strLen(lineI))
          strParts.push([selectEnd, COLOR.COMMENT_GRAY]);
      }else if(selectStart < commentStart && commentStart < selectEnd){
        strParts.push([selectStart, COLOR.WHITE]);
        strParts.push([commentStart, COLOR.DIM_WHITE]);
        if(selectEnd < this.lines.strLen(lineI))
          strParts.push([selectEnd, COLOR.COMMENT_GRAY]);
      }else if(commentStart >= selectEnd){
        strParts.push([selectStart, COLOR.WHITE]);
        if(commentStart > selectEnd)
          strParts.push([selectEnd, COLOR.DIM_WHITE]);
        strParts.push([commentStart, COLOR.COMMENT_GRAY]);
      }
    }

    strParts.push([this.lines.strLen(lineI), null]);
    for(let i=0; i<strParts.length-1; i++){
      ctx.fillStyle = strParts[i][1];
      ctx.fillText(
        this.lines.strGet(lineI).substring(strParts[i][0], strParts[i+1][0]),
        this.x+NUM.CHAR_GAP + NUM.CHAR_WIDTH*strParts[i][0],
        this.y+NUM.CHAR_GAP + (lineI+1)*NUM.LINE_HEIGHT + this.offsetY
      );
    }
  }
}
