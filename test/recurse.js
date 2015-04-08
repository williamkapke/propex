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
  it("should rename properties",function() {
    Px("{a>w}").copy(data).should.eql({
      w:{x:1,xx:2}
    });
    Px("{a$w}").copy(data).should.eql({
      w:{x:1,xx:2}
    });
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

});