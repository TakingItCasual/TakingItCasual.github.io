"use strict";

/** Contains and manages list of strings */
class StringList{
  #lineW;
  #maxLines;
  #lineStrs;

  constructor(lineW, maxLines){
    this.#lineW = lineW;
    this.#maxLines = maxLines;
    this.#lineStrs = [""];
  }

  lineAdd(lineI){
    this.#lineStrs.splice(lineI+1, 0, "");
  }
  lineDel(lineI){
    if(lineI >= this.#lineStrs.length) return;
    if(this.#lineStrs.length <= 1) return; // Don't want an empty lineStrs
    this.#lineStrs.splice(lineI, 1);
  }
  lineCount(){
    return this.#lineStrs.length;
  }

  strGet(lineI){
    if(lineI >= this.#lineStrs.length) return "";
    return this.#lineStrs[lineI];
  }
  strSet(lineI, strValue){
    if(lineI >= this.#maxLines) return;
    // Expand #lineStrs until lineI
    while(lineI >= this.#lineStrs.length)
      this.#lineStrs.push("");
    // The substring crops the strValue to prevent text overflow
    this.#lineStrs[lineI] = strValue.substring(0, this.#lineW);
  }
  strLen(lineI){
    if(lineI >= this.#lineStrs.length) return 0;
    return this.#lineStrs[lineI].length;
  }
  strCut(lineI, charI){ // Cuts string charI from end
    if(lineI >= this.#lineStrs.length) return "";
    if(charI > this.#lineStrs[lineI].length) return "";
    let cutStr = this.#lineStrs[lineI].slice(-charI);
    this.#lineStrs[lineI] = this.#lineStrs[lineI].slice(0, -charI);
    return cutStr;
  }

  charAdd(lineI, charI, charVar){
    if(lineI >= this.#lineStrs.length) return;
    if(charI > this.#lineStrs[lineI].length)
      charI = this.#lineStrs[lineI].length;
    let str = this.#lineStrs[lineI];
    this.strSet(lineI,
      str.substring(0, charI) + charVar + str.substring(charI));
  }
  charDel(lineI, charI){
    if(lineI >= this.#lineStrs.length) return;
    if(charI > this.#lineStrs[lineI].length) return;
    let str = this.#lineStrs[lineI];
    this.strSet(lineI, str.substring(0, charI-1) + str.substring(charI));
  }
}
