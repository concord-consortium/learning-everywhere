# Energy2D (Lab Framework) interactions using OpenCV in the browser

This experiment uses the opencv-node binding to allow us to send video
data (from WebRTC) to OpenCV running on the local server, and then
feeds the processed data to a [Lab](https://github.com/concord-consortium/lab) Energy2D model.

# Usage

Install OpenCV (using v2, since v3 is not yet fully-supported):

`brew install opencv@2`
`brew link --force opencv@2`

Install prerequiste modules

`npm install`

Launch a web server

`coffee app.coffee`

Open http://localhost:9999/