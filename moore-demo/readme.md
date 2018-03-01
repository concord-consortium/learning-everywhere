# Energy2D (Lab Framework) interactions using OpenCV in the browser

This experiment uses the opencv-node binding to allow us to send video
data (from WebRTC) to OpenCV running on the local server, and then
feeds the processed data to a [Lab](https://github.com/concord-consortium/lab) Energy2D model.

# Usage

Install OpenCV. Use node 0.10.20

`npm install`

If npm complains that it can't find opencv.pc, you will need to set the
PKG_CONFIG_PATH variable to the location of folder containing opencv.pc.

`$ export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig`

You can add this to ~/.bashprofile

Even after this, on my machine (OS X 10.6.8) using node 0.10.20 I get an
error that cb() is never called, but this doesn't seem to affect the application.

`coffee app.coffee`

Open http://localhost:9999/