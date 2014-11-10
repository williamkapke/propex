[propex](http://williamwicks.github.com/propex) expressions are strings that describe how you want to interact with an object.

Sound vague? That's intentional.

A Propex object provides an Abstract Syntax Tree (AST) of the expression parsed from the string. What you choose to do with that AST is limitless.

# Technical definition
```
PROPERTYGROUP / ARRAYGROUP
PROPERTYGROUP	= '{' *PROPERTIES '}'
ARRAYGROUP		= '[' *(PROPERTYGROUP / INDEXITEMS) ']' [QUANTITY]
PROPERTIES      = PROPERTY *(',' PROPERTY)
INDEXITEMS		= INDEXITEM *(',' INDEXITEM)
PROPERTY		= 1*(ALPHA / DIGIT) [MARKER] [ARRAYGROUP / PROPERTYGROUP] [OPTIONAL]
INDEXITEM		= DIGIT [ARRAYGROUP / PROPERTYGROUP] [OPTIONAL]
QUANTITY		= DIGIT / (MIN ':') / (':' MAX) / (MIN ':' MAX)
MARKER			= ('$' / '>') [ALPHANUMERIC]
OPTIONAL		= '?'
MIN				= DIGIT
MAX				= DIGIT
```

...simple right?


##How about an example...
You can make expressions like this:
```javascript
var propex = Propex("{StoreName,Departments[0{Name,Phone,Hours},1{Name,Phone?,Hours?}]1:5?}")
```

When applied to an object for validation, it says it is expecting to find:
```javascript
{
	//required
	"StoreName": "Walmart",

	//Pay close attention to the end of the expression.
	//It says "If it exists, the array must have 1 to 5 items in it.
	"Departments": [

		//the first item (zero) requires Name,Phone, and Hours
		{"Name":"Store Hours", "Phone":"1231231234", "Hours":"6AM-11PM"},

		//the 2nd one only has the name required
		{"Name":"Pharmacy"}
	]
}
```

Notice it doesn't define how to validate the values themselves (like a phone number or email addrss). Propexi only define that objects/arrays should have something or not.


## What is this for?
- [Deep Copying Objects](#lets-be-picky-very-picky)
- [Validating JSON objects](https://github.com/williamwicks/propex-validation)
- Specifing batch objects that retrieved from web services.
- Specifing columns returned from a database- and even that sub tables to be joined and merged

##Syntax
Ok, the technical syntax above isn't super simple to understand.

It is ment to look JSON-like:
- Objects use {}
- Arrays use []

We borrow from python a bit to indicate Array ranges: 5:7

We borrow the '?' concept from regular expressions to indicate an item is optional.

### Objects
```javascript
//an object that must have a `username` and `password`. But optionally `dob` and `height`.
"{username,password,dob?,height?}"
```

### Arrays
Arrays use the [] syntax and can be followed with "min:max?"

```
Example ranges and their meanings:
PPP,               min=  max=   Required
PPP?               min=  max=   Optional
PPP{PPP}?          min=  max=   Required
PPP[PPP]?          min=  max=   Optional
PPP[PPP]5?         min=5 max=   Optional
PPP[PPP]1:5?       min=1 max=5  Optional
```
Examples:
```javascript
//an array is required
"[]"
//no different than above
"[{}]"


//an array that should have up-to 15 items in it
"[]0:15"

//an array that should have objects with and 'id' property
"[{id}]"

//same as above- but item[4] must have a url for some strange reason.
"[{id},4{id,url}]"
```

### Nesting
Ok, without nesting- all of this is really really lame. Targeting nested objects is the entire point!

Nested Object/Array Example:
```javascript
"{name,locations[{address,position,departments[{name,hours,phone},0{name,hours?,phone?}],website,storeid}]}"
```

### Meta Markers
Meta Markers simply mark a property with whatever meta string you want. If you do not
specify a meta string to the right of the `$` or `>`, the meta string will be the
same as the property name.

##Lets be picky... very picky
The simplest of utilities comes along with propex: A "picky" copy and rename utility.

By using a propex to copy another object, you can choose which properties you want
to be copied to the new object. Using markers, you can even specify the name
of destination property to copy to!

### propex.copy(source [,modifiers])
- _**source**_ - The object you want to copy values from.
- _**modifiers**_ - An object with properties that match marker names. If a `meta`
string is found in the `propex` but a corresponding modifier is not found, it will
default to renaming the property to the `meta` string.
- _**returns:**_ The newly composed object 


### Meta Markers & Modifiers
You can use Meta Markers & Modifiers to transform the output of a property. The second
parameter to the copy function, `modifiers`, allows you to specify an object with
matching marker names that will modify the output during the copy process. If a 
modifier matching the meta string is not found, it will default to renaming the property
to the value of the meta string.

Renaming properties:
```javascript
var Px = require("propex");
var data = [
  {_id:"5452fb36c2a72b807d4e7e98"},
  {_id:"5452fb3fbf9df78086d8cc60"},
  {_id:"5452fb45ca6298808f03f5c2"},
  {_id:"5452fb4aab88b68098f1d2c9"}
];

var result = Px('[_id>mongo_id]').copy(data);

console.log(result);
//[ { mongo_id: "5452fb36c2a72b807d4e7e98" },
//  { mongo_id: "5452fb3fbf9df78086d8cc60" },
//  { mongo_id: "5452fb45ca6298808f03f5c2" },
//  { mongo_id: "5452fb4aab88b68098f1d2c9" } ]
```

Using modifiers for type coercion:
```javascript
var Px = require("propex");
var data = {
  id:"670231",
  birth_date:"1986-03-16T08:00:00.000Z"
};

var modifiers = {
  Date: function(property, value, target) {
    target[property.name] = new Date(value)
  },
  Number: function(property, value, target) {
    target[property.name] = parseFloat(value);
  }
};

var result = Px('{id>Number,birth_date>Date}').copy(data, modifiers);

console.log(result);
//{ id: 670231,
//  birth_date: Sun Mar 16 1986 08:00:00 GMT+0000 (UTC) }
```


### Examples
```javascript
var Px = require("propex");
var data = {foo:8, bar: false, baz:{ dog:"bark", cat:[{type:"lion",sound:"rawr"},{type:"house",sound:"meow"}]}};

var propex = Px("{baz}");
var result = propex.copy(data);
console.log(JSON.stringify(result));
//{"baz":{"dog":"bark","cat":[{"type":"lion","sound":"rawr"},{"type":"house","sound":"meow"}]}}

var propex = Px("{baz{}}");
var result = propex.copy(data);
console.log(JSON.stringify(result));
//{"baz":{}}

var propex = Px("{baz{dog}}");
var result = propex.copy(data);
console.log(JSON.stringify(result));
//{"baz":{"dog":"bark"}}

var propex = Px("{baz{cat[{}]}}");
var result = propex.copy(data);
console.log(JSON.stringify(result));
//{"baz":{"cat":[{},{}]}}

var propex = Px("{baz{cat[{sound}]}}");
var result = propex.copy(data);
console.log(JSON.stringify(result));
//{"baz":{"cat":[{"sound":"rawr"},{"sound":"meow"}]}}

var propex = Px("{baz{cat[]3:}}");
var result = propex.copy(data);
console.log(JSON.stringify(result));
//{"baz":{"cat":[{"type":"lion"},{"type":"house"},null,null,null,null]}}

//... rename the `sound` property to `communication`
var propex = Px("{baz{cat[{sound>communication}]}}");
var result = propex.copy(data);
console.log(JSON.stringify(result));
//{"baz":{"cat":[{"communication":"rawr"},{"communication":"meow"}]}}
```

##Examining objects
A [propex](http://williamwicks.github.com/propex) object has a `recurse(obj, events)` function that allows you to examine an object as it is applied to the [propex](http://williamwicks.github.com/propex).

Although the `recurse(obj, events)` uses a concept of *events*- there is no `EventEmitter` involved since I haven't found a case where async eventing was useful and/or desired. If needed a wrapper function would be very easy to create.

### Copy Example
Here is an example taken from the `propex.copy(obj)` utility:
```javascript
var result;
var depth = 0;
var Px = require("propex");
var propex = Px("{baz{cat[{sound}]}}");
var test = {foo:8, bar: false, baz:{ dog:"bark", cat:[{type:"lion",sound:"rawr"},{type:"house",sound:"meow"}]}};
var tabs='\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t';

propex.recurse(test, {
	found: function(property, name, value, context){
		console.log("found",tabs.substr(0, depth), name, value, property.name);
		context[name] = value;
	},
	objectStart: function(property, name, item, context){
		console.log("start",tabs.substr(0, depth++), name);
		var newObj = Array.isArray(item)? [] : {};

		if(!context)
			result = newObj;
		else context[name] = newObj;

		return newObj;
	},
	objectEnd: function(property, name, item, context){
		console.log("end",tabs.substr(0, --depth), name);
	}
});
```

### event: objectStart(property, key, item, context)
Called everytime a sub-object is found and will be recursively examined. Heads up: the sub-object may be an Array!

You must return a context that you want for the sub-items.

### event: objectEnd(property, key, item, context)
Called everytime a sub-object is has finished being examined.

### event: found(property, key, item, context)
Called when a key/value has been found.

### event: missing(property, key, context)
Called when a key/value is missing and the property is not maked as optional.

It will also be called if not optional and the value is an array, but the propex is expecting an object... or vice versa.

## propex.fields()
You can get a (mongo style 'fields' projection)[http://docs.mongodb.org/manual/tutorial/project-fields-from-query-results/#return-specified-fields-only]
by calling the `fields` function of a `Propex` object.

```javascript
var Px = require("propex");
var px = Px("{_id,foo,cat}");

console.log(px.fields());
//{ _id: 1, foo: 1, cat: 1 }
```


# Installation

    $ npm install propex

## License

The MIT License (MIT)
Copyright (c) 2012-2014 William Wicks

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
