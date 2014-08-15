/*jshint browser: true, quotmark: false, indent: false*/
/*globals io, getModelHash, saveModelURL, publicModelUrl */

"use strict";

// Wrap work in function that is called at end of the (async) coffeescript compilation + eval step
window.modelLoaded = function() {
  var socket;

  function updateHash() {
    document.location.hash = getModelHash();
  }

  function getCanonicalURL() {
    // returns canonical url, which may have a different host name than the current
    return publicModelUrl + "#" + document.location.hash;
  }

  socket = io('http://localhost:8081/');

  socket.on('request-url', function() {
    updateHash();
    socket.emit('current-url', getCanonicalURL());
  });

  socket.on('error-saving-url', function (errorMsg  ) {
    // alert the error - eventually, should do with Foundation
    // see http://stackoverflow.com/questions/21681416/dynamic-alert-box-with-foundation
    // and http://foundation.zurb.com/docs/components/alert_boxes.html

    alert("the model couldn't be saved: " + errorMsg);
  });

  socket.on('success-saving-url', function() {
    alert("The model was saved to the smart museum system.");
  });
};
