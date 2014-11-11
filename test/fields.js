var should = require("should");
var Px = require("../");

describe("Fields", function() {
  it("should convert a propex into a mongo-like fields object",function() {
    var px = Px("{a{x,y},b,c}");
    //yeah- these would need to be flattened to use with mongo
    // the intent here is just to show that the nesting works
    px.fields().should.eql({a:{x:1,y:1},b:1,c:1});
  });

});