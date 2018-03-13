(function () {
  window.interactiveController = new Lab.InteractivesController(
    {
      "title": "Convection",
      "publicationStatus": "public",
      "labEnvironment": "production",
      "i18nMetadata": "",
      "lang": "en-US",
      "theme": "",
      "showTopBar": true,
      "showBottomBar": true,
      "padding": 10,
      "subtitle": "",
      "about": "",
      "category": "",
      "subCategory": "",
      "screenshot": "",
      "aspectRatio": 1,
      "fontScale": 1,
      "helpOnLoad": false,
      "aboutOnLoad": false,
      "models": [
        {
          "type": "energy2d",
          "id": "model",
          "url": "energy2d-model.json"
        }
      ],
      "parameters": [],
      "dataSets": [],
      "propertiesToRetain": [],
      "outputs": [],
      "filteredOutputs": [],
      "components": [
        {
          "id": "graph",
          "type": "graph",
          "resetAxesOnReset": true,
          "enableAutoScaleButton": true,
          "enableAxisScaling": true,
          "enableZooming": true,
          "autoScaleX": true,
          "autoScaleY": true,
          "enableSelectionButton": false,
          "clearSelectionOnLeavingSelectMode": false,
          "enableDrawButton": false,
          "drawProperty": null,
          "markAllDataPoints": false,
          "showRulersOnSelection": false,
          "fontScaleRelativeToParent": true,
          "hideAxisValues": false,
          "properties": [
            "sensor-0",
            "sensor-1"
          ],
          "xProperty": "time",
          "title": "Temperature Probes: T1, T2",
          "titlePosition": "center",
          "buttonsStyle": "icons",
          "buttonsLayout": "vertical",
          "lineWidth": 2,
          "width": "100%",
          "height": "100%",
          "xlabel": "Time (s)",
          "xmin": 0,
          "xmax": 1200,
          "ylabel": "Temperature (°C)",
          "ymin": -5,
          "ymax": 50,
          "xTickCount": 5,
          "yTickCount": 10,
          "xscaleExponent": 0.5,
          "yscaleExponent": 0.5,
          "xFormatter": ".2s",
          "yFormatter": ".2s",
          "lines": true,
          "bars": false,
          "tooltip": "",
          "dataColors": [
            "#a00000",
            "#2ca000"
          ],
          "legendLabels": [
            "T1",
            "T2"
          ],
          "legendVisible": true,
          "syncXAxis": false,
          "syncYAxis": false,
          "helpIcon": false
        }
      ],
      "layout": {
        "bottom": [],
        "right": [
          "graph"
        ]
      },
      "template": "wide-right",
      "helpTips": []
    },
    '#interactive-container');
}());