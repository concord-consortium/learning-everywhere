
function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function getHSVThreshold(hsv) {
  let _minH = Infinity,
    _maxH = 0,
    _minS = Infinity,
    _maxS = 0,
    _minV = Infinity,
    _maxV = 0;
  _minH = Math.min(_minH, Math.max(0, Math.min(360, hsv[0]-10)));
  _maxH = Math.max(_maxH, Math.max(0, Math.min(360, hsv[0]+10)));
  _minS = Math.min(_minS, Math.max(0, Math.min(1, hsv[1]-0.1)));
  _maxS = Math.max(_maxS, Math.max(0, Math.min(1, hsv[1]+0.1)));
  _minV = Math.min(_minV, Math.max(0, Math.min(1, hsv[2]-0.1)));
  _maxV = Math.max(_maxV, Math.max(0, Math.min(1, hsv[2]+0.1)));

  t = new HSVThreshold(_minH, _maxH, _minS, _maxS, _minV, _maxV);
  return t;
}