/*jshint browser: true, quotmark: false, indent: false*/
/*globals getModelURL */

"use strict";

// Wrap work in function that is called at end of the (async) coffeescript compilation + eval step
window.modelLoaded = function() {
	window.saveModelURL = function() {
	  document.location.hash = getModelHash();
	};
};
