u = ABM.util # ABM.util alias, u.s is also ABM.shape accessor.
publicModelUrl = 'http://concord-consortium.github.io/learning-everywhere/energy-island.html'

shapeOffsets =
  village: [-30, -50]
  windfarm: [-45, -75]
  coalplant: [-34, -78]

class EnergyModel extends ABM.Model
  setup: ->
    @patches.importColors "images/map-data.png"
    @patches.importDrawing "images/map.png"

    villageImg = document.getElementById('village-sprite')
    windfarmImg = document.getElementById('windfarm-sprite')
    coalplantImg = document.getElementById('coalplant-sprite')

    ABM.shapes.add "village", false, (ctx)=>
      ctx.scale(-(1/7), (1/7))
      ctx.rotate Math.PI
      offset = shapeOffsets.village
      ctx.drawImage(villageImg, offset[0], offset[1])
    ABM.shapes.add "windfarm", false, (ctx)=>
      ctx.scale(-(1/7), (1/7))
      ctx.rotate Math.PI
      offset = shapeOffsets.windfarm
      ctx.drawImage(windfarmImg, offset[0], offset[1])
    ABM.shapes.add "coalplant", false, (ctx)=>
      ctx.scale(-(1/7), (1/7))
      ctx.rotate Math.PI
      offset = shapeOffsets.coalplant
      ctx.drawImage(coalplantImg, offset[0], offset[1])

    @agentBreeds "villages windfarms coalplants poles"

    @villages.setDefault "shape", "village"
    @villages.setDefault "heading", 0
    @villages.setDefault "size", 1
    @windfarms.setDefault "shape", "windfarm"
    @windfarms.setDefault "heading", 0
    @windfarms.setDefault "size", 1
    @coalplants.setDefault "shape", "coalplant"
    @coalplants.setDefault "heading", 0
    @coalplants.setDefault "size", 1

    @poles.setDefault "shape", "circle"
    @poles.setDefault "color", [0,0,0]
    @poles.setDefault "size", 0.3

    @links.setDefault "color", [0,0,0]

    @powerGroups = []

  recompute: false
  power: 0

  setLocations: (breed, locs) ->
    if locs.length then @recompute = true
    for {x, y}, i in locs
      if (i < @[breed].length)
        @[breed][i].moveTo @patches.patch(x,y)
      else
        @[breed].create 1, (a)=>
          a.moveTo @patches.patch(x,y)
    while locs.length < @[breed].length
      @[breed].last().die()

  addAgent: (breed, {x, y}) ->
    @recompute = true
    @[breed].create 1, (a)=>
      a.moveTo @patches.patch(x,y)
      a.power = 0

  findAgentCloseTo: ({x, y}) ->
    p = @patches.patch(x,y)
    minDistance = Infinity
    agent = null
    for a in @agents
      d = a.distance p
      if 5 > d < minDistance
        minDistance = d
        agent = a
    return agent

  addPowerLineGroup: (poles) ->
    @powerGroups.push {villages: [], windfarms: []}
    group = @powerGroups.length-1
    for p in poles
      @addPowerLinePole p, group

  addPowerLinePole: ({x, y}, group) ->
    p = (@poles.create 1, (a)=>
      a.moveTo @patches.patch(x,y)
      a.group = group)[0]

    if @poles.length > 1
      if @poles[@poles.length-2].group == group
        @links.create p, @poles[@poles.length-2]

    if not @powerGroups[group]?
      @powerGroups[group] = {villages: [], windfarms: []}

    for v in @villages
      if !~@powerGroups[group].villages.indexOf v
        @powerGroups[group].villages.push(v) if v.distance(p) < 15
    for w in @windfarms
      if !~@powerGroups[group].windfarms.indexOf w
        @powerGroups[group].windfarms.push(w) if w.distance(p) < 15
    for w in @coalplants
      if !~@powerGroups[group].windfarms.indexOf w
        @powerGroups[group].windfarms.push(w) if w.distance(p) < 15

  clearPowerlines: ->
    @powerGroups = []
    for p in @poles by -1
      p.die()

  numVillages: 0
  pollution: 0

  step: ->
    if @recompute

      # recaulculate number of villages on the island
      _numVillages = 0
      for village in @villages
        _numVillages++ if village.p.color[2] < 50
      @numVillages = _numVillages
      updateNumVillages()

      # recalculate power from each plant
      _power = 0
      _pollution = 0
      for farm in @windfarms
        if farm.p.color[2] > 50 then farm.power = 0             # ocean
        else farm.power = ((255 - farm.p.color[0]) + 45) / 10   # the redder, the less wind
        _power += farm.power
      for plant in @coalplants
        if plant.p.color[2] > 50 then plant.power = 0             # ocean
        else plant.power = 45
        _power += plant.power
        _pollution += plant.power
      @power = _power
      @pollution = _pollution

      showPower @power, "generated"
      showPower @pollution, "pollution"

      # recalculate power going to each village
      for village in @villages
        village.power = 0

      for group in @powerGroups
        group.power = 0
        if group.extraPower
          group.power += group.extraPower
        for farm in group.windfarms
          group.power += farm.power
        if group.villages.length > 0
          for village in group.villages
            village.power += group.power / group.villages.length

      for village, i in @villages
        showPower village.power, "needs", i

      @recompute = false

# div, patchSize, minX, maxX, minY, maxY, isTorus, hasNeighbors
#   Defaults: 13, -16, 16, -16, 16, false, true
model = new EnergyModel "layers", 7, 0, 100, 0, 100
window.model = model
model.debug() # Debug: Put Model vars in global name space
model.start() # Run model immediately after startup initialization

showPower = (power, type, num) ->
  if type isnt "needs"
    el = document.getElementById(type)
  else
    el = document.getElementsByClassName('needs')[num+1]

  return unless el

  max = if type is "pollution" then 100 else 40

  left = 10 + (power/max * 180)      # scale power: 0-40MW = 10-190px
  left = Math.min left, 190
  el.querySelectorAll(".cover")[0].style.left = left+'px'

  left = 1 + (power/max * 177)
  left = Math.min left, 178
  el.querySelectorAll(".arrow")[0].style.left = left+'px'

updateNumVillages = ->
  numVillages = model.numVillages
  numVillageOutputs = document.getElementsByClassName('town-needs').length

  if numVillages > 0
    document.getElementById('no-towns').style.display = 'none'
  else
    document.getElementById('no-towns').style.display = ''

  for i in [numVillageOutputs...numVillages] by 1
    newOutput = document.getElementById('town-needs-template').cloneNode(true)
    newOutput.setAttribute 'id', ''
    newOutput.style.display = ''
    newOutput.classList.add 'town-needs'
    newOutput.getElementsByClassName('town-num')[0].innerHTML = i+1
    document.getElementById('town-outputs').appendChild newOutput


  for i in [numVillageOutputs...numVillages] by -1
    els = document.getElementsByClassName('town-needs')
    el = els[els.length-1]
    el.parentNode.removeChild(el);


window.receiveData = (windfarms, villages, powerlines) ->
  return if top.location.hash
  scale = 100/240
  for point in windfarms
    point.x = Math.floor point.x * scale
    point.y = 100 - Math.floor point.y * scale
  model.setLocations "windfarms", windfarms

  for point in villages
    point.x = Math.floor point.x * scale
    point.y = 100 - Math.floor point.y * scale
  model.setLocations "villages", villages

  model.clearPowerlines()
  for powerline in powerlines
    if powerline
      for point in powerline
        point.x = Math.floor point.x * scale
        point.y = 100 - Math.floor point.y * scale
      model.addPowerLineGroup powerline

window.serializeModel = ->
  json = {windfarms: [], villages: [], coalplants: [], powerlines: []}
  for farm in model.windfarms
    json.windfarms.push {x: farm.x, y: farm.y}
  for plant in model.coalplants
    json.coalplants.push {x: plant.x, y: plant.y}
  for village in model.villages
    json.villages.push {x: village.x, y: village.y}
  ###
  for pole in model.poles         # we cant save pole data with this simplistic approach to urls
    group = pole.group
    if !json.powerlines[group] then json.powerlines[group] = []
    json.powerlines[group].push {x: pole.x, y: pole.y}
  ###
  JSON.stringify json

window.saveModelURL = ->
  json = window.serializeModel()
  encoded = window.btoa json
  url = publicModelUrl + "#" + encoded
  document.getElementById("saveUrl").innerHTML =
    "<a href='#{url}'>Link</a>"

  request = new XMLHttpRequest()
  request.open 'POST', 'https://www.googleapis.com/urlshortener/v1/url', true
  request.setRequestHeader 'Content-Type', 'application/json'
  request.onload = ->
    if (request.status >= 200 && request.status < 400)
      resp = JSON.parse request.responseText
      shortUrl = resp.id

      existingHTML = document.getElementById("saveUrl").innerHTML
      document.getElementById("saveUrl").innerHTML =
        existingHTML + "<p>Short URL: <a href='#{shortUrl}'>#{shortUrl}</a><div id='qrcode'></div>"

      if (QRCode)
        qrcode = new QRCode "qrcode"
        qrcode.makeCode shortUrl

  request.send "{'longUrl': '#{url}'}"



if top.location.hash
  hash = top.location.hash.slice(1)
  if hash.length
    modelData = JSON.parse(window.atob(hash))
    model.setLocations "windfarms", modelData.windfarms
    model.setLocations "coalplants", modelData.coalplants
    model.setLocations "villages", modelData.villages

### mouse events ###

layers = document.getElementById 'layers'
mouseMode = null
poleGroup = -1
carryingBreed = null

offsetX = (evt, target) ->
  evt.offsetX ? evt.pageX - target.offset().left

offsetY = (evt, target) ->
  evt.offsetY ? evt.pageY - target.offset().top

setMouseMode = (mode) ->
  layers.style.cursor = "crosshair"
  mouseMode = mode

mouseDown = (x, y) ->
  switch mouseMode
    when 'villages', 'windfarms', 'coalplants'
      model.addAgent mouseMode, {x, y}
    when 'pole'
      model.addPowerLinePole {x, y}, poleGroup
      model.recompute = true
    when 'move'
      agent = model.findAgentCloseTo {x, y}
      if agent then startDrag agent

mouseUp = (x, y) ->
  if carryingBreed
    model.addAgent carryingBreed, {x, y}
    carryingBreed = null
    setMouseMode 'move'

startDrag = (agent) ->
  spriteId = agent.shape + '-sprite'
  imgUrl = document.getElementById(spriteId).getAttribute 'src'
  offset = (o * -1 for o in shapeOffsets[agent.shape])
  layers.style.cursor = "url('#{imgUrl}') #{offset[0]} #{offset[1]},auto"
  carryingBreed = agent.breed.name
  agent.die()

layers.addEventListener 'mousedown', (evt) ->
  [x, y] = model.patches.pixelXYtoPatchXY offsetX(evt, layers), offsetY(evt, layers)
  mouseDown x, y

layers.addEventListener 'mouseup', (evt) ->
  [x, y] = model.patches.pixelXYtoPatchXY offsetX(evt, layers), offsetY(evt, layers)
  mouseUp x, y


### buttons ###

if document.getElementById('add-village-btn')
  document.getElementById('add-village-btn').addEventListener 'click', ->
    setMouseMode 'villages'

  document.getElementById('add-windfarm-btn').addEventListener 'click', ->
    setMouseMode 'windfarms'

  document.getElementById('add-coalplant-btn').addEventListener 'click', ->
    setMouseMode 'coalplants'

  document.getElementById('add-powerlines-btn').addEventListener 'click', ->
    setMouseMode 'pole'
    poleGroup++

  document.getElementById('move-btn').addEventListener 'click', ->
    setMouseMode 'move'

### setup ###
model.addAgent 'villages', {x: 84, y: 43}
model.addAgent 'villages', {x: 75, y: 55}
model.addPowerLinePole {x: 82, y: 43}, 0
model.addPowerLinePole {x: 72, y: 52}, 0
model.addPowerLinePole {x: 97, y: 85}, 0
