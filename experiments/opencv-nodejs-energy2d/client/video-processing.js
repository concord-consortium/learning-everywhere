var video = document.querySelector('#live'),
    canvas = document.querySelector('#canvas'),
    canvas2 = document.querySelector('#canvas2'),
    fps = 8,
    ctx = canvas.getContext('2d'),
    ctx2 = canvas2.getContext('2d'),
    mainTimer,
    contours = {},
    obstacles = [],

    calibrations = {
      obstacle: {
        useCanny    : false,
        lowThresh   : 0,
        highThresh  : 100,
        useHSV      : true,
        lowerHSV    : [0, 73, 37],
        upperHSV    : [44, 189, 255],
        dilate      : true,
        nIters      : 3,
        convex      : false,
        minArea     : 2000,
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

          if (!obstacles[i]) obstacles[i] = [];
          for (var p = 0; p < points.length; p++) {
            obstacles[i].push({x: points[p].x, y: points[p].y})
          }
          ctx2.strokeStyle = "#2ba6cb";

          ctx2.stroke();
        }
      }
    }
    socket.emit('frame', {data: canvas.toDataURL("image/jpeg"), calibrations: calibrations});
  }, 1000 / fps);
}
captureAndDraw();

setInterval(receiveData, 1000);

function receiveData() {
  var numObstacles = obstacles.length,
      numParts = script.getNumberOfParts(),
      contour, x, y, i, j;

  for (i = numParts-1; i > numObstacles; i--) {
    script.removePart(i);
  }

  for (i = 0, ii = obstacles.length; i<ii; i++) {
    contour = obstacles[i];
    vertices = "";
    coordsX = [];
    coordsY = [];
    // take every fifth vertice, to reduce object complexity
    for (j = 0, jj = contour.length; j<jj; j=j+5) {
      if (!contour[j]) continue;
      x = contour[j].x * 7.2/420;
      y = contour[j].y * 9.6/560;
      coordsX.push(x);
      coordsY.push(y);
      vertices += x + ", " + y + ", ";
    }
    vertices = vertices.slice(0,-2);
    if (i < numParts - 1) {
      // modify an existing shape
      part = script.getPart(i+1);
      if (coordsX.length > part.raw_x_coords.length) {
        // if we have more vertices than before, we have to modify y first or we get
        // an error immediately after the x-coords are modified
        part.raw_y_coords = coordsY;
        part.raw_x_coords = coordsX;
      } else {
        // ... and visa-versa
        part.raw_x_coords = coordsX;
        part.raw_y_coords = coordsY;
      }
    } else {
      // add a new shape
      script.addPart(
        {
          "shapeType": "polygon",
          "x": 0,
          "y": 0,
          "temperature": 0,
          "constant_temperature": true,
          "vertices": vertices
        })
    }
  }
}