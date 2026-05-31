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
      this.lineStrs.push(""); // Expand lineStrs
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
