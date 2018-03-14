var updateVideo = true,
    calibrationMode = false,
    sampling = false,
    videoUpdateTime = 200,
    modelUpdateTime = 3000,
    capture,
    process,
    updateModel,
    minH = Infinity,
    maxH = 0,
    minS = Infinity,
    maxS = 0,
    minV = Infinity,
    maxV = 0,
    materials = [],
    materialIdx = 0,
    videoWidth = 560,
    videoHeight = 420;

var defaultHSV = new HSVThreshold(minH, maxH, minS, maxS, minV, maxV)

function updateMaterialsFromStoredValues() {
  let mats = window.sessionStorage.getItem('materials');
  let materialConfig = {}
  if (mats) {
    materialConfig = JSON.parse(mats);
  }
  return materialConfig;
}

function buildMaterialList() {
  let materialNames = Object.keys(materialDefinitions);
  let storedMaterials = updateMaterialsFromStoredValues();

  for (let i = 0; i < materialNames.length; i++) {
    let materialItem = document.createElement('li');
    document.getElementById('materialList').appendChild(materialItem);

    let materialType = document.createElement('div');
    materialType.className = 'materialType';
    materialType.innerText = materialNames[i];
    materialItem.appendChild(materialType);

    let sampleButton = document.createElement('button');
    sampleButton.innerText = "Sample";
    sampleButton.addEventListener('click', () => toggleSample(i+1));
    materialItem.appendChild(sampleButton);

    let sampleColor = document.createElement('div');
    sampleColor.className = 'samplePreview';
    sampleColor.id = 'samplePreview' + i;
    materialItem.appendChild(sampleColor);

    // pre-create entries in material list for each type
    materials.push({
      name: materialNames[i],
      properties: materialDefinitions[materialNames[i]],
      hsv: storedMaterials && storedMaterials[i] && storedMaterials[i].hsv ? storedMaterials[i].hsv : rgb2hsv(0, 0, 0),
      hex: storedMaterials && storedMaterials[i] && storedMaterials[i].hex ? storedMaterials[i].hex : '#000000',
      hsvThreshold: storedMaterials && storedMaterials[i] && storedMaterials[i].hsv ? getHSVThreshold(storedMaterials[i].hsv) : new HSVThreshold(minH, maxH, minS, maxS, minV, maxV)
    });
  }
}

function calibrate() {
  $('#calibrations').toggleClass("show", 500);
  if (!calibrationMode) {
    videoUpdateTime = -1;
    calibrationMode = true;
  } else {
    videoUpdateTime = 200;
    calibrationMode = false;
    updateModel();
    setTimeout(process, modelUpdateTime);
  }
}
function refreshObstacles() {
  updateModel();
}

function offsetX(evt, target) {
  var offset;
  return (offset = evt.offsetX) != null ? offset : evt.pageX - target.offset().left;
}

function offsetY(evt, target) {
  var offset;
  return (offset = evt.offsetY) != null ? offset : evt.pageY - target.offset().top;
}

function setSliders() {
  hueSlider = $('#hue-slider'),
    satSlider = $('#saturation-slider'),
    valSlider = $('#value-slider');

  hsvt = materials[materialIdx].hsvThreshold;
  hueSlider.rangeSlider("min", hsvt.minH);
  hueSlider.rangeSlider("max", hsvt.maxH);
  satSlider.rangeSlider("min", hsvt.minS*100);
  satSlider.rangeSlider("max", hsvt.maxS*100);
  valSlider.rangeSlider("min", hsvt.minV*100);
  valSlider.rangeSlider("max", hsvt.maxV*100);
}


function toggleSample(idx) {
  if (idx) {
    materialIdx = idx - 1;
    setSliders();
    sampling = true;
    document.getElementById("currentSelectedMaterial").innerText= materials[materialIdx].name;
    if (!canvas1.classList.contains("sampling")) {
      canvas1.classList.add('sampling');
    }
  } else {
    materials[materialIdx].hsv = rgb2hsv(0, 0, 0);
    materials[materialIdx].hex = '#000000';
    materials[materialIdx].hsvThreshold = new HSVThreshold(minH, maxH, minS, maxS, minV, maxV);
    document.getElementById('samplePreview' + materialIdx).style = "background-color:" + materials[materialIdx].hex;
    setTimeout(setSliders, 50);
    setSliders();
  }
}

$(function () {
  buildMaterialList();

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
    maxV = 0.3;

  $('#toggleDarkTheme').click(function() {
    $("#interactive-container").toggleClass("dark", this.checked);
    if (this.checked) {
      window.interactiveController.getComponent("graph").setAttributes({"dataColors": [
        "#f05555",
        "#2cf02c"
      ]});
    } else {
      window.interactiveController.getComponent("graph").setAttributes({"dataColors": [
        "#a00000",
        "#2ca000"
      ]});
    }
  });

  // set up sliders
  hueSlider.rangeSlider({bounds: {min: 0, max: 360}, defaultValues: {min: minH, max: maxH}});
  satSlider.rangeSlider({bounds: {min: 0, max: 100}, defaultValues: {min: minS*100, max: maxS*100}});
  valSlider.rangeSlider({bounds: {min: 0, max: 100}, defaultValues: {min: minV*100, max: maxV*100}});

  // when sliers change, update the currently-selected material values
  $('#hue-slider, #saturation-slider, #value-slider').on("valuesChanging", function(){
    minH = $("#hue-slider").rangeSlider("min");
    maxH = $("#hue-slider").rangeSlider("max");
    minS = $("#saturation-slider").rangeSlider("min") / 100;
    maxS = $("#saturation-slider").rangeSlider("max") / 100;
    minV = $("#value-slider").rangeSlider("min") / 100;
    maxV = $("#value-slider").rangeSlider("max") / 100;

    materials[materialIdx].hsvThreshold = new HSVThreshold(minH, maxH, minS, maxS, minV, maxV);
  });
  for (let m = 0; m < materials.length; m++){
    document.getElementById('samplePreview' + m).style = "background-color:" + materials[m].hex;

    setTimeout(setSliders, 50);
    setSliders();
  }
  // request video
  navigator.getMedia = (navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia ||
                         navigator.msGetUserMedia);

  navigator.getMedia({ video: true, audio: false }, function(stream) {
    video.src = window.URL.createObjectURL(stream);

    if (videoUpdateTime > 0) {
      setTimeout(capture, videoUpdateTime);
    } else {
      requestAnimationFrame(capture);
    }
    setTimeout(process, modelUpdateTime);
  }, function (err) { console.error(err); });

  capture = function() {
    if (calibrationMode) {
      process();
      setTimeout(capture, 100);
      return;
    }
    topctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    if (videoUpdateTime > 0) {
      setTimeout(capture, videoUpdateTime);
    } else {
      requestAnimationFrame(capture);
    }
  }

  getMask = function (imageData, hsvThreshold) {
    let mask = new CV.Image(videoWidth, videoHeight);
      len = imageData.length;
      i = 0;

      // filter pixels to HSV thresholds
      // mask.data is a data array where every element is 255 or a 0, for a pixel
      // that is white or black. It will be expanded into an array that can
      // be drawn in the canvas just before we draw it, but CV.js uses this
      // simpler array for fastert data processing
      while (i < len) {
        r = imageData[i];
        g = imageData[i + 1];
        b = imageData[i + 2];
        inRange = hsvThreshold.testPixel(r, g, b);
        if (inRange) {
          mask.data.push(255);
        } else {
          mask.data.push(0);
        }
        i += 4;
      }

      // erode-dilate several times to remove imperfections
      let erodedImg = new CV.Image();
      CV.erode(mask, erodedImg);
      CV.dilate(erodedImg, mask);

      if (extraErodeCheck.checked) {
        CV.dilate(mask, erodedImg);
        CV.dilate(erodedImg, mask);
        CV.erode(mask, erodedImg);
        CV.erode(erodedImg, mask);
      }
    return mask;
  }

  process = function() {
    var imgData, data, len, i,
        r, g, b,
        inRange, image2,
        points, p;

    ctx1.drawImage(video, 0, 0, videoWidth, videoHeight);

    imgData = ctx1.getImageData(0, 0, videoWidth, videoHeight);
    data = imgData.data;
    let calibrationMask;

    // Find mask for each material
    for (let m = 0; m < materials.length; m++) {
      let mask = getMask(data, materials[m].hsvThreshold);
      if (calibrationMode && m === materialIdx) {
        calibrationMask = mask;
      }

      // find contours and draw to canvas 3
      let contours = CV.findContours(mask);

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
      materials[m].contours = contours;
    }
    if (calibrationMode) {
      // draw filtered images to canvas 2
      image2 = createDrawableImage(calibrationMask, ctx2.getImageData(0, 0, videoWidth, videoHeight));
      ctx2.putImageData(image2, 0, 0);

      for (i in materials[materialIdx].contours) {

        points = materials[materialIdx].contours[i];

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
    }
    if (!calibrationMode) {
      if (window.interactiveController.getModel().isStopped()) updateModel();
      setTimeout(process, modelUpdateTime);
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
    //let rgb =
    hsv = rgb2hsv(p[0], p[1], p[2]);
    let threshold = getHSVThreshold(hsv);//new HSVThreshold(_minH, _maxH, _minS, _maxS, _minV, _maxV);
    materials[materialIdx].hsv = hsv;
    materials[materialIdx].hex = rgbToHex(p[0], p[1], p[2]);
    materials[materialIdx].hsvThreshold = threshold;
    window.sessionStorage.setItem('materials', JSON.stringify(materials));

    document.getElementById('samplePreview' + materialIdx).style = "background-color:" + rgbToHex(p[0], p[1], p[2]);

    setTimeout(setSliders, 50);
    setSliders();
  }

  canvas1.addEventListener("mousedown",mousedown);
});

showShapes = true

updateModel = function () {
  numParts = script.getNumberOfParts();
  for (let i = numParts - 1; i > 0; i--) {
    script.removePart(i);
  }

  for (let m = 0; m < materials.length; m++) {
    let props = materials[m].properties;
    let contours = materials[m].contours;

    if (!contours || !contours.length) {
      return;
    }
    let contour, x, y, i, j;

    for (i = 0, ii = contours.length; i < ii; i++) {
      contour = contours[i];
      vertices = "";
      for (j = 0, jj = contour.length; j < jj; j++) {
        if (!contour[j]) continue;
        x = contour[j].x * 9.6 / videoWidth;
        y = contour[j].y * 7.2 / videoHeight;
        x = Math.min(x, 9.4);
        y = Math.min(y, 7.1);
        x = Math.max(x, 0.3);
        y = Math.max(y, 0.3);
        vertices += x + ", " + y + ", ";
      }
      vertices = vertices.slice(0, -2);

      // add a new shape
      script.addPart(
        {
          "shapeType": "polygon",
          "x": 0,
          "y": 0,
          "temperature": props.temperature,
          "constant_temperature": props.constant_temperature,
          "reflection": props.reflection,
          "absorption": props.absorption,
          "filled": false,
          "visible": showShapes,
          "thermal_conductivity": props.thermal_conductivity,
          "specific_heat": props.specific_heat,
          "vertices": vertices
        })
    }
  }
}
