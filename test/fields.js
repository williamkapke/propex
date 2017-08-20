var should = require("should");
var Px = require("../");

describe("Fields", function() {
  it("should convert a propex into a mongo-like fields object",function() {
    var px = Px("{a{x,y},b,c}");
    px.fields().should.eql({ 'a.x':1, 'a.y':1, b:1, c:1});
  });

});