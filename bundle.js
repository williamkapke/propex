require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"propex":[function(require,module,exports){

//PropertyExpressions are immutable- so lets cache them.
var cache = {};


function Propex(value) {
  value = (!exists(value) || value==="")? "{}" : value.toString();

  var ret = cache[value];
  if(ret) return ret;

  cache[value] = ret = new reader(value);
  return ret;
}
Propex.prototype = {
  toString: function(){
    return this.source;
  },
  copy: function(source, modifiers){
    var isArray = Array.isArray(source);
    if (this.isArray && !isArray) throw new Error("Expected source to be an Array");
    if (isArray && !this.isArray) throw new Error("Expected source to be an Object");

    function assign(property, name, value, result){
      if(!exists(property.marker))
        return result[name] = value;

      var modifier = (modifiers && modifiers[property.marker]) || rename;
      modifier(property, name, value, result);
    }
    return this.recurse(source, {
      found: assign,
      objectStart:function(property, key, item, result) {
        return property.subproperties.isArray? [] : {};
      },
      objectEnd: function(property, name, result, parent){
        var subs = property.subproperties;
        if(subs.isArray && (exists(subs.min) || exists(subs.max)))
          result = result.slice(subs.min||0,subs.max);

        if(name!==null) assign(property, name, result, parent);

        return result
      },
      missing: function(property, name, context){
        assign(property, name, undefined, context);
      }
    });
  },
  recurse: function(obj, events, result){
    var property = { name:null, isOptional:false, subproperties:this };
    return examine(null, obj, property, events, result);
  },
  fields: function() {
    var out = {};
    var items = this.items;
    Object.keys(items).forEach(function(k) {
      out[k] = items[k].subproperties? items[k].subproperties.fields() : 1;
    });
    return out;
  }
};
function rename(property, name, value, target) {
  target[property.marker] = value;
}
function examine(key, item,  property, events, result){
  var subs = property.subproperties;
  if(!exists(item) || (subs && typeMismatch(subs.isArray, item))) {
    if(!property.isOptional && events.missing)
      return events.missing(property, key, result);
    return;
  }

  if(subs) {
    if(events.objectStart)
      var sub_result = events.objectStart(property, key, item, result);

    if(item!==null) {
      if(subs.isArray)
        examineArray(item, subs, events, sub_result || (sub_result=[]));
      else
        examineObject(item, subs, events, sub_result || (sub_result={}));
    }

    if(events.objectEnd)
      //allow objectEnd to generate a completely new result, or just return the result obj
      sub_result = events.objectEnd(property, key, sub_result, result) || result;

    return sub_result;
  }
  else {
    if(events.found) events.found(property, key, item, result);
  }
}
function examineObject(obj, propex, events, result){
  var pxi = propex.items;
  var keys = Object.keys(pxi);
  for(var i=0;i<keys.length;i++){
    var key = keys[i];
    examine(key, obj[key], pxi[key], events, result);
  }
}
function examineArray(array, propex, events, result){
  var defaultProperty = propex.items["-1"];
  var pxItems = propex.items;
  var property;
  var l = propex.max? propex.max : array.length;
  var i = 0;

  for(;i<l;i++){
    property = pxItems[i] || defaultProperty || {isOptional:false};
    examine(i, array[i], property, events, result);
  }
}

function typeMismatch(isArray, data){
  var dataIsArray = Array.isArray(data);
  return (isArray && !dataIsArray) || (!isArray && dataIsArray)
}
//holds info about each property
function Property(name, marker, subproperties, isOptional){
  this.name = name;
  if(exists(marker)) this.marker = marker;
  if(exists(subproperties)) this.subproperties = subproperties;
  if(exists(isOptional)) this.isOptional = isOptional;
}

function propex(properties, isArray, min, max, source){
  var items = this.items = {};
  //properties
  if(min) this.min = min;
  if(max) this.max = max;
  this.isArray = isArray;
  this.length = properties.length;
  this.source = source;

  if (properties) {
    properties.forEach(function(target){
      items[target.name] =  target;
    });
  }
  Object.freeze(this.items);
  Object.freeze(this);
  cache[source] = this;
}
propex.prototype = Propex.prototype;


function reader(source) {
  this.source = source;
  this.current = 0;
  this.position = -1;
  this.remaining = source.length;

  var result = this.readPropertyGroup() || this.readArrayGroup();

  if(!result) throw new Error("Pattern must start with '{' or '['");
  if(this.remaining) throw new Error("Unexpected character(s) at the end of the Propex.");

  result.source = source;
  return result;
}
reader.prototype = {
  readPropertyGroup: function() {
    //we should start here 1 character before a '{'
    if(this.peek(1)!=='{') return;
    this.move(1);
    var start = this.position;
    var props = this.peek(1) == '}' ? [] : this.readProperties();
    this.move(1);

    if (this.current != '}')
      throw new ParseError(this, "Unexpected character '" + this.current + "' in Propex.");

    var source = this.source.substring(start, this.position+1);
    return new propex(props, false, 1, 1, source);
  },
  readProperties: function() {
    var name = this.readPropertyName();
    if(!name) return [];

    var props = [this.readProperty(name)];

    while (this.peek(1)===',') {
      this.move(1);
      name = this.readPropertyName();
      if(!name) throw new ParseError(this, "Property expected.");
      props.push(this.readProperty(name));
    }
    return props;
  },
  readProperty: function(name) {
    return new Property(
      name,
      this.readMarker(name),
      this.readPropertyGroup() || this.readArrayGroup(),
      !!(this.peek(1)==='?' && this.move(1)) //isOptional
    );
  },
  readMarker:function(name) {
    var c = this.peek(1);
    if (c !== '>' && c !== '$') return;
    this.move(1);
    return this.readPropertyName() || name;
  },
  readIndexItem: function() {
    return this.readProperty(this.readPropertyName(true)||"-1");
  },
  readPropertyName: function(digits) {
    //this.current should be 1 character before the start of the property name
    var c, len=0, rx=digits?/\d/:/\w/;
    while (this.remaining - (len++)) {
      c = this.peek(len);
      if (!rx.test(c)) break; // [a-zA-Z0-9_]
    }
    len--;
    var name = this.source.substr(this.position + 1, len);
    this.move(len);
    return name;
  },
  readArrayGroup: function() {
    //we start here 1 character before a '['
    if(this.peek(1)!=='[') return;
    this.move(1);
    var start = this.position;
    var indexitems = this.readIndexItems();

    if (this.move(1) != ']')
      throw new ParseError(this, "Unexpected character.");

    if (this.remaining > 0) {
      var min = this.readPropertyName(true);
      if(this.remaining > 0 && this.peek(1)===':') this.move(1);
      var max = this.readPropertyName(true);
      if (exists(min) && exists(max) && parseInt(max,10) < parseInt(min,10))
        throw new ParseError(this, "The max value cannot be less than the min value.");
    }
    var source = this.source.substring(start, this.position+1);
    return new propex(indexitems, true, min, max, source);
  },
  readIndexItems: function() {
    var props = [];
    props.push(this.readIndexItem());
    while (this.peek(1) == ',') {
      this.move(1);
      if(!isDigit(this.peek(1)))
        throw new ParseError(this, "Number expected");
      props.push(this.readIndexItem());
    }
    return props;
  },
  peek: function(count) {
    return this.source[this.position + count];
  },
  move: function(count) {
    if (count == 0) return this.current;

    this.remaining -= count;
    this.position += count;
    return this.current = this.source[this.position];
  }
};

//these are only here to provide semantics about their operation
function isDigit(c) { return /\d/.test(c); }
function exists(x) {
  return typeof x !== "undefined";
}

function ParseError(ctx, message){
  Error.captureStackTrace(this, ParseError);
  this.message = message+" position:"+ctx.position+" character:'"+ctx.current+"'";
  this.position = ctx.position;
  this.character = ctx.current;
}
ParseError.prototype = Error.prototype;

module.exports = Propex;

},{}]},{},[]);
