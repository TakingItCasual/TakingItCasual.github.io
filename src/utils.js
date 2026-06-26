/** Return whether number is within bounds (inclusive optional) */
if (!Number.prototype.within){
  Number.prototype.within = function (
      lowerBound, isLowerInclusive, upperBound, isUpperInclusive){
    if(this < lowerBound) return false;
    if(this <= lowerBound && !isLowerInclusive) return false;
    if(this > upperBound) return false;
    if(this >= upperBound && !isUpperInclusive) return false;
    return true;
  };
}else{
  console.error("Number type already contains within property/method.");
}
