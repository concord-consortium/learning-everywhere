var GG = Em.Application.create({});

GG.Place = Em.Object.extend({
  name: "Montana",
  population: 40000,
  populationNeeds: 1,
  industry: 0,
  bank: 1e5,
  powerPlants: Em.A(),
  additionalPower: 0,
  efficiency: 0,
  populationNeedsArray: Em.A(),
  industryNeedsArray: Em.A(),
  populationSatisfied: 0,
  industrySatisfied: 0,
  cumulativePopulationSatisfied: 0,
  prepurchasedPower: 0,
  excessPowerSold: 0,
  sadFaces: 0,
  turn: 0
});

GG.Date = Em.Object.extend({
  year: 0,
  season: 0
})

GG.IndexRoute = Em.Route.extend({
  enter: function () {
    GG.dateController.set('content', GG.Date.create());

    $.getJSON('gameData.json', function (_data) {
      var location = /[?](\w*)/.exec(window.location.search)[1],
          data = _data[location],
          place = GG.Place.create(data);

      // we have to re-iterate over the arrays by hand or they are not instantiated properly
      place.set('powerPlants', Em.A());
      for (var i = 0, ii = _data[location].powerPlants.length; i<ii; i++) {
        plant = Em.Object.create(_data[location].powerPlants[i]);
        place.get('powerPlants').pushObject(plant);
      }
      place.set('costs', Em.A());
      for (var i = 0, ii = _data[location].costs.length; i<ii; i++) {
        cost = Em.Object.create(_data[location].costs[i]);
        place.get('costs').pushObject(cost);
      }

      GG.gameController.set('content', place);
    });
  }
});

GG.IndexController = Em.ObjectController.extend({
  actions: {
    endTurn: function() {
      GG.gameController.nextTurn();
    },

    buy: function(item) {
      GG.gameController.buy(item);
    },

    hideMessage: function() {
      $("#message").fadeOut();
    }
  }
});

GG.GameController = Em.ObjectController.extend({
    powerNeededByPopulation: function() {
      return (Math.round(this.get('population') * this.get('populationNeeds') / 10000));
    }.property('population', 'populationNeeds'),

    powerActuallyNeededByPopulation: function() {
      return this.get("powerNeededByPopulation") - this.get("efficiency");
    }.property('powerNeededByPopulation', 'efficiency'),

    powerNeededByIndustry: function() {
      return Math.round(this.get('industry') / 10000)
    }.property('industry'),

    powerNeededByPopulationString: function() {
      return (this.get('powerNeededByPopulation') - this.get('efficiency'));
    }.property('powerNeededByPopulation', 'efficiency'),

    powerNeededByIndustryString: function() {
      return this.get('powerNeededByIndustry');
    }.property('powerNeededByIndustry'),

    powerNeededByPopulationObserver: function() {
      var needs = this.get('powerNeededByPopulation'),
          populationNeedsArray = [], i;
      for (i = 0; i <= needs; i++) {
          populationNeedsArray.push({type: "population", value: i});
      }
      for (i = needs; i > needs-this.get('efficiency'); i--) {
        populationNeedsArray[i].efficient = true;
      }
      this.set('populationNeedsArray', populationNeedsArray);
    }.observes('powerNeededByPopulation', 'efficiency'),

    powerNeededByIndustryObserver: function() {
      var needs = this.get('powerNeededByIndustry'),
          industryNeedsArray = [], i;
      for (i = 0; i <= needs; i++) {
          industryNeedsArray.push({type: "industry", value: i});
      }
      this.set('industryNeedsArray', industryNeedsArray);
    }.observes('powerNeededByIndustry'),

    extraPowerObserver: function() {
      var power = this.get('power'),
          extraPowerArray = [], i;
      for (i = 0; i <= power; i++) {
          extraPowerArray.push({type: "extra", value: i});
      }
      this.set('extraPowerArray', extraPowerArray);
    }.observes('power'),

    moneyAsString: function() {
      var val = this.get('bank');

      if (isNaN(val)) return "";

      if (val <= 1000) {
        return "$"+val;
      }
      return "$"+Math.round((val/1000) * 10) / 10+"k";
    }.property('bank'),

    power: function() {
      powerPlants = this.get('powerPlants');
      if (!powerPlants) return;
      power = 0;
      for (i  = 0, ii = powerPlants.length; i<ii; i++) {
        p = powerPlants[i];
        if (!p.time) {
          power += p.power;
        }
      }
      power += this.get('additionalPower');
      return power;
    }.property('powerPlants', 'additionalPower'),

    buy: function(item) {
      var cost = item.cost * 1000,
          power = item.power,
          time = item.time,
          bank = this.get("bank");
      if (cost > bank) {
        $("#bank, .buy").addClass("fail").delay(2000).queue(function(){
            $(this).removeClass("fail").dequeue();
        });
        return;
      }
      $("#bank, .buy").addClass("success").delay(800).queue(function(){
          $(this).removeClass("success").dequeue();
      });
      this.set("bank", bank - cost);
      if (item.plant) {
        powerPlants = this.get('powerPlants');
        powerPlants.pushObject(Em.Object.create(item));
      } else if (item.power) {
        if (item.delay) {
          this.set("prepurchasedPower", this.get("prepurchasedPower") + item.power);
        } else {
          this.set("additionalPower", this.get("additionalPower") + item.power);
        }
      } else if (item.efficiency) {
        this.set("efficiency", this.get("efficiency") + item.efficiency);
        item.set("cost", item.get("cost")+10);
      }
    },

    nextTurn: function() {
      GG.dateController.increment();

      var bank = this.get("bank");

      bank += (this.get("industrySatisfied") * 5000);

      this.set('cumulativePopulationSatisfied', this.get('cumulativePopulationSatisfied') + this.get('populationSatisfied'));
      if (GG.dateController.get("season") == 3) {
        bank += (this.get("cumulativePopulationSatisfied") * 500);
        this.set('cumulativePopulationSatisfied', 0);
      }
      bank += (this.get('excessPowerSold') * 2000);
      this.set('excessPowerSold', 0);

      this.set("bank", bank);

      this.set("sadFaces", this.get("sadFaces") + (this.get("powerActuallyNeededByPopulation") - this.get("populationSatisfied")))

      this.set('populationSatisfied', 0);
      this.set('industrySatisfied', 0);
      $('.power-need').removeClass("selected");

      this.set('additionalPower', this.get('prepurchasedPower'));
      this.set('prepurchasedPower', 0);

      extraMessageStart = "";

      powerPlants = this.get('powerPlants');
      for (i  = 0, ii = powerPlants.length; i<ii; i++) {
        p = powerPlants[i];
        if (p.time) {
          p.set("time", p.time-1);
          if (p.time == 0) {
            extraMessageStart += "<p>Your "+p.type+" is up and running! Remember to connect it to your grid.</p>";
          }
        }
      }
      GG.gameController.propertyDidChange("powerPlants");

      var newTurn = this.get('turn')+1;
      this.set('turn', newTurn);
      var newData = this.get('progression')[newTurn-1];
      for (key in newData) {
        this.set(key, newData[key]);
      }
      this.set("message", extraMessageStart + this.get("message"));
      $('html,body').animate({scrollTop:0},50);
      $("#message").show();
    }
});
GG.gameController = GG.GameController.create();

GG.DateController = Em.ObjectController.extend({
  dateString: function() {
    var year   = this.get("year") + 1,
        season = ["Spring", "Summer", "Fall", "Winter"][this.get("season")];
    return "Year "+year+", "+season;
  }.property('year', 'season'),

  increment: function() {
    var season = this.get("season");
    newSeason = season == 3 ? 0 : season+1;
    this.set("season", newSeason);
    if (newSeason == 0) this.set("year", this.get("year")+1);
  }
});
GG.dateController = GG.DateController.create();

GG.NeedView = Em.View.extend({
  layout: Em.Handlebars.compile("{{value}}"),
  classNames: ['power-need'],
  classNameBindings: ['efficient', 'first'],
  efficientBinding: 'content.efficient',
  first: function() {
    return (this.get('efficient') &&
      this.get('content.value') == (GG.gameController.get("powerNeededByPopulation") - GG.gameController.get("efficiency"))+1);
  }.property('efficient'),
  click: function(evt) {
    var type  = this.get('content.type'),
        value = this.get('content.value'),
        el = evt.target,
        parent = $(el).parent();
    if (type == "population") {
      if (this.get('content.efficient')) {
        value = (GG.gameController.get("powerNeededByPopulation") - GG.gameController.get("efficiency"));
      }
      GG.gameController.set("populationSatisfied", value);
    } else if (type == "industry") {
      GG.gameController.set("industrySatisfied", value);
    } else {
      GG.gameController.set("excessPowerSold", value);
    }
    parent.children('div').removeClass("selected").each(function(i) {
      if (i <= value) $(this).addClass("selected");
    });
  }
});

Em.Handlebars.registerBoundHelper('times', function(n, block) {
    var accum = '';
    for(var i = 0; i < n; ++i)
        accum += block.fn(i);
    return accum;
});
