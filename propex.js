
//PropertyExpressions are immutable- so lets cache them.
var cache = {};


function Propex(value) {
	if(typeof value !== "string")
		throw new Error("value must be a string");

	var ret = cache[value];
	if(ret) return ret;

	cache[value] = ret = new reader(value);
	return ret;
}
Propex.prototype = {
	toString: function(){
		return this.source;
	},
	copy: function(source){
		var result;
//		var depth = 0;
		this.recurse(source, {
			found: function(property, name, value, context){
//				console.log("found",tabs.substr(0, depth), name, value, property.name);
				context[name] = value;
			},
			objectStart: function(property, name, item, context){
//				console.log("start",tabs.substr(0, depth++), name);
				var newObj = Array.isArray(item)? [] : {};

				if(!context)
					result = newObj;
				else context[name] = newObj;

				return newObj;
			}
//			,objectEnd: function(property, name, item, context){
//				console.log("end",tabs.substr(0, --depth), name);
//			}
		});
		return result;
	},
	recurse: function(obj, events, context){
		var property = { name:null, isOptional:false, subproperties:this };
		return examine(null, obj, property, events, context);
	}
};
function examine(key, item,  property, events, context){
	var subs = property.subproperties;
	if(item == undefined || (subs && typeMismatch(subs.isArray, item))) {
		if(!property.isOptional && events.missing)
			return events.missing(property, key, context);
		return;
	}

	if(subs) {
		var subContext = context;
		if(events.objectStart)
			subContext = events.objectStart(property, key, item, context);
		if(subs.isArray)
			examineArray(item, subs, events, subContext);
		else {
			examineObject(item, subs, events, subContext);
		}

		if(subs.marker && events.marker){
			events.marker(property, key, item, subContext);
		}
		if(events.objectEnd)
			return events.objectEnd(property, key, item, subContext);
	}
	else {
		if(events.found) events.found(property, key, item, context);
	}
}
function examineObject(obj, propex, events, context){
	var pxi = propex.items;
	var keys = Object.keys(pxi);
	for(var i=0;i<keys.length;i++){
		var key = keys[i];
		examine(key, obj[key], pxi[key], events, context);
	}
};
function examineArray(array, propex, events, context){
	var defaultProperty = propex.items["-1"],
		pxItems = propex.items,
		property,
		i;

	for(i=0;i<array.length;i++){
		if(i > propex.max){
			break;
		}
		property = pxItems[i] || defaultProperty;
		if (property == null)
			throw new Error("No Property specifed for item[" + i + "] and no default is specified.");

		examine(i, array[i], property, events, context);
	}
}

function typeMismatch(isArray, data){
	var dataIsArray = Array.isArray(data);
	return (isArray && !dataIsArray) || (!isArray && dataIsArray)
}
//holds info about each property
function Property(name, isOptional, subproperties){
	this.name = name;
	this.isOptional = isOptional;
	this.subproperties = subproperties;
}

function propex(properties, marker, isArray, min, max, source){
	var items = this.items = {};
	//properties
	this.min = min;
	this.max = max;
	this.isArray = isArray;
	this.marker = marker;
	this.length = properties.length;
	if(source) //this only happens at the top level
		this.source = source;

	if (properties) {
		properties.forEach(function(target){
			items[target.name] =  target;
		});
	}
	Object.freeze(this.items);
	Object.freeze(this);
}
propex.prototype = Propex.prototype;


function reader(source) {
	this.source = source;
	this.current = 0;
	this.position = -1;
	this.remaining = source.length;

	var result;
	switch (source[0]) {
		case '{':
			result = this.readPropertyGroup(true);
			break;
		case '[':
			result = this.readArrayGroup(true);
			break;
		default:
			throw new Error("Pattern must start with '{' or '['", "pattern");
	}
	if (this.remaining != 0)
		throw new Error("Unexpected character(s) at the end of the Propex.");

	result.source = source;
	return result;
}
reader.prototype = {
	readPropertyGroup: function(writeSource) {
		//we start here 1 character before a '{'
		this.move(1);
		var props = this.peek(1) == '}' ? [] : this.readProperties();
		this.move(1);

		var marker = null;
		if (this.current == '$')
		{
			marker = this.readNumber();
			this.move(1);
		}
		else marker = null;

		if (this.current != '}')
			throw new ParseError(this, "Unexpected character '" + this.current + "' in Propex.");

		return new propex(props, marker, false, 1, 1, writeSource? this.source : null);
	},
	readProperties: function() {
		if (this.peek(1) == '$') return [];
		var props = [];
		props.push(this.readProperty(this.readPropertyName()));
		while (this.peek(1) == ',')
		{
			this.move(1);
			props.push(this.readProperty(this.readPropertyName()));
		}
		return props;
	},
	readProperty: function(name) {
		var isOptional = false;
		var subproperties = null;
		var c = this.peek(1);
		switch (c) {
			case '{':
				subproperties = this.readPropertyGroup();
				c = this.peek(1);
				break;
			case '[':
				subproperties = this.readArrayGroup();
				c = this.peek(1);
				break;
		}
		if (c == '?')
		{
			isOptional = true;
			this.move(1);
		}
		return new Property(name, isOptional, subproperties);
	},
	readIndexItem: function() {
		return this.readProperty(this.readNumber().toString());
	},
	readNumber: function() {
		var c;

		var len = 0;
		while (true)
		{
			if (++len > this.remaining) break;
			c = this.peek(len);
			if (!isDigit(c)) break;
		}
		len--;
		if (len < 1)
			throw new ParseError(this, "Invalid Propex pattern.");

		var name = this.source.substr(this.position + 1, len);
		this.move(len);
		return parseInt(name, 10);
	},
	readPropertyName: function() {
		var c = this.peek(1);
		if (!isValidFirstChar(c))
			throw new ParseError(this, "Unexpected character '" + c + "' in Propex.");

		var len = 1;
		while (true)
		{
			c = this.peek(++len);
			if (!/\w/.test(c)) break; // [a-zA-Z0-9_]
		}
		len--;
		var name = this.source.substr(this.position + 1, len);
		this.move(len);
		return name;
	},
	readArrayGroup: function(writeSource) {
		//we start here 1 character before a '['
		this.move(1);
		var c = this.peek(1);
		var indexitems = [];
		var marker;

		if (c == '{') {
			indexitems.push(new Property("-1", false, this.readPropertyGroup()));
			c = this.peek(1);
			if (c == ',') {
				this.move(1);
				c = this.peek(1);
			}
		}
		else if (c == '[') {
			indexitems.push(new Property("-1", false, this.readArrayGroup()));
			c = this.peek(1);
			if (c == ',') {
				this.move(1);
				c = this.peek(1);
			}
		}

		if (isDigit(c))
			indexitems.push.apply(indexitems, this.readIndexItems());

		this.move(1);
		if (this.current == '$') {
			marker = this.readNumber();
			this.move(1);
		}
		else marker = null;

		if (this.current != ']')
			throw new ParseError(this, "Unexpected character in pattern.");

		var mm = {
			min:0,
			max:Number.MAX_VALUE
		};
		if (this.remaining > 0) {
			this.readQuantity(mm);
			if (mm.max < mm.min)
				throw new ParseError(this, "max is less than min");
		}
		return new propex(indexitems, marker, true, mm.min, mm.max, writeSource? this.source : null);
	},
	readQuantity: function(mm) {
		var c = this.peek(1);
		if (isDigit(c)) {
			mm.min = mm.max = this.readNumber();
			if (this.remaining == 0) return;
			c = this.peek(1);
		}

		if (c == ':') {
			this.move(1);
			mm.max = this.remaining != 0 && isDigit(this.peek(1)) ? this.readNumber() : Number.MAX_VALUE;
		}
	},
	readIndexItems: function() {
		var props = [];
		props.push(this.readIndexItem());
		while (this.peek(1) == ',') {
			this.move(1);
			props.push(this.readIndexItem());
		}
		return props;
	},
	peek: function(count) {
		if (count > this.remaining)
			throw new ParseError(this, "Unexpected end of pattern.");
		return this.source[this.position + count];
	},
	move: function(count) {
		if (count == 0) return;
		if (count > this.remaining)
			throw new ParseError(this, "Unexpected end of pattern.");

		this.remaining -= count;
		this.position += count;
		this.current = this.source[this.position];
	}
}

//these are only here to provide semantics about their operation
function isAsciiLetter(c) { return /[a-zA-Z]/.test(c); }
function isDigit(c) { return /\d/.test(c); }
function isValidFirstChar(c) { return /[a-zA-Z_]/.test(c); }

function ParseError(ctx, message){
	this.message = message+"\nposition: "+ctx.position+"\ncharacter: '"+ctx.current+"'\n";
}
ParseError.prototype = Error.prototype;

module.exports = Propex;
