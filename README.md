[![Build Status](https://travis-ci.org/williamkapke/propex.svg?branch=master)](https://travis-ci.org/williamkapke/propex)<br>
Checkout [propex.org](http://propex.org) for a live demo!

[propex](https://github.com/williamkapke/propex) expressions are strings that
describe how you want to interact with an object.

Sound vague? That's intentional.

A Propex object provides an Abstract Syntax Tree (AST) of the expression parsed
from the string. [What you choose to do with that AST](#what-is-this-for) is
completely up-to-you.

##How about an example...
You can make expressions like this:
```javascript
var Px = require('propex');
var px = Px("[{_id>id,name,skill}]0:3");
```
...and then _maybe_ use it to [copy/transform](#lets-be-picky-very-picky) some data, like this:
```javascript
var users = [
  { _id:"4e7e98", name:"Tom", skill:"nodejs" },
  { _id:"d8cc60", name:"William" },
  { _id:"03f5c2", name:"Mike", skill:"design" },
  { _id:"f1d2c9", name:"Gareth", skill:"marketing" }
];
console.log(px.copy(users));
//[ { id: '4e7e98', name: 'Tom', skill: 'nodejs' },
//  { id: 'd8cc60', name: 'William', skill: undefined },
//  { id: '03f5c2', name: 'Mike', skill: 'design' } ]
```


## What is this for?
- [Deep Copying Objects](#lets-be-picky-very-picky)
- [Validating JSON objects](https://github.com/williamkapke/allow)
- Specifing batch objects that retrieved from web services.
- Specifing columns returned from a database- and even that sub tables to be joined and merged

##Syntax
Ok, the technical syntax above isn't super simple to understand.

It is ment to look JSON-like:
- Objects use {}
- Arrays use []

We borrow from python a bit to indicate Array ranges: 5:7<br>
We borrow the '?' concept from regular expressions to indicate an item is optional.<br>
We borrow the '>' from the unix command line to suggest redirection.<br>

### Objects
Use curly braces `{}` to begin and end an object definition. Create a comma separated
list of property names between them. You can follow it with a
[meta markers](#meta-markers--modifiers) if you like and then optionally use a
'?' to flag it as optional.

```javascript
//An object that must have a `username` and `password`.
//Optionally `dob` and `height`.
// ...and mark `dob` with `birth_date`
var px = Px("{username,password,dob>birth_date?,height?}")
```

### Arrays
Arrays use the square brace `[]` syntax. To define a sub-propex that you want
applied to the items of the array, place an object or array definition inside
the braces. If you want to define something different for specific indices,
just create a comma separated list of definitions (like you would for an object), but
use the the index number instead of a property name. The indices can even be
followed it with a [meta marker](#meta-markers--modifiers) and the '?' optional flag.

Additionally, just after the closing ']', you can add `min:max` numbers.

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
  Date: function(property, name, value, target) {
    target[name] = new Date(value)
  },
  Number: function(property, name, value, target) {
    target[name] = parseFloat(value);
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
A [propex](http://williamkapke.github.com/propex) object has a `recurse(callback[, context])`
function iterates over the propex calling the callback for each item.

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

# Technical definition
```
PROPERTYGROUP / ARRAYGROUP
PROPERTYGROUP = '{' *PROPERTIES '}'
ARRAYGROUP    = '[' [PROPERTYGROUP] / [INDEXITEMS] / *(PROPERTYGROUP 1*(',' INDEXITEMS) ']' [QUANTITY]
PROPERTIES    = PROPERTY *(',' PROPERTY)
INDEXITEMS    = INDEXITEM *(',' INDEXITEM)
PROPERTY      = 1*(ALPHA / DIGIT) [MARKER] [ARRAYGROUP / PROPERTYGROUP] [OPTIONAL]
INDEXITEM     = DIGIT [MARKER] [ARRAYGROUP / PROPERTYGROUP] [OPTIONAL]
QUANTITY      = DIGIT / (MIN ':') / (':' MAX) / (MIN ':' MAX)
MARKER        = ('$' / '>') *(ALPHA / DIGIT)
OPTIONAL      = '?'
MIN           = DIGIT
MAX           = DIGIT
```
...simple right?


## License

The MIT License (MIT)
Copyright (c) 2012-2014 William Kapke

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
