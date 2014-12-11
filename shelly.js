function Shelly (col, attributes) {
	col = col || 'shelly_tests';

	if( !(this instanceof Shelly) ){
		return new Shelly(col, attributes);
	}

	//string col name
	this._col = col;

	//pointer to collection
	this.col = db[col];

	//individual record attributes
	this._attributes = attributes || {};
	
	//changes state
	this._changes;

	//current query
	this._query = {};

	//if attributes where passed
	this._scopeRecord();

	//setup the alias methods
	this._aliases();
}

Shelly.prototype = {

		/**
		 * extend object
		 * @param  {Object} obj source Object
		 * @return Object updated
		 */
	 _extend : function(obj) {

		[].slice.call(arguments, 1).forEach(function(source) {
			if (source) {
				for (var prop in source) {
					obj[prop] = source[prop];
				}
			}
		});

		return obj;
	},

	/**
	 * scope the individual record to a query
	 * holding it's own id
	 */
	_scopeRecord : function(){

		if(this._attributes['_id']){
			this._query['_id'] = this._attributes['_id'];
		}

	},

	_aliases : function(){
		this.each = this.forEach;
	},

	/**
	 * format the query, if string is passed than treat
	 * it as an id
	 * @param  {Mixed} query string or object
	 */
	_formatQuery : function(query){
		return (typeof query === 'string' 
			? { _id : new ObjectId(query) }
			: query);
	},

	/**
	 * check if value is an array
	 * @param  {Array} v check value to be an array
	 */
	_array : function(v){
		return v instanceof Array;
	},

	/**
	 * lazy run select if no cursor present
	 */
	_find : function(){
		if(!this._cursor){
			this.find();
		}
	},

	/**
	 * Set the $set, $unset values in this._changes
	 * @param  {String} key  $set or $unset
	 * @param  {String} ns   the full path to change like meta.names.first_name
	 *                       Mongo handles the parsing of the . not Shelly
	 * @param  {Mixed} value value to be $set or $unset
	 * TODO : if $unset then use value = 1 as a boolean to drop it?
	 * TODO : if $set then $unset called with same ns, that ns should be removed
	 * from the other. 
	 * @return {undefined} nothing returned
	 */
	_change : function(key, ns, value){
		var change, opposite_key;
		
		change = this._changes = this._changes || {};
		change[key] = change[key] || {};

		//unset just needs a bool value of 1
		if(key === '$unset'){
			opposite_key = '$set';
			value = 1;
		}
		else{
			opposite_key = '$unset';
			value = value || '';
		}

		//check to see if the exact same ns path has been set 
		//in the opposite operation key so if $set : meta.names.first_name
		//we want to delete $unset : meta.names.first_name
		if(change[opposite_key] && change[opposite_key][ns]){
			delete change[opposite_key][ns]
		}

		change[key][ns] = value;
	},

	/**
	 * given a key like 'meta.names.first_name',
	 * return {
	 *  attrs : this._attributes['meta']['names'], 
	 *  key : 'first_name'
	 * }
	 * @param  {String} ns    object path
	 * @param  {Mixed} value value to set on last section of path
	 * @return {Object} the last path section & the value
	 */
	_getAttrsAndKey : function(ns){
		var key, attrs;

		ns = ns.split('.');
		key = ns.slice(-1).toString();
		
		return {
			key : key, 
			attrs : this.get( ns.slice(0, -1) )
		};

	},

	/**
	 * paves the way to set a value on a deep object
	 * given 'meta.names.first_name' on {},
	 * this will create { meta : { names : {} }}
	 * so that first_name can be set!
	 * @param  {String} ns field.field.field
	 */
	_makePath : function(ns){
		var attrs;
		
		ns = ns.split('.').slice(0, -1);
		attrs = this._attributes;

		ns.forEach(function(n, i){
			var prev = ns[i];
			attrs = attrs[ prev ] ||  (attrs[ prev ] = {});
		});

	},

	/**
	 * reset the cursor, other gb
	 * will go in here later. 
	 */
	_reset : function(){
		//reset the cursor
		this._cursor = undefined;
	},

	/**
	 * set the current collection (usually set from constructor)
	 * @param {String} col collection name
	 */
	setCol : function(col){
		this._reset();
		this._col = col;
		this.col = db[col];
		return this;
	},

	/**
	 * return a representation of the current Shelly instance
	 * @return {[type]} [description]
	 */
	toString : function(){
		var s = "Shelly: " + this._col + " -> " + tojson( this.inspect() );
		return s;
	},

	/**
	 * inspect class state
	 * @return {[type]} [description]
	 */
	inspect : function(){
		return {
			'changes' : this._changes || {},
			'attributes' : this._attributes,
			'query' : this._query,
		}
	},

	/**
	 * reset the current query
	 * @param  {Mixed} query string or object
	 */
	where : function(query){
		if(!query){
			return false;
		}
		this._reset();
		this._query = this._formatQuery(query);
	},

	/**
	 * shortcut to add a $where function
	 * @param  {Function} func  
	 */
	$where : function(func){
		this.where({ $where : func });
	},

	/**
	 * mixin new conditions for the query
	 * TODO use $and : [] to make for re-use of 
	 * fields so you can do ranges
	 * @param  {Mixed} query string or object for query
	 */
	and_where : function(query){
		this._extend(this._query, this._formatQuery(query) );
	},

	/**
	 * shortcut to add a $where function
	 * @param  {Function} func  
	 */
	$and_where : function(func){
		this.and_where({ $where : func });
	},

	/**
	 * return the mongodb cursor
	 */
	cursor : function(){
		return this._cursor;
	},

	/**
	 * run the query with a given projection
	 * @param  {Object} project fields to return
	 */
	project : function(project){
		var proj;

		if(!project){
			return false;
		}

		proj = (this._project = this._project || {});

		if(typeof project === 'object'){
			return proj = project;
		}

		if(typeof project === 'string'){
			project.split(' ').forEach(function(p){
				proj[p] = 1;
			});
		}

		this._project 
	},

	find : function(query, project){

		if(typeof query === 'string'){
			return this.first(query, project);
		}

		this.where(query);
		this.project(project);

		this._cursor = this.col.find(this._query, this._project);
	},

	/**
	 * get the first document that matches the query
	 * @param  {mixed} query   string for id or object for query
	 * @param  {mixed} project "field field field" or { field : 1 }
	 */
	first : function(query, project){
		this.where(query);
		this.project(project);
		//if no records is found make sure to reset attributes to an object
		this._attributes = this.col.findOne(this._query, this._project) || {};
		this._scopeRecord();
	},


	/**
	 * 
	 * @param  {[type]} _do          [description]
	 * @param  {[type]} hydrate [description]
	 * @return {[type]}              [description]
	 */
	forEach : function(_do, hydrate){
		var col, each;
		
		col = this._col;
		this._find();
		hydrate = typeof hydrate === 'undefined' ? true : false;

		if(hydrate){

		}

		each = !hydrate ? _do : function(r){
			_do( new Shelly(col, r) );  
		};

		this._cursor.forEach(each);
	},

	/**
	 * given a ns key like 'meta.names.0.first_name'
	 * return this.attrs['metas']['names']['0']['first_name']
	 * @param  {String} ns 
	 */
	get : function(ns) {
		var undef, attr, attrs;
		
		attrs = this._attributes

		if(!ns){
			return attrs;
		}
		
		ns = this._array(ns) ? ns : ns.split('.');

		while (attrs !== undef && ns[0]){
			attr = attrs[ns.shift()];
			attrs = attr === undef ? undef : attr;
		}
				
		return attrs;
	},

	/**
	 * construct exists query
	 * @param  {String}  ns document key
	 * @return {Object} constructed query
	 */
	_exists : function(ns, flag){
		var obj = {}
		flag = typeof flag === 'undefined' ? true : flag;
		obj[ns] = { $exists : flag };
		return obj;
	},

	/**
	 * same as .find({ ns : { $exists : flag }})
	 * @param  {[String]}  ns document field namespace
	 * @return {Boolean}  flag exists or not?
	 */
	exists : function(ns, flag){
		this.where( this._exists(ns, flag) );
	},

	/**
	 * same as .find({ ns : { $exists : flag }})
	 * @param  {[String]}  ns document field namespace
	 * @return {Boolean}  flag exists or not?
	 */
	and_exists : function(ns, flag){
		this.and_where(this._exists(ns, flag));
	},

	/**
	 * sugar for exists method {{@see exists}}
	 */
	has : function(ns, flag){
		this.exists(ns, flag);
	},

	/**
	 * sugar for and_exists method
	 */
	and_has : function(ns, flag){
		this.and_exists(ns, flag);
	},


	/**
	 * given an ns key like 'metas.name.0.first_name'
	 * set this._attributes['meta']['name'][0]['first_name'] to value
	 * @param {String} ns key
	 * @param {Mixed} value value to set
	 */
	set : function(ns, value){
		var ref;

		this._makePath(ns);

		ref = this._getAttrsAndKey(ns);

		if(!ref.attrs){
			return false;
		}

		this._change('$set', ns, value);

		if( ref.key === '$' && this._array(ref.attrs) ){
			ref.attrs.push(value);
		}
		else{
			ref.attrs[ref.key] = value; 
		}

		return true;
	},

	/**
	 * given an ns key like 'metas.name.0.first_name'
	 * delete this._attributes['meta']['name'][0]['first_name']
	 * @param {String} ns key
	 */
	unset : function(ns){
		var ref;

		ref = this._getAttrsAndKey(ns);

		if(!ref.attrs){
			return false;
		}

		if(ref.attrs[ref.key]){
			delete ref.attrs[ref.key];
		}

		this._change('$unset', ns);

		return true;
	},


	/**
	 * update or create record
	 */
	
	save : function(){
		this.col.save(this._attributes);
	},

	/**
	 * - create a new record (use save)
	 * - batch update records with the query
	 * - 
	 * @param  {[type]} options [description]
	 * @return {[type]}         [description]
	 */
	update : function(options){
		var changes;

		//check for options
		options = this._extend({ upsert : false, multi : false }, options || {});
		
		if(this._changes){
			changes = this._changes;
		}
		else if(this._attributes){
			changes = { $set : this._attributes};
		}

		if(!changes){
			return false;
		}
	
		if(options.debug){
			return printjson({
				query : this._query,
				changes : changes
			});
		}

		this.col.update(this._query, changes, options);

		this._reset();
		//you made the changes so reset
		this._changes = undefined;
	}

};

Shelly.Tester = function(){
	this._log = {};
	this._it = '';
};

Shelly.Tester.prototype = {

	it : function(description, fn){
		this._it = description;
		this._log[description] = { pass : [], fail : [] };
		fn.call(this);
	},

	expect : function(outcome, description){
		var result;

		result = outcome ? 'pass' : 'fail';
		this._log[this._it][result].push(description);
		return this.expect.bind(this);
	},

	result : function(){
		printjson(this._log);
	}

};


//setup all of the cursor methods
[ 'batchSize', 'count', 'explain', 
	'hasNext', 'hint', 'limit', 'map', 
	'max', 'min', 'next', 'objsLeftInBatch', 
	'readPref', 'showDiskLoc','size', 
	'skip', 'snapshot', 'sort'
].forEach(function(method){

	this[method] = function(){
		var cursor, value;

		this._find();
		cursor = this._cursor;

		value = cursor[method].apply( 
			cursor, [].slice.call( arguments, 0) 
		);
		
		if(value instanceof DBQuery){
			return;
		}

		return value;
	};

}, Shelly.prototype);
