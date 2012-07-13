[propex](http://williamwicks.github.com/propex) expressions are strings that describe how you want to interact with an object.

Sound vague? That's intentional. Its like describing what a regular expresson does: may things!

A Propex object provides an Abstract Syntax Tree (AST) of the expression parsed from the string. What you choose to do with that AST is limitless.

# Technical definition
	PROPERTYGROUP | ARRAYGROUP
	PROPERTYGROUP	::= '{' + PROPERTIES? MARKER? + '}'
	ARRAYGROUP		::= '[' + (PROPERTYGROUP | INDEXITEMS | PROPERTYGROUP(',' + INDEXITEMS))? MARKER? + ']' QUANTITY?
	PROPERTIES		::= PROPERTY(',' + PROPERTY)*
	INDEXITEMS		::= INDEXITEM(',' + INDEXITEM)*
	PROPERTY		::= NAME (ARRAYGROUP | PROPERTYGROUP)? OPTIONAL?
	INDEXITEM		::= NUMBER (ARRAYGROUP | PROPERTYGROUP)? OPTIONAL?
	QUANTITY		::= NUMBER | MIN + ':' | ':' + MAX | MIN + ':' + MAX
	MARKER			::= '$' + NUMBER
	OPTIONAL		::= '?'
	MIN				::= NUMBER
	MAX				::= NUMBER
	NUMBER			::= [0-9]+
	
	Example ranges and their meanings:
	PPP,						min=0 max=		Required
	PPP?						min=0 max=		Optional
	PPP{PPP}?					min=0 max=		Required
	PPP[PPP]?					min=0 max=		Optional
	PPP[PPP]5?					min=5 max=5		Optional
	PPP[PPP]1:5?				min=1 max=5		Optional


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
Propex isn't desiged for a specific use, but I've found it useful for:

- Validating JSON objects
- Specifing batch objects that I want retrieved from web services.
- Specifing columns I want returned from a database- and even that I want sub tables joined and merged

##Syntax
Ok, the technical syntax above isn't super simple to understand.

It is ment to look JSON-like:
- Objects use {}
- Arrays use []

We borrow from python a bit to indicate Array ranges: 5:7
We borrow the '?' concept from regular expressions to indicate an item is optional.

### Objects
```javascript
//an object that must have a username and password. But optionally dob and height.
"{username,password,dob?,height?}"
```

### Arrays
Arrays use the [] syntax and can be followed with "min:max?"

```javascript
//an array is required
"[]"
//no different than above
"[{}]"


//an array that should have up-to 15 items in it
"[]0:15"

//an array that should exactly 3 items in it
"[]3"

//an array that should exactly 3 items in it *if it exists at all*
"[]3?"

//an array that should have objects with and 'id' property 
"[{id}]"

//same as above- but item[4] must have a url for some strange reason.
"[{id},4{id,url}]"
```

### Nesting
Ok, without nesting- all of this is really really lame. Nesting is the entire reason for all of this.

```javascript
"{name,primaryLocation,locations[{address,position,departments[{name,hours,phone$0},0{name,hours?,phone?}$1],website,storeid}$1]}$2"
```


### Markers
Markers take the form of $number. They simply mark an object or sub object- the meaning of which is completely implementation specific.

To understand them, I'll tell you why I added them: to extend JSON Serialization of objects.

As a silly example: Say you have the typical *Order* object that has the usual items and their costs. You COULD add another property to the object with the total... or you could 
put a marker in the Propex that flags tells the serializer to call a callback- which injects the total in the serialized JSON.

Or, for data transformation before validation. Say you are reading in some JSON that has:
```javascript
{"Position":{"Longitude":0, "Latitude":0 }}
```

But you need:
```javascript
{"Position":"0,0"}
```

Markers allowed me to signal the serializer to call a callback and transform the value.


# Installation

    $ npm install propex

## License

The MIT License (MIT)
Copyright (c) 2012 William Wicks

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
