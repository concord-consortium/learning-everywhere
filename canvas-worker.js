importScripts("e2d-lib/cv.js");
importScripts("e2d-lib/hsvThreshold.js");

self.onmessage = function (m) {
  m = m.data;
  imgData = m.data;
  data = imgData.data;

  hsvThreshold = new HSVThreshold(m.minH, m.maxH, m.minS, m.maxS, m.minV, m.maxV);
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

    if (m.extraErodeCheck) {
      CV.dilate(mask, erodedImg);
      CV.dilate(erodedImg, mask);
      CV.erode(mask, erodedImg);
      CV.erode(erodedImg, mask);
    }

    // find contours and draw to canvas 3
    contours = CV.findContours(mask);

    for (i in contours) {
      contours[i] = CV.approxPolyDP(contours[i], 4);
    }

    if (m.conxevHullCheck) {
      for (i in contours) {
        contours[i] = CV.convexHull(contours[i]);
      }
    }

    areaFilteredContours = [];
    newLen = 0;
    for (i in contours) {
      if (newLen > 15) break;
      area = CV.area(contours[i]);
      if (area > 1500 && area < 117600) {
        newLen++;
        areaFilteredContours.push(contours[i]);
      }
    }

    self.postMessage({ result: areaFilteredContours });
}