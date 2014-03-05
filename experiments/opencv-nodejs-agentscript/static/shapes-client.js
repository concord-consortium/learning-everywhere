var video = document.querySelector('#live'),
    canvas = document.querySelector('#canvas'),
    canvas2 = document.querySelector('#canvas2'),
    fps = 16,
    ctx = canvas.getContext('2d'),
    ctx2 = canvas2.getContext('2d'),
    mainTimer,
    contours = {},

    debug = document.querySelector('#debug'),
    debugBtn = document.querySelector('#debugBtn'),

    calibrations = {
      windfarm: {
        useCanny    : false,
        lowThresh   : 0,
        highThresh  : 100,
        useHSV      : true,
        lowerHSV    : [82, 100, 84],
        upperHSV    : [121, 255, 255],
        dilate      : true,
        convex      : true,
        minArea     : 150,
        maxArea     : 1500,
        approxPolygons : true,
        corners     : 4
      },
      village: {
        useCanny    : false,
        lowThresh   : 0,
        highThresh  : 100,
        useHSV      : true,
        lowerHSV    : [82, 100, 84],
        upperHSV    : [121, 255, 255],
        dilate      : true,
        convex      : true,
        minArea     : 150,
        maxArea     : 1500,
        approxPolygons : true,
        corners     : 3
      },
      powerline: {
        useCanny    : false,
        lowThresh   : 0,
        highThresh  : 100,
        useHSV      : true,
        lowerHSV    : [141, 124, 125],
        upperHSV    : [180, 255, 255],
        dilate      : true,
        convex      : false,
        minArea     : 0,
        maxArea     : 1500,
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

debugBtn.onclick = function (e) {
  e.preventDefault();
  if (debugBtn.className != 'round alert') {
    debugBtn.innerHTML = 'Close Debug';
    debugBtn.className = 'round alert';
    debug.style.display = 'block';
  } else {
    debug.style.display = 'none';
    debugBtn.className = 'round success';
    debugBtn.innerHTML = 'Open Debug';
  }
}

var socket = io.connect(top.location.origin); // 'http://localhost');
socket.on('shapes', function (_data) {
  // console.log(_shapes)
  if (!_data) {
    return;
  }
  contours = _data;
  if (debugBtn.className == 'round alert') {
    debug.innerHTML = JSON.stringify(contours);
  }

}).on('disconnect', function (data) {
  console.log("Disconnected!!!", data);
});

function captureAndDraw () {
  mainTimer = setInterval(function () {
    ctx.drawImage(video, 0, 0, 480, 360);
    ctx2.drawImage(video, 0, 0, 320, 240);
    scale = 320/480;
    var windfarms = [],
        villages = [],
        powerlines = [];
    for (type in contours) {
      for (i in contours[type]) {
        var points = contours[type][i];

        if (points && points.length) {
          ctx2.beginPath();
          ctx2.moveTo(points[0].x * scale, points[0].y * scale);
          xTot = points[0].x * scale;
          yTot = points[0].y * scale;
          for (var p = 1; p < points.length; p++) {
            ctx2.lineTo(points[p].x * scale, points[p].y * scale);
            xTot += points[p].x * scale;
            yTot += points[p].y * scale;
          }
          ctx2.closePath();

          // simple center-of-mass
          x = xTot / points.length;
          y = yTot / points.length;

          if (type == "windfarm") {
            ctx2.strokeStyle = "#a22";
            windfarms.push({x: x, y: y});
          } else if (type == "village") {
            ctx2.strokeStyle = "#2a2";
            villages.push({x: x, y: y});
          } else {
            if (!powerlines[i]) powerlines[i] = [];
            for (var p = 0; p < points.length; p++) {
              powerlines[i].push({x: points[p].x * scale, y: points[p].y * scale})
            }
            ctx2.strokeStyle = "#2ba6cb";
          }
          ctx2.stroke();

          ctx2.beginPath();
          ctx2.arc(x,y,4,0,2*Math.PI);
          ctx2.closePath();

          ctx2.lineWidth = 2;
          ctx2.stroke();
        }
      }
    }
    if (window.receiveData) {
      window.receiveData(windfarms, villages, powerlines);
    }
    socket.emit('frame', {data: canvas.toDataURL("image/jpeg"), calibrations: calibrations});
  }, 1000 / fps);
}
captureAndDraw();