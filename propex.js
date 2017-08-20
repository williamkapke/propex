
//PropertyExpressions are immutable- so lets cache them.
var cache = {};
var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;


function Propex(value) {
  value = (!exists(value) || value==="")? "{}" : value.toString();
  return cache[value] || new reader(value);
}
Propex.prototype = {
  toString: function(){
    return this.source;
  },
  copy: function(source, modifiers){
    var isArray = Array.isArray(source);
    if (this.isArray && !isArray) throw new Error("Expected source to be an Array");
    if (isArray && !this.isArray) throw new Error("Expected source to be an Object");
    modifiers = modifiers || {};
    var handlers = this.copy.handlers || {};
    var catchall = (modifiers['']) || (handlers['']) || rename;

    function assign(key, value, target, property, parent){
      if(!exists(property.marker))
        return target[key] = value;

      var modifier = (modifiers[property.marker]) || (handlers[property.marker]) || catchall;
      modifier(property, key, value, target, parent);
    }
    function copy(property, key) {
      if(typeof key === 'number' && key > this.data.length-1)
        return true; //end of array

      var item = this.data[key];
      if(typeof item === 'undefined'){
        if(!property.isOptional)
          assign(key, undefined, this.result, property, this.data);
        return;
      }

      var subs = property.subproperties;
      if(subs) {
        item = subs.recurse(copy, { data:item, result: subs.isArray?[]:{}}).result;
        if(subs.isArray && (exists(subs.min) || exists(subs.max)))
          item = item.slice(subs.min || 0, subs.max);
      }
      assign(key, item, this.result, property, this.data);
    }
    var result = this.recurse(copy, {data:source, result:isArray?[]:{}}).result;

    if(this.isArray && (exists(this.min) || exists(this.max)))
      result = result.slice(this.min || 0, this.max);
    return result;
  },
  recurse: function(cb, context){
    var items = this.items;
    if(this.isArray && items['-1']){
      var l = this.max? this.max : MAX_SAFE_INTEGER;

      for(var i=0;i<l;i++){
        var property = items[i] || items['-1'] || {isOptional:false};
        if(cb.call(context, property, i)) break;
      }
    }
    else Object.keys(items).forEach(function (key) {
      cb.call(context, items[key], key);
    });
    return context;
  },
  fields: function() {
    var out = {};

    function iterate(parent, px) {
      var items = px.items;

      if (px.isArray) {
        if (!items[-1]) return;
        items = items[-1].subproperties.items
      }

      Object.keys(items).forEach(function(k) {
        if (items[k].subproperties)
          iterate(parent + k + '.', items[k].subproperties);
        else out[parent + k] = 1;
      });
    }
    iterate('', px);

    return out;
  }
};
function rename(property, name, value, target) {
  target[property.marker] = value;
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
  if(exists(min)) this.min = parseInt(min, 10);
  if(exists(max)) this.max = parseInt(max, 10);
  this.isArray = isArray;
  this.length = properties.length;
  this.source = source;
  Object.defineProperty(this, 'copy', { value: function (obj, handlers) {
    return Propex.prototype.copy.call(this, obj, handlers);
  }});
  this.copy.handlers = {};

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
      var min = this.readPropertyName(true) || undefined;
      if(this.remaining > 0 && this.peek(1)===':') this.move(1);
      var max = this.readPropertyName(true) || undefined;
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
  this.message = message;
  this.position = ctx.position;
  this.character = ctx.current;
}
ParseError.prototype = Error.prototype;

module.exports = Propex;
Object.defineProperty(module.exports, 'cached', { get: function () {
  return Object.keys(cache);
} });

