var should = require("should");
var Px = require("../");

describe("Propex",function() {
  var default_ast = {
    "items":{},
    "min":1,
    "max":1,
    "isArray":false,
    "length":0,
    "source":"{}"
  };

  describe("Root object",function() {
    it("should default to '{}'",function() {
      Px().should.eql(default_ast);
      Px("").should.eql(default_ast);
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
      px.should.eql(default_ast);
    });
    it("should accept an object with a property",function() {
      var px = Px("{one}");
      px.should.be.instanceOf(Px);
      px.should.eql({
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
      px.should.eql({
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
      px.should.eql({
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
      (function() { Px("{one!}"); }).should.throw("Unexpected character '!' in Propex. position:4 character:'!'");
    });
    it("should ensure non-empty Property Name",function() {
      (function() { Px("{one,,three}"); }).should.throw("Property expected. position:4 character:','");
    });
  });
  describe("Arrays",function() {
    it("should accept an empty array",function() {
      var px = Px("[]");
      px.should.eql({
        items: { '-1': { name: '-1', isOptional: false } },
        isArray: true,
        length: 1,
        source: '[]'
      });
    });
    it("should parse a default definition",function() {
      var px = Px("[{one}]");
      px.should.eql({
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
      px.should.eql({
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
      (function() { Px("[{one}!]"); }).should.throw("Unexpected character. position:6 character:'!'");
    });
    it("should require a numbered index trailing the default definition",function() {

      (function() { Px("[{one},{one}]"); }).should.throw("Number expected position:6 character:','");

      var px = Px("[{x},9]");
      px.should.eql({
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
      Px("[]3").should.eql({
        isArray: true,
        items: { '-1': { isOptional: false, name: '-1' } },
        length: 1,
        min: '3',
        source: '[]3'
      });
      Px("[]3:").should.eql({
        isArray: true,
        items: { '-1': { isOptional: false, name: '-1' } },
        length: 1,
        min: '3',
        source: '[]3:'
      });
    });
    it("should allow a min with a max",function() {
      var px = Px("[]3:5");
      px.should.eql({
        isArray: true,
        items: { '-1': { isOptional: false, name: '-1' } },
        length: 1,
        min: '3',
        max: '5',
        source: '[]3:5'
      });
    });
    it("should allow a max without a min",function() {
      var px = Px("[]:5");
      px.should.eql({
        isArray: true,
        items: { '-1': { isOptional: false, name: '-1' } },
        length: 1,
        max: '5',
        source: '[]:5'
      });
    });
    it("should ensure the array ends properly",function() {
      (function() { Px("[]5:3"); }).should.throw("The max value cannot be less than the min value. position:4 character:'3'");
    });
  });
  describe("Meta Markers",function() {
    it("should parse a property with an unspecified '>' meta marker",function() {
      var px = Px("{one>}");
      px.should.eql({
          "items":{
            "one":{"name":"one","marker": "one","isOptional":false}
          },
          "min":1,
          "max":1,
          "isArray":false,
          "length":1,
          "source":"{one>}"}
      );
    });
    it("should parse a property with a specified '>' meta marker",function() {
      var px = Px("{one>1}");
      px.should.eql({
          "items":{
            "one":{"name":"one","marker": "1","isOptional":false}
          },
          "min":1,
          "max":1,
          "isArray":false,
          "length":1,
          "source":"{one>1}"}
      );
    });
    it("should parse a property with an unspecified '$' meta marker",function() {
      var px = Px("{one$}");
      px.should.eql({
          "items":{
            "one":{"name":"one","marker": "one","isOptional":false}
          },
          "min":1,
          "max":1,
          "isArray":false,
          "length":1,
          "source":"{one$}"}
      );
    });
    it("should parse a property with a specified '$' meta marker",function() {
      var px = Px("{one$1}");
      px.should.eql({
          "items":{
            "one":{"name":"one","marker": "1","isOptional":false}
          },
          "min":1,
          "max":1,
          "isArray":false,
          "length":1,
          "source":"{one$1}"}
      );
    });
  });
});