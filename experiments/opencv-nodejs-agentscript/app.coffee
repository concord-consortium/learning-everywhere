cv = require('opencv')
fs = require('fs')

app = require('http').createServer (req, res) ->
  file = if req.url is '/' then '/index.html' else req.url
  console.log "#{req.method} #{file}"
  fs.readFile "./client#{file}", (err, data) ->
    if err?
      res.write(404)
      return res.end "<h1>HTTP 404 - Not Found</h1>"
    res.writeHead(200)
    res.end data

io = require('socket.io').listen(app).on 'connection', (socket) ->
  socket.on 'frame', ({data, calibrations}) ->
    return unless typeof(data) is 'string'
    data = data?.split(',')?[1]

    # feed the data into OpenCV
    cv.readImage (new Buffer data, 'base64'), (err, _im) ->

      data = {}

      for name, calibration of calibrations

        useHSV      = calibration.useHSV      ? false
        useCanny    = calibration.useCanny    ? true
        lowThresh   = calibration.lowThresh   ? 0
        highThresh  = calibration.highThresh  ? 100
        nIters      = calibration.nIters      ? 2
        minArea     = calibration.minArea     ? 500
        maxArea     = calibration.maxArea     ? Infinity
        approxPolygons = calibration.approxPolygons   ? false
        lowerHSV    = calibration.lowerHSV    ? [170, 100, 0]
        upperHSV    = calibration.upperHSV    ? [180, 255, 255]
        dilate      = calibration.dilate      ? true
        convex      = calibration.convext     ? false
        corners     = calibration.corners     ? 4

        im = _im.copy();

        if useHSV
          im.convertHSVscale()
          im.inRange(lowerHSV, upperHSV)    # filter colors

        if useCanny
          im.convertGrayscale() unless useHSV
          im.canny(lowThresh, highThresh)

        if dilate
          im.dilate(nIters)

        contours = im.findContours()

        data[name] = []
        for c in [0...contours.size()]
          if convex
            contours.convexHull(c, true)

          area = contours.area(c)
          if area < minArea or area > maxArea then continue

          if approxPolygons
            arcLength = contours.arcLength(c, true)
            contours.approxPolyDP(c, 0.1 * arcLength, true)
            if contours.cornerCount(c) != corners           # if we're approximating polygons, don't send any
              continue                                      # back unless they have the right number of corners

          data[name].push []
          index = data[name].length - 1
          for i in [0...contours.cornerCount(c)]
            point = contours.point(c, i)
            data[name][index][i] = {x: point.x, y: point.y}

      socket.volatile.emit('shapes', data)


io.disable('sync disconnect on unload')
io.enable('browser client minification')
io.enable('browser client etag')
io.enable('browser client gzip')
# io.enable('log');
io.set('log level', 1)
io.set('transports', [
    'websocket'
  # 'flashsocket'
  # 'htmlfile'
  'xhr-polling'
  'jsonp-polling'
])

app.listen(9999)

process.on 'uncaughtException', (err) ->
  console.error(err)
  socket?.emit('shapes', [])