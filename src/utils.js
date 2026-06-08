/** Return whether number is with bounds (inclusive optional) */
if (!Number.prototype.within){
  Number.prototype.within = function (
      lowerBound, lowerInclusive, upperBound, upperInclusive){
    if(this < lowerBound) return false;
    if(this <= lowerBound && !lowerInclusive) return false;
    if(this > upperBound) return false;
    if(this >= upperBound && !upperInclusive) return false;
    return true;
  };
}else{
  console.error("Number type already contains within property/method.");
}
