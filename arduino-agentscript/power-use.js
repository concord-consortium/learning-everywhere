$(function() {
  var powerRequired,
      powerRemaining = 100,
      t = 70,
      update,
      plotOptions,
      remainingData = [[0, 100]],
      requiredData = [[0, 0]],
      arduinoComm = new ArduinoComm();

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
    },
    legend: {
      show: true,
      container: "#useage-legend"
    }
  };
  $.plot("#use-graph", [{label: "Stored power", data: remainingData}, {label: "Power usage", data: requiredData}], plotOptions);

  updatePowerRemaining = function(powerAdded) {
    powerRequired = 50 + (Math.sin(t/15) * 50);
    alert = false;
    if (powerRequired > powerRemaining*3) {
      alert = true;
      model.powerGroups[0].extraPower = 0;
      model.recompute = true;
    } else {
      model.powerGroups[0].extraPower = 100;
      model.recompute = true;
    }

    powerRequired = Math.min(powerRequired, powerRemaining*3);
    t++;
    powerRemaining += (powerAdded/90);
    powerRemaining -= (powerRequired/150);
    powerRemaining = Math.max(0, Math.min(100, powerRemaining));

    // plot to chart
    lastX = remainingData[remainingData.length-1][0];
    remainingData.push([lastX+1, powerRemaining]);

    lastX = requiredData[requiredData.length-1][0];
    requiredData.push([lastX+1, powerRequired/3]);

    extra = remainingData.length - 35;
    if (extra > 0) {
      remainingData = remainingData.slice(extra);
      requiredData = requiredData.slice(extra);
    }

    $.plot("#use-graph", [{label: "Stored power", data: remainingData}, {label: "Power usage", data: requiredData}], plotOptions);
    if (alert) {
      $('#use-graph .flot-overlay').css({backgroundColor: 'rgba(255, 0, 0, 0.309804)'});
    } else {
      $('#use-graph .flot-overlay').css({backgroundColor: ''});
    }

    arduinoComm.serialWrite(50 + (powerRequired * 1.7));

    if (powerAdded > 10) {
      $('#plant-stopped').hide();
      $('#plant').show();
    } else {
      $('#plant-stopped').show();
      $('#plant').hide();
    }
  }

  window.updatePowerRemaining = updatePowerRemaining;
});
