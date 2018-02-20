# AgentScript interactions using OpenCV in the browser

This experiment uses the opencv-node binding to allow us to send video
data (from WebRTC) to OpenCV running on the local server, and then
feeds the processed data to an AgentScript model.

The experiment is based on the opencv-nodejs-browser example in
[video-processing-experiments](https://github.com/concord-consortium/video-processing-experiments)

The server code (app.coffee) uses OpenCV to perform some very
simple image processing -- very heavy-handed polygon approximations
to try and find triangles and squares.

This data is then passed to AgentScript in order to add agents.

# Usage

Install OpenCV (using v2, since v3 is not yet fully-supported):

`brew install opencv@2`
`brew link --force opencv@2`

Install prerequiste modules

`npm install`

Launch a web server

`coffee app.coffee`

Open http://localhost:9999/