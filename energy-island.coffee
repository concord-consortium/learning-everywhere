u = ABM.util # ABM.util alias, u.s is also ABM.shape accessor.

shapeOffsets =
  village: [-30, -50]
  windfarm: [-45, -75]

class EnergyModel extends ABM.Model
  setup: ->
    @patches.importColors "images/map-data.png"
    @patches.importDrawing "images/map.png"

    villageImg = document.getElementById('village-sprite')
    windfarmImg = document.getElementById('windfarm-sprite')

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

    @agentBreeds "villages windfarms poles"

    @villages.setDefault "shape", "village"
    @villages.setDefault "heading", 0
    @villages.setDefault "size", 1
    @windfarms.setDefault "shape", "windfarm"
    @windfarms.setDefault "heading", 0
    @windfarms.setDefault "size", 1

    @poles.setDefault "shape", "circle"
    @poles.setDefault "color", [0,0,0]
    @poles.setDefault "size", 0.3

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
      for v in @villages
        if !~@powerGroups[group].villages.indexOf v
          @powerGroups[group].villages.push(v) if v.distance(p) < 8
      for w in @windfarms
        if !~@powerGroups[group].windfarms.indexOf w
          @powerGroups[group].windfarms.push(w) if w.distance(p) < 8

  addPowerLinePole: ({x, y}, group) ->
    @poles.create 1, (a)=>
      a.moveTo @patches.patchXY(x,y)
      a.group = group

  clearPowerlines: ->
    @powerGroups = []
    for p in @poles by -1
      p.die()

  step: ->
    if @recompute
      _power = 0
      for farm in @windfarms
        if farm.p.color[2] > 50 then farm.power = 0             # ocean
        else farm.power = ((255 - farm.p.color[0]) + 45) / 10   # the redder, the less wind
        _power += farm.power
      @power = _power
      showPower @power, "generated"

      for group in @powerGroups
        group.power = 0
        for farm in group.windfarms
          group.power += farm.power
        if group.villages.length > 0
          showPower group.power, "needs"


      @recompute = false

# div, patchSize, minX, maxX, minY, maxY, isTorus, hasNeighbors
#   Defaults: 13, -16, 16, -16, 16, false, true
model = new EnergyModel "layers", 7, 0, 100, 0, 100
window.model = model
model.debug() # Debug: Put Model vars in global name space
model.start() # Run model immediately after startup initialization

showPower = (power, type) ->
  left = 10 + (power/40 * 180)      # scale power: 0-40MW = 10-190px
  left = Math.min left, 190
  document.querySelectorAll("##{type} .cover")[0].style.left = left+'px'

  left = 1 + (power/40 * 177)
  left = Math.min left, 178
  document.querySelectorAll("##{type} .arrow")[0].style.left = left+'px'

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
  json = {windfarms: [], villages: [], powerlines: []}
  for farm in model.windfarms
    json.windfarms.push {x: farm.x, y: farm.y}
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
  url = top.location.origin + "#" + encoded
  document.getElementById("saveUrl").innerHTML = "<a href='#{url}'>Link</a>"

if top.location.hash
  hash = top.location.hash.slice(1)
  if hash.length
    modelData = JSON.parse(window.atob(hash))
    model.setLocations "windfarms", modelData.windfarms
    model.setLocations "villages", modelData.villages

### mouse events ###

layers = document.getElementById 'layers'
mouseMode = null
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
    when 'villages', 'windfarms'
      model.addAgent mouseMode, {x, y}
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
  console.log "url('#{imgUrl}') #{offset[0]} #{offset[1]},auto"
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

document.getElementById('add-village-btn').addEventListener 'click', ->
  setMouseMode 'villages'

document.getElementById('add-windfarm-btn').addEventListener 'click', ->
  setMouseMode 'windfarms'

document.getElementById('move-btn').addEventListener 'click', ->
  setMouseMode 'move'

