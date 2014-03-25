var updateVideo = true,
    calibrationMode = false,
    sampling = false,
    contours = [],
    videoUpdateTime = 500,
    modelUpdateTime = 1200,
    captureAndProcess,
    updateModel,
    _minH = Infinity,
    _maxH = 0,
    _minS = Infinity,
    _maxS = 0,
    _minV = Infinity,
    _maxV = 0;

function calibrate() {
  $('#calibrations').toggleClass("show", 500);
  if (videoUpdateTime == 500) {
    videoUpdateTime = -1;
    calibrationMode = true;
  } else {
    videoUpdateTime = 500;
    calibrationMode = false;
  }
}

function offsetX(evt, target) {
  var offset;
  return (offset = evt.offsetX) != null ? offset : evt.pageX - target.offset().left;
}

function offsetY(evt, target) {
  var offset;
  return (offset = evt.offsetY) != null ? offset : evt.pageY - target.offset().top;
}

function toggleSample() {
  sampling = true;
  if (!canvas1.classList.contains("sampling")) {
    canvas1.classList.add('sampling');
    document.getElementById('sampling').innerHTML = "Reset sampling";
  } else {
    _minH = Infinity,
    _maxH = 0,
    _minS = Infinity,
    _maxS = 0,
    _minV = Infinity,
    _maxV = 0;
  }
}

$(function() {

  var video = document.querySelector('#live'),
      ctx1 = canvas1.getContext('2d'),
      ctx2 = canvas2.getContext('2d'),
      topctx = topCanvas.getContext('2d'),
      hueSlider = $('#hue-slider'),
      satSlider = $('#saturation-slider'),
      valSlider = $('#value-slider'),
      extraErodeCheck = document.getElementById('extra-erode-dilate'),
      approxPolygonsCheck = document.getElementById('approx-polygons'),
      conxevHullCheck = document.getElementById('convex-hull'),
      minH = 0,
      maxH = 360,
      minS = 0,
      maxS = 1,
      minV = 0,
      maxV = 0.3,
      hsvThreshold = new HSVThreshold(minH, maxH, minS, maxS, minV, maxV);

  // set up sliders
  hueSlider.rangeSlider({bounds: {min: 0, max: 360}, defaultValues: {min: minH, max: maxH}});
  satSlider.rangeSlider({bounds: {min: 0, max: 100}, defaultValues: {min: minS*100, max: maxS*100}});
  valSlider.rangeSlider({bounds: {min: 0, max: 100}, defaultValues: {min: minV*100, max: maxV*100}});

  $('#hue-slider, #saturation-slider, #value-slider').on("valuesChanging", function(){
    minH = $("#hue-slider").rangeSlider("min");
    maxH = $("#hue-slider").rangeSlider("max");
    minS = $("#saturation-slider").rangeSlider("min") / 100;
    maxS = $("#saturation-slider").rangeSlider("max") / 100;
    minV = $("#value-slider").rangeSlider("min") / 100;
    maxV = $("#value-slider").rangeSlider("max") / 100;

    hsvThreshold = new HSVThreshold(minH, maxH, minS, maxS, minV, maxV);
  });

  // request video
  navigator.getMedia = (navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia ||
                         navigator.msGetUserMedia);

  navigator.getMedia({ video: true, audio: false }, function(stream) {
    video.src = window.URL.createObjectURL(stream);

    if (videoUpdateTime > 0) {
      setTimeout(captureAndProcess, videoUpdateTime);
    } else {
      requestAnimationFrame(captureAndProcess);
    }
  }, function (err) { console.error(err); });

  captureAndProcess = function(force) {
    if (!updateVideo) return;
    var imgData, data, len, i, mask,
        r, g, b,
        inRange, image2, erodedImg,
        points, p;

    topctx.drawImage(video, 0, 0, 560, 420);

    if (!force && !calibrationMode) {
      if (videoUpdateTime > 0) {
        setTimeout(captureAndProcess, videoUpdateTime);
      } else {
        requestAnimationFrame(captureAndProcess);
      }
      return;
    }

    ctx1.drawImage(video, 0, 0, 560, 420);

    imgData = ctx1.getImageData(0, 0, 560, 420);
    data = imgData.data;
    mask = new CV.Image(560,420);
    len = data.length;
    i = 0;

    // filter pixels to HSV thresholds
    // mask.data is a data array where every element is 255 or a 0, for a pixel
    // that is white or black. It will be expanded into an array that can
    // be drawn in the canvas just before we draw it, but CV.js uses this
    // simpler array for fastert data processing
    while (i < len) {
      r = data[i];
      g = data[i+1];
      b = data[i+2];
      inRange = hsvThreshold.testPixel(r, g, b);
      if (inRange) {
        mask.data.push(255);
      } else {
        mask.data.push(0);
      }
      i += 4;
    }

    // draw filtered images to canvas 2
    //image2 = createDrawableImage(mask, canvas2.getContext('2d').getImageData(0, 0, 560, 420));
    //ctx2.putImageData(image2, 0, 0);

    // erode-dilate several times to remove imperfections
    erodedImg = new CV.Image();
    CV.erode(mask, erodedImg);
    CV.dilate(erodedImg, mask);

    if (extraErodeCheck.checked) {
      CV.dilate(mask, erodedImg);
      CV.dilate(erodedImg, mask);
      CV.erode(mask, erodedImg);
      CV.erode(erodedImg, mask);
    }

    // draw image to canvas 2
    image2 = createDrawableImage(mask, ctx2.getImageData(0, 0, 560, 420));
    ctx2.putImageData(image2, 0, 0);

    // find contours and draw to canvas 3
    contours = CV.findContours(mask);

    if (true || approxPolygonsCheck.checked) {
      for (i in contours) {
        contours[i] = CV.approxPolyDP(contours[i], 4);
      }
    }

    if (conxevHullCheck.checked) {
      for (i in contours) {
        contours[i] = CV.convexHull(contours[i]);
      }
    }

    for (i in contours) {
      points = contours[i];

      if (points && points.length) {
        ctx2.beginPath();
        ctx2.moveTo(points[0].x, points[0].y);
        for (p = 1; p < points.length; p++) {
          ctx2.lineTo(points[p].x, points[p].y);
        }
        ctx2.closePath();
        ctx2.lineWidth = 3;
        ctx2.strokeStyle = "#2ba6cb";

        ctx2.stroke();
      }
    }

    if (videoUpdateTime > 0) {
      setTimeout(captureAndProcess, videoUpdateTime);
    } else {
      requestAnimationFrame(captureAndProcess);
    }
  }

  // expands CV.Image data into a something we can draw
  function createDrawableImage(imageSrc, imageDst){
    var src = imageSrc.data, dst = imageDst.data,
        len = src.length, i = 0, j = 0;

    for(i = 0; i < len; i++){
        dst[j] = dst[j + 1] = dst[j + 2] = src[i];
        dst[j + 3] = 255;
        j += 4;
    }

    return imageDst;
  }

  function mousedown(evt) {
    if (!sampling) return;
    var x = offsetX(evt, canvas1),
        y = offsetY(evt, canvas1);

    ctx1 = canvas1.getContext('2d');
    p = ctx1.getImageData(x, y, 1, 1).data;
    hsv = rgb2hsv(p[0],p[1],p[2]);

    _minH = Math.min(_minH, Math.max(0, Math.min(360, hsv[0]-5)));
    _maxH = Math.max(_maxH, Math.max(0, Math.min(360, hsv[0]+5)));
    _minS = Math.min(_minS, Math.max(0, Math.min(1, hsv[1]-0.05)));
    _maxS = Math.max(_maxS, Math.max(0, Math.min(1, hsv[1]+0.05)));
    _minV = Math.min(_minV, Math.max(0, Math.min(1, hsv[2]-0.05)));
    _maxV = Math.max(_maxV, Math.max(0, Math.min(1, hsv[2]+0.05)));

    hsvThreshold = new HSVThreshold(_minH, _maxH, _minS, _maxS, _minV, _maxV);

    function setSliders() {
      hueSlider.rangeSlider("min", _minH);
      hueSlider.rangeSlider("max", _maxH);
      satSlider.rangeSlider("min", _minS*100);
      satSlider.rangeSlider("max", _maxS*100);
      valSlider.rangeSlider("min", _minV*100);
      valSlider.rangeSlider("max", _maxV*100);
    }

    setTimeout(setSliders, 50);
    setSliders();
  }

  canvas1.addEventListener("mousedown",mousedown);
});

showShapes = true

updateModel = function() {
  captureAndProcess(true);
  if (!contours.length) {
    return;
  }
  var numObstacles = contours.length,
      numParts = script.getNumberOfParts(),
      contour, x, y, i, j;

  for (i = numParts-1; i > 0; i--) {
    if (script.getPart(i).thermal_conductivity == 0) {
      script.removePart(i);
    } else {
      foundGlass = true;
    }
  }

  for (i = 0, ii = contours.length; i<ii; i++) {
    contour = contours[i];
    vertices = "";
    for (j = 0, jj = contour.length; j<jj; j++) {
      if (!contour[j]) continue;
      x = contour[j].x * 9.6/560;
      y = contour[j].y * 7.2/420;
      x = Math.min(x, 9);
      y = Math.min(y, 7);
      x = Math.max(x, 1);
      y = Math.max(y, 1);
      vertices += x + ", " + y + ", ";
    }
    vertices = vertices.slice(0,-2);

    // add a new shape
    script.addPart(
      {
        "shapeType": "polygon",
        "x": 0,
        "y": 0,
        "temperature": 0,
        "constant_temperature": false,
        "reflection": 100,
        "absorption": 0,
        "filled": false,
        "visible": showShapes,
        "thermal_conductivity": 0,
        "specific_heat": 1000000,
        "vertices": vertices
      })
  }
}