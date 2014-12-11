load('shelly.js');

var t = new Shelly.Tester;

t.it('constructor sets up defaults', function(){
	var c, s;

	c = 'shelly_tests';
	s = new Shelly;

	t.expect
		(s._col === c, 'default collection name is ' + c)
		(s.col === db[c], 'collection poinster is set')
		( s._changes === undefined, '_changes is undefined')
		( Object.keys(s._attributes).length === 0, 'no attributes set')
		( Object.keys(s._query).length === 0, 'no _query set')
		( Object.keys(s._scopeRecord).length === 0, 'no attributes _scopeRecord set');

});

t.it('constructor accepts a collection name', function(){
	var c, s;

	c = 'col_name';
	s = new Shelly(c);

	t.expect
		(s._col === c, 'default collection name is col_name')
		(s.col === db[c], 'collection pointer is set correctly');

});

t.it('_extend can be used to extend objects', function(){
	var s, obj;

	s = new Shelly;

	obj = { a : false };
	s._extend(obj, { a : true, b : true });

	t.expect(obj.a === true && obj.b === true, 'single attribute was set correctly on with extend');

	obj.c = {
		d : true, 
		e : false
	};

	s._extend(obj, { c : { e : true } });

	t.expect(obj.c.e === true, '_expect can do deep merging');

});

t.it('new Shelly(col, {_id : id }) will scope instance to that id', function(){
	var c, s;

	c = 'col';
	s = new Shelly(c, { _id : 1234 });

	t.expect(s._query['_id'] === 1234, 'the id passed in attributes was set into query');

	s = new Shelly(c, { _id : 1234, first_name : 'Stevo' });

	t.expect(s._query.first_name === undefined, 'other attributes passed in constructor other than _id are not added to query');
});

t.it('aliases adds shortcut methods', function(){
	var s = new Shelly;

	t.expect(s.each === s.forEach, 'each is a shortcut for forEach');
});

t.it('_formatQuery will handle formatting queries values into an object', function(){
	var s = new Shelly;

	var id = ObjectId().str;
	var q = s._formatQuery(id);

	t.expect(q._id.str === id, 'passing a string is assumed as an _id string and turned into {_id : id }');

	q = s._formatQuery({ first_name : 'Stephen' });

	t.expect(q.first_name === 'Stephen', 'passing an object just returns the object');

});

t.it('_array returns bool if variable is array', function(){
	var s = new Shelly;

	t.expect
		( s._array([]), '[] is an array')
		( s._array([1, 2]), '[1, 2] is an array')
		( !s._array({}), '{} is not an array' )
		( !s._array(''), '"" is not an aray')
		( !s._array(function(){}), 'function(){} is not an array' );

});

t.it('will will lazy load the collection cursor with _find', function(){
	var s = new Shelly;

	//trigger _find;
	t.expect(s._cursor === undefined, 'cursor is undefined right now');
	s.count();
	t.expect(s._cursor instanceof DBQuery, 'cursor is set and it is DBQuery');
});

t.it('set & unset can be used to update attributes and $set/$unset _changes', function(){
	var s = new Shelly;

	var ns = 'meta.names.first_name';
	var v = 'Stevo';

	s.set(ns, v);
	t.expect(s._changes.$set[ns] === v, "The ns path was set correctly with the correct value");
	t.expect(s._attributes.meta.names.first_name === v, 'the full object path and value have been set!')

	v = 'Testy';
	s.set(ns, v);
	t.expect(s._changes.$set[ns] === v, 'the value already $set in _changes can be overriden');
	t.expect(s._attributes.meta.names.first_name === v, 'the full object path and value have been updated')


	s.unset(ns);
	t.expect(s._changes.$unset[ns] === 1, 'the ns path was correctly set in the $unset key');

	printjson(s._changes);
	t.expect(s._attributes.meta.names.first_name === undefined, 'the previously set first_name attribute has been removed from attrs');


	t.expect(s._changes.$set[ns] === undefined, 'because we called unset on the ns, the $set ns has been removed');

});

t.it('setCol can be used to change the current collection bound to the Shelly instance', function(){
	var c, s;

	c = 'myCol';
	s = new Shelly;
	s.setCol(c);

	t.expect(s._col === c, 'the collection string name was reset correctly');
	t.expect(s.col === db[c], 'the collection pointer is set to the correct db.collection')

});



t.result();


