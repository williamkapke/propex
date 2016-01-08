var should = require("should");
var Px = require("../");
var assert = require('assert');

describe("Propex",function() {
  var default_ast = {
    "items":{},
    "min":1,
    "max":1,
    "isArray":false,
    "length":0,
    "source":"{}"
  };

  //a helper to
  error("[]5:3", "The max value cannot be less than the min value.", 4, '3');
  function error(px, msg, position, character) {
    try{
      Px(px);
      should.fail;
    }
    catch(e){
      e.message.should.eql(msg);
      e.position.should.eql(position);
      e.character.should.eql(character);
    }
  }

  describe("Root object",function() {
    it("should default to '{}'",function() {
      assert.deepEqual(Px(), default_ast);
      assert.deepEqual(Px(""), default_ast);
    });
    it("must be a string",function() {
      (function() { Px(123); }).should.throw("Pattern must start with '{' or '['");
    });
    it("should ensure the proper end of an object",function() {
      (function() { Px("{one}!"); }).should.throw("Unexpected character(s) at the end of the Propex.");
    });
    it("should output the source when toString() is called",function() {
      var px = Px("{foo,bar{baz}}");
      px.toString().should.eql(px.source);
    });

  });
  describe("Objects",function() {
    it("should accept an empty object",function() {
      var px = Px("{}");
      assert.deepEqual(px, default_ast);
    });
    it("should accept an object with a property",function() {
      var px = Px("{one}");
      px.should.be.instanceOf(Px);
      assert.deepEqual(px, {
        "items":{
          "one":{"name":"one","isOptional":false}
        },
        "min":1,
        "max":1,
        "isArray":false,
        "length":1,
        "source":"{one}"}
      );
    });
    it("should accept an object with a optional property",function() {
      var px = Px("{one?}");
      assert.deepEqual(px, {
        "items":{
          "one":{"name":"one","isOptional":true}
        },
        "min":1,
        "max":1,
        "isArray":false,
        "length":1,
        "source":"{one?}"}
      );
    });
    it("should accept an object with multiple properties",function() {
      var px = Px("{one,two>2?,three}");
      px.should.be.instanceOf(Px);
      assert.deepEqual(px, {
        "items":{
          "one":{"name":"one","isOptional":false},
          "two":{"name":"two","marker":"2","isOptional":true},
          "three":{"name":"three","isOptional":false}
        },
        "min":1,
        "max":1,
        "isArray":false,
        "length":3,
        "source":"{one,two>2?,three}"}
      );
    });
    it("should ensure the proper end of an object",function() {
      error("{one!}", "Unexpected character '!' in Propex.", 4, '!');
    });
    it("should ensure non-empty Property Name",function() {
      error("{one,,three}", "Property expected.", 4, ',');
    });
  });
  describe("Arrays",function() {
    it("should accept an empty array",function() {
      var px = Px("[]");
      assert.deepEqual(px, {
        items: { '-1': { name: '-1', isOptional: false } },
        isArray: true,
        length: 1,
        source: '[]'
      });
    });
    it("should parse a default definition",function() {
      var px = Px("[{one}]");
      assert.deepEqual(px, {
        isArray: true,
        items: {
          '-1': {
            isOptional: false,
            name: '-1',
            subproperties: {
              isArray: false,
              items: {
                one: { isOptional: false, name: 'one' }
              },
              length: 1,
              max: 1,
              min: 1,
              source: '{one}'
            }
          }
        },
        length: 1,
        source: '[{one}]'
      });
    });
    it("should parse a specific index definition",function() {
      var px = Px("[3{one}]");
      assert.deepEqual(px, {
        isArray: true,
        items: {
          '3': {
            isOptional: false,
            name: '3',
            subproperties: {
              isArray: false,
              items: { one: { isOptional: false, name: 'one' } },
              length: 1,
              max: 1,
              min: 1,
              source: '{one}'
            }
          }
        },
        length: 1,
        source: '[3{one}]'
      });
    });
    it("should ensure the array ends properly",function() {
      error("[{one}!]", "Unexpected character.", 6, '!');
    });
    it("should require a numbered index trailing the default definition",function() {

      error("[{one},{one}]", "Number expected", 6, ',');

      var px = Px("[{x},9]");
      assert.deepEqual(px, {
        isArray: true,
        items: {
          '-1': {
            isOptional: false,
            name: '-1',
            subproperties: {
              isArray: false,
              items: { x: { isOptional: false, name: 'x' } },
              length: 1,
              max: 1,
              min: 1,
              source: '{x}'
            }
          },
          '9': { isOptional: false, name: '9' }
        },
        length: 2,
        source: '[{x},9]'
      });
    });
    it("should allow a min without a max",function() {
      var px1 = Px("[]3");
      assert.deepEqual(px1, {
        isArray: true,
        items: { '-1': { isOptional: false, name: '-1' } },
        length: 1,
        min: 3,
        source: '[]3'
      });
      var px2 = Px("[]3:");
      assert.deepEqual(px2, {
        isArray: true,
        items: { '-1': { isOptional: false, name: '-1' } },
        length: 1,
        min: 3,
        source: '[]3:'
      });
    });
    it("should allow a min with a max",function() {
      var px = Px("[]3:5");
      assert.deepEqual(px, {
        isArray: true,
        items: { '-1': { isOptional: false, name: '-1' } },
        length: 1,
        min: 3,
        max: 5,
        source: '[]3:5'
      });
    });
    it("should allow a max without a min",function() {
      var px = Px("[]:5");
      assert.deepEqual(px, {
        isArray: true,
        items: { '-1': { isOptional: false, name: '-1' } },
        length: 1,
        max: 5,
        source: '[]:5'
      });
    });
    it("should ensure the array ends properly",function() {
      error("[]5:3", "The max value cannot be less than the min value.", 4, '3');
    });
  });
  describe("Meta Markers",function() {
    it("should parse a property with an unspecified '>' meta marker",function() {
      var px = Px("{one>}");
      assert.deepEqual(px, {
        "items":{
          "one":{"name":"one","marker": "one","isOptional":false}
        },
        "min":1,
        "max":1,
        "isArray":false,
        "length":1,
        "source":"{one>}"
      });
    });
    it("should parse a property with a specified '>' meta marker",function() {
      var px = Px("{one>1}");
      assert.deepEqual(px, {
        "items":{
          "one":{"name":"one","marker": "1","isOptional":false}
        },
        "min":1,
        "max":1,
        "isArray":false,
        "length":1,
        "source":"{one>1}"
      });
    });
    it("should parse a property with an unspecified '$' meta marker",function() {
      var px = Px("{one$}");
      assert.deepEqual(px, {
        "items":{
          "one":{"name":"one","marker": "one","isOptional":false}
        },
        "min":1,
        "max":1,
        "isArray":false,
        "length":1,
        "source":"{one$}"
      });
    });
    it("should parse a property with a specified '$' meta marker",function() {
      var px = Px("{one$1}");
      assert.deepEqual(px, {
        "items":{
          "one":{"name":"one","marker": "1","isOptional":false}
        },
        "min":1,
        "max":1,
        "isArray":false,
        "length":1,
        "source":"{one$1}"
      });
    });
  });
});