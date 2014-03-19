$(function() {
  var editing = false,
      canvas = document.getElementById('editingcanvas'),
      ctx = canvas.getContext("2d"),
      currentRectangle = null;

  function toggleDraw() {
    editing = !editing;

    if (!editing) {
      canvas.classList.remove('editing');
    } else {
      canvas.classList.add('editing');
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

  function mousedown(evt) {
    var x = offsetX(evt, canvas),
        y = offsetY(evt, canvas);

    currentRectangle = [x, y, 0, 0];
    drawRectangle();
  }

  function mousemove(evt) {
    if (currentRectangle) {
      var x = offsetX(evt, canvas),
          y = offsetY(evt, canvas);
      currentRectangle[2] = x - currentRectangle[0];
      currentRectangle[3] = y - currentRectangle[1];
      drawRectangle();
    }
  }

  function mouseup(evt) {
    if (currentRectangle) {
      var modelRectangle = [];
      for (i in currentRectangle) {
        modelRectangle.push(currentRectangle[i] * 9.6/560);
      }
      addRectangleToModel(modelRectangle);
      currentRectangle = null;
      drawRectangle();
    }
  }

  function drawRectangle() {
    ctx.clearRect (0, 0, canvas.width, canvas.height);

    if (currentRectangle) {
      ctx.beginPath();
      ctx.rect.apply(ctx, currentRectangle);
      ctx.closePath();

      ctx.strokeStyle = "#888"
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function addRectangleToModel(rect) {
    script.addPart(
        {
          "shapeType": "rectangle",
          "x": rect[0],
          "y": rect[1],
          "width": rect[2],
          "height": rect[3],
          "temperature": 0,
          "constant_temperature": false,
          "reflection": 100,
          "absorption": 0,
          "filled": true,
          "visible": true,
          "thermal_conductivity": 0,
          "specific_heat": 1000000
        });
  }

  canvas.addEventListener("mousedown",mousedown);
  canvas.addEventListener("mousemove",mousemove);
  canvas.addEventListener("mouseup",mouseup);
  window.toggleDraw = toggleDraw;
});