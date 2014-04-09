/**
  Simple Arduino serial communication setup, based off the Codeblender.cc plugin available
  at https://github.com/codebendercc/npapiPlugins
*/
(function() {
  var plugin,
      bufferedResponse;

  ArduinoComm = function(port, speed) {
    this.PORT  = port  || '/dev/cu.usbmodem1411';
    this.SPEED = speed || '9600';

    plugin = document.getElementById('plugin0');
  }

  ArduinoComm.prototype.checkInitialization = function() {
    var pluginFound = false;

    for (i = 0; i < navigator.plugins.length; i++)
      if (navigator.plugins[i].name == "Codebender.cc" || navigator.plugins[i].name == "Codebendercc")
          pluginFound = true;

    if (!pluginFound) {
      alert("Codebender.cc plugin not found");
    }
  }

  ArduinoComm.prototype.startSerialRead = function(callback) {
    plugin.serialRead(this.PORT, this.SPEED, function(from, line) {
      if (isNaN(line)) {
        callback(line);
      } else {
        if (line == "13" ) {
          return;
        } else if (line == "10") {
          callback(bufferedResponse);
          bufferedResponse = "";
        } else {
          bufferedResponse += String.fromCharCode(line);
        }
      }
    });
  }

  ArduinoComm.prototype.serialWrite = function(val) {
    plugin.serialWrite(val);
  }

  // **** Dummy interface, for using without an Arduino ****
  DummyArduinoComm = function() {
    this.prev = 300 + (Math.random() * 500);
  }

  DummyArduinoComm.prototype.checkInitialization = function() { }

  DummyArduinoComm.prototype.startSerialRead = function(callback) {
    var self = this;
    setInterval(function() {
      // random walk +- 20
      var next = self.prev - 20 + (Math.random() * 40);
      next = Math.max(0, Math.min(1023, next));
      callback(""+next);
      self.prev = next;
    }, 50);
  }

  window.ArduinoComm = ArduinoComm;
  window.DummyArduinoComm = DummyArduinoComm;
})();
