var video = document.querySelector('#live'),
    canvas = document.querySelector('#canvas'),
    canvas2 = document.querySelector('#canvas2'),
    fps = 16,
    ctx = canvas.getContext('2d'),
    ctx2 = canvas2.getContext('2d'),
    mainTimer,
    contours = [],

    debug = document.querySelector('#debug'),
    debugBtn = document.querySelector('#debugBtn');

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
socket.on('shapes', function (_shapes) {
  // console.log(_shapes)
  if (!_shapes || _shapes.length === 0) {
    return;
  }
  contours = _shapes.contours;
  if (debugBtn.className == 'round alert') {
    debug.innerHTML = JSON.stringify({size: _shapes.size, data: contours});
  }

}).on('disconnect', function (data) {
  console.log("Disconnected!!!", data);
});

function captureAndDraw () {
  ctx.translate(320, 0);
  ctx.scale(-1, 1);
  mainTimer = setInterval(function () {
    ctx.drawImage(video, 0, 0, 320, 240);

    ctx2.translate(320, 0);
    ctx2.scale(-1, 1);
    ctx2.drawImage(video, 0, 0, 320, 240);
    ctx2.translate(320, 0);
    ctx2.scale(-1, 1);
    var squares = [];
    var triangles = [];
    if (contours && contours.length) {
      for (var i in contours) {
        var points = contours[i];

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

          // simple center-of-mass
          x = xTot / points.length;
          y = yTot / points.length;

          if (points.length == 4) {
            ctx2.strokeStyle = "#a22";
            squares.push({x: x, y: y});
          } else if (points.length == 3) {
            ctx2.strokeStyle = "#2a2";
            triangles.push({x: x, y: y});
          } else {
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
    if (window.receiveShapes) {
      window.receiveShapes(squares, triangles);
    }
    socket.emit('frame', canvas.toDataURL("image/jpeg"));
  }, 1000 / fps);
}
captureAndDraw();