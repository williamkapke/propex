var should = require("should");
var Px = require("../");

describe("Recurse/Copy", function() {
  var data = {
    a: {x:1,xx:2},
    b: [
      {y:1,yy:2},
      {y:3,yy:4,yyy:0},
      {y:5,yy:6}
    ],
    c: {z:1,zz:2}
  };
  it("should deep copy objects (starting with an object)",function() {
    Px("{a{x},b[{y}],c{z}}").copy(data).should.eql({
      a:{x:1},
      b:[{y:1},{y:3},{y:5}],
      c:{z:1}
    });
  });
  it("should deep copy objects (starting with an array)",function() {
    Px("[{y},1{yyy}]").copy(data.b).should.eql([
      {y:1},
      {yyy:0},
      {y:5}
    ]);
  });
  it("should slice arrays using the min/max values",function() {
    Px("[]:1").copy(data.b).should.eql([{ y: 1, yy: 2 }]);
    Px("[]1:2").copy(data.b).should.eql([{ y: 3, yy: 4, yyy: 0 }]);
    Px("[]2").copy(data.b).should.eql([{ y: 5, yy: 6 }]);
  });
  it("should copy optional properties if they exist",function() {
    Px("[{y,yyy?}]").copy(data.b).should.eql([
      {y:1},
      {y:3,yyy:0},
      {y:5}
    ]);
  });
  it("should output `undefined` for required properties that do not exist",function() {
    Px("[{y,yyy}]").copy(data.b).should.eql([
      {y:1,yyy:undefined},
      {y:3,yyy:0},
      {y:5,yyy:undefined}
    ]);
  });

  it("should rename properties",function() {
    Px("{a>t}").copy(data).should.eql({
      t:{x:1,xx:2}
    });
    Px("{a$t}").copy(data).should.eql({
      t:{x:1,xx:2}
    });
  });

  describe('w/ modifiers', function () {
    var px = Px("{a>w}");
    px.copy.handlers[''] = function(property, name, value, target) {
      target.kickazz = value;
    };

    it("should allow a catchall",function() {
      px.copy(data).should.eql({
        kickazz:{x:1,xx:2}
      });
    });

    it("should override instance handlers with the handler argument",function() {
      var h = {
        '': function(property, name, value, target) {
          target.bark = value;
        }
      };
      px.copy(data, h).should.eql({
        bark:{x:1,xx:2}
      });
    });

    it("should expose parent object",function() {
      var h = {
        do: function(property, name, value, target, parent) {
          should.exist(parent);
          should.exist(name);
          should.exist(value);
          value.should.eql(1);
          name.should.eql('x');
          parent.x.should.eql(1);
          //intentionally not setting anything on target
        }
      };
      Px('{a{x$do}}').copy(data, h).should.eql({
        a:{}//nothing should be set
      });
    });
  });

});