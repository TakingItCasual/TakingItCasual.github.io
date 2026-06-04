"use strict";

/** Empty box, just has its dimensions and draw method */
class Box{
  constructor({x, y, w, h, isBorderFull=false}){
    this.x = x + (isBorderFull ? 1 : 0); // x-pos of box's top left (px)
    this.y = y + (isBorderFull ? 1 : 0); // y-pos of box's top left (px)
    this.w = w - (isBorderFull ? 2 : 0); // Box's width (px)
    this.h = h - (isBorderFull ? 2 : 0); // Box's height (px)
    this.isBorderFull = isBorderFull; // Whether box border is 1px or 3px
  }

  drawBox(color){
    ctx.strokeStyle = color;
    ctx.lineWidth = this.isBorderFull ? 3 : 1;
    ctx.strokeRect(this.x-0.5, this.y-0.5, this.w, this.h);
    ctx.lineWidth = 1;
  }
}

/** Can draw text and bars, dimensions set relative to font dimensions */
class BoxText extends Box{
  constructor({
    x, y, lineW, maxLines, extraH=0, isTextCentered=false, isBorderFull=false
  }){
    super({
      x: x,
      y: y,
      w: lineW*NUM.CHAR_WIDTH + NUM.CHAR_GAP*2,
      h: maxLines*NUM.LINE_HEIGHT + 3*NUM.CHAR_GAP + 1 + extraH,
      isBorderFull: isBorderFull,
    });
    this.lineW = lineW; // Width of the box in terms of characters
    this.maxLines = maxLines; // Maximum number of string lines
    this.offsetY = Math.floor(extraH/2); // Y-padding for text lines (px)
    /** If true, text is centered within box's width */
    this.isTextCentered = isTextCentered;
    /** List of strings to draw to box */
    this.lines = new StringList(this.lineW, this.maxLines);
  }

  /** Draws one line from lineStrs to canvas (extraY used for "FAILURE") */
  drawStr(textColor, lineI, extraY=0){
    let offsetX = 0;
    if(this.isTextCentered)
      offsetX = (NUM.CHAR_WIDTH/2)*(this.lineW - this.lines.strLen(lineI));
    ctx.fillStyle = textColor;
    ctx.fillText(
      this.lines.strGet(lineI),
      this.x+NUM.CHAR_GAP + offsetX,
      this.y+NUM.CHAR_GAP + (lineI+1)*NUM.LINE_HEIGHT + this.offsetY+extraY
    );
  }
  /** Draws solid bar with height of font's line-height to canvas */
  drawBar(barColor, lineI, startChar, endChar, extraStart=0, extraEnd=0){
    let offsetX = 0;
    if(this.isTextCentered)
      offsetX = (NUM.CHAR_WIDTH/2)*(this.lineW - (endChar - startChar));
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

/** Can divide a line into different colors for comments and selection */
class BoxCode extends BoxText{
  constructor({x, y, lineW, maxLines}){
    super({
      x: x,
      y: y,
      lineW: lineW,
      maxLines: maxLines,
    });
    this.activeLine = null; // Indicates currently executing line
    this.executable = true; // True if the current line was just reached
  }

  /** Draws text, executing line or selected text bars, and blinking thingy */
  drawAllLinesAndBars(select){
    // Draws bar under currently executing line
    if(this.activeLine !== null){
      this.drawBar(
        (this.executable ? COLOR.BAR.RUNNING : COLOR.BAR.WAITING),
        this.activeLine, 0, this.lineW, NUM.CHAR_GAP, NUM.CHAR_GAP-2
      );
    }

    // Draws bars under selected text, as well as the text itself
    for(let i=0; i<this.maxLines; i++){
      if(!this.lines.strGet(i)) continue; // String is empty

      let selectStart = -1;
      let selectEnd = -1;
      // Draws bar under selected text
      if(select !== null && select.range.isLineSelected(i)){
        selectStart = select.range.lowerLineI >= i ?
          select.range.lowerCharI : 0;
        selectEnd = select.range.upperLineI <= i ?
          select.range.upperCharI : this.lines.strLen(i);

        this.drawBar(COLOR.BAR.SELECTED, i, selectStart, selectEnd);
      }

      let commentStart = this.lines.strGet(i).indexOf("#");
      if(this.activeLine === i){
        this.drawStr(COLOR.BLACK, i);
      }else if(commentStart === -1 && selectStart === -1){
        this.drawStr(COLOR.LIGHT_GRAY, i);
      }else{
        this.drawSplitLine(i, commentStart, selectStart, selectEnd);
      }
    }

    // Blinking thingy
    if(select !== null && select.cursorBlink.isActive()){
      this.drawBar(COLOR.BAR.CURSOR,
        select.cursor.lineI, select.cursor.charI, select.cursor.charI+1);
    }
  }
  /** Draws text line, using seperate coloring for comments/selection */
  drawSplitLine(lineI, commentStart, selectStart, selectEnd){
    let strParts = []; // List of lists of string indexes and colors

    if(Math.max(commentStart, selectStart) > 0)
      strParts.push([0, COLOR.LIGHT_GRAY]);
    if(commentStart !== -1 && selectStart === -1){
      strParts.push([commentStart, COLOR.TEXT.COMMENT]);
    }else if(commentStart === -1 && selectStart !== -1){
      strParts.push([selectStart, COLOR.WHITE]);
      if(selectEnd < this.lines.strLen(lineI))
        strParts.push([selectEnd, COLOR.LIGHT_GRAY]);
    }else{
      if(commentStart <= selectStart){
        if(commentStart < selectStart)
          strParts.push([commentStart, COLOR.TEXT.COMMENT]);
        strParts.push([selectStart, COLOR.LIGHT_GRAY]);
        if(selectEnd < this.lines.strLen(lineI))
          strParts.push([selectEnd, COLOR.TEXT.COMMENT]);
      }else if(selectStart < commentStart && commentStart < selectEnd){
        strParts.push([selectStart, COLOR.WHITE]);
        strParts.push([commentStart, COLOR.LIGHT_GRAY]);
        if(selectEnd < this.lines.strLen(lineI))
          strParts.push([selectEnd, COLOR.TEXT.COMMENT]);
      }else if(commentStart >= selectEnd){
        strParts.push([selectStart, COLOR.WHITE]);
        if(commentStart > selectEnd)
          strParts.push([selectEnd, COLOR.LIGHT_GRAY]);
        strParts.push([commentStart, COLOR.TEXT.COMMENT]);
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
