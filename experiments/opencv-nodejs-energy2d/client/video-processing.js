var video = document.querySelector('#live'),
    canvas = document.querySelector('#canvas'),
    canvas2 = document.querySelector('#canvas2'),
    fps = 16,
    ctx = canvas.getContext('2d'),
    ctx2 = canvas2.getContext('2d'),
    mainTimer,
    contours = {},
    obstacles = [],
    glasses = [],
    doReceiveData = false,
    showShapes = false,
    foundGlass = false,

    calibrations = {
      obstacle: {
        useCanny    : false,
        lowThresh   : 0,
        highThresh  : 100,
        useHSV      : true,
        lowerHSV    : [8, 71, 50],
        upperHSV    : [28, 255, 255],
        dilate      : true,
        nIters      : 3,
        convex      : false,
        minArea     : 4000,
        maxArea     : Infinity,
        approxPolygons : false
      },
      glass: {
        useCanny    : false,
        lowThresh   : 0,
        highThresh  : 100,
        useHSV      : true,
        lowerHSV    : [62, 72, 100],
        upperHSV    : [123, 255, 255],
        dilate      : true,
        nIters      : 3,
        convex      : true,
        minArea     : 4000,
        maxArea     : Infinity,
        approxPolygons : false
      }
    };

navigator.getMedia = (navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);

navigator.getMedia({ video: true, audio: false }, function(stream) {
  video.src = window.URL.createObjectURL(stream);
}, function (err) { console.error(err); });

var socket = io.connect(top.location.origin); // 'http://localhost');
socket.on('shapes', function (_data) {
  if (!_data) {
    return;
  }
  contours = _data;

}).on('disconnect', function (data) {
  console.log("Disconnected!!!", data);
});

function captureAndDraw () {
  mainTimer = setInterval(function () {
    ctx.drawImage(video, 0, 0, 560, 420);
    ctx2.drawImage(video, 0, 0, 560, 420);
    obstacles = [];
    glasses = [];
    for (type in contours) {
      for (i in contours[type]) {
        var points = contours[type][i];

        if (points && points.length) {
          ctx2.beginPath();
          ctx2.moveTo(points[0].x, points[0].y);
          xTot = points[0].x;
          yTot = points[0].y;
          for (var p = 1; p < points.length; p++) {
            ctx2.lineTo(points[p].x, points[p].y);
            xTot += points[p].x;
            yTot += points[p].y;
          }
          ctx2.closePath();

          if (type == "obstacle") {
            if (!obstacles[i]) obstacles[i] = [];
            for (var p = 0; p < points.length; p++) {
              obstacles[i].push({x: points[p].x, y: points[p].y})
            }
          } else {
            if (!glasses[i]) glasses[i] = [];
            for (var p = 0; p < points.length; p++) {
              glasses[i].push({x: points[p].x, y: points[p].y})
            }
          }

          //ctx2.stroke();
        }
      }
    }
    socket.emit('frame', {data: canvas.toDataURL("image/jpeg"), calibrations: calibrations});
  }, 1000 / fps);
}
captureAndDraw();

setInterval(receiveData, 1500);

function toggleUpdateModel() {
  if (doReceiveData) {
    doReceiveData = false;
  } else {
    doReceiveData = true;
  }
}

function toggleShowShapes() {
  if (showShapes) {
    showShapes = false;
  } else {
    showShapes = true;
  }
  setTimeout(function() {
    for (var i=0, ii=script.getNumberOfParts(); i < ii; i++) {
      script.getPart(i).filled = showShapes;
      script.getPart(i).visible = showShapes;
    }
  }, 1);
}

function receiveData() {
  if (!window.doReceiveData) return;
  var numObstacles = obstacles.length,
      numParts = script.getNumberOfParts(),
      contour, x, y, i, j;

  for (i = numParts-1; i > 0; i--) {
    if (script.getPart(i).thermal_conductivity == 0) {
      script.removePart(i);
    } else {
      foundGlass = true;
    }
  }

  for (i = 0, ii = obstacles.length; i<ii; i++) {
    contour = obstacles[i];
    vertices = "";
    // take every third vertice, to reduce object complexity
    for (j = 0, jj = contour.length; j<jj; j=j+3) {
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
        "filled": showShapes,
        "visible": showShapes,
        "thermal_conductivity": 0,
        "specific_heat": 1000000,
        "vertices": vertices
      })
  }
  if (!foundGlass) {
    for (i = 0, ii = glasses.length; i<ii; i++) {
      contour = glasses[i];
      vertices = "";
      // take every third vertice, to reduce object complexity
      for (j = 0, jj = contour.length; j<jj; j=j+3) {
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
          "filled": showShapes,
          "visible": showShapes,
          "thermal_conductivity": 0.3,
          "specific_heat": 50,
          "vertices": vertices
        })
    }
  }
}