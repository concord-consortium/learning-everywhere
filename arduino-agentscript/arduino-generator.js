var setupGraphs,
    plotData = [[0, 0]],
    plotOptions,
    plot,
    boostPower = 0;


$(function() {
  var arduinoComm = new ArduinoComm(),
      acceptSerialData,
      processDataStream,
      dataStream = [],
      currentAveragePower = 0,
      output = document.getElementById('generator-output');
      window.a = arduinoComm;

  setupGraphs();
  arduinoComm.checkInitialization();
  i = 0
  acceptSerialData = function (data) {
    var val = parseInt(data);

    if (val > 1020) alert("not too fast!");

    if (!isNaN(val)) {
      dataStream.push(val);
    }
  }

  processDataStream = function() {
    var len = dataStream.length,
        sum;

    if (len == 0) return;

    sum = dataStream.reduce(function(a, b) {
      return a + b;
    });
    currentAveragePower = sum/len;
    dataStream = [];

    power = currentAveragePower/8;

    if (boostPower) {
      console.log(boostPower)
      power += boostPower;
      boostPower = 0;
    }

    output.innerHTML = power.toFixed(1);

    // plot to chart
    lastX = plotData[plotData.length-1][0];
    plotData.push([lastX+1, power]);

    extra = plotData.length - 25;
    if (extra > 0) {
      plotData = plotData.slice(extra);
    }

    $.plot("#production-graph", [plotData], plotOptions);

    updatePowerRemaining(power);
  }

  arduinoComm.startSerialRead(acceptSerialData);
  setInterval(processDataStream, 200);

  $('#power-plant').click(function() {
    boostPower += 12;
  });
});

setupGraphs = function() {
  plotOptions = {
    series: {
      shadowSize: 0 // Drawing is faster without shadows
    },
    yaxis: {
      min: 0,
      max: 120
    },
    xaxis: {
      show: false,
      autoscaleMargin: 0.02
    }
  };
  plot = $.plot("#production-graph", [plotData], plotOptions);
}
