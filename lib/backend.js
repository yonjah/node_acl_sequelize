/**
 * Backend Interface.
 *
 * Implement this API for providing a backend for the acl module.
 */
"use strict";

var _        = require('lodash'),
	contract = require('./contract'),
	dbTasks  = require('./dbTasks'),
	Promise  = require('bluebird'),
	defaults = {
		prefix : ''
	};

function SequelizeBackend(db, options){
	this.options = _.defaults({}, options, defaults);
	this.db = dbTasks.setup(db, this.options);
}

SequelizeBackend.prototype = {
	/**
	 * return model for bucket
	 * @param  {string} bucket
	 * @return {Sequlize.model}
	 */
	getModel: function sbGetModel (bucket) {
		return this.db.models[this.options.prefix + bucket];
	},

	/**
	 * return values for permissions bucket
	 * @param  {String[]} key
	 * @param  {Sequelize.row} row
	 * @return {Array}
	 */
	getPermission: function sbGetPermission (keys, row) {
		var res = row && row.value || {};
		keys = Array.isArray(keys) ? keys : [keys];
		res = _.union.apply(_, keys.map(function (key){return res[key] ||[];}));
		return res;
	},

	/**
	 * sbFindRow(bucket, key)
	 *
	 * Find the row for specific bucket.
	 *
	 * @param  {string}   bucket if bucket is allows_* (bucket is permissions and key is bucket value)
	 * @param  {string|number}   key
	 * @return {Promise<Sequelize.Row>}
	 */
	findRow : function sbFindRow (bucket, key){
		var perm = false;
		if (bucket.indexOf('allows_') === 0) {
			key    = bucket;
			bucket = 'permissions';
			perm   = true;
		}
		return this.getModel(bucket).findOne({
			where: {key: key.toString()},
			attributes: ['key', 'value']
		}).then(function (row) {
			if (!row) {
				return null;
			}
			row.value = row.value && JSON.parse(row.value) || (perm ? {} : []);
			return row;
		});
	},

	/**
	 * sbFindRows(bucket, key)
	 *
	 * Find the row for specific bucket.
	 *
	 * @param  {string}   bucket if bucket is allows_* (bucket is permissions and key is bucket value)
	 * @param  {string|number}   key
	 * @return {Promise<Sequelize.Row[]>}
	 */
	findRows : function sbFindRows (bucket, keys){
		if (bucket.indexOf('allows_') === 0) {
			return this.findRow(bucket);
		}
		return this.getModel(bucket).findAll({
			where: {key: {$in: keys.map(function(key){ return key.toString();})}},
			attributes: ['key', 'value']
		}).then(function (rows) {
			return rows.map(function (row) {
				row.value = row.value && JSON.parse(row.value) || [];
				return row;
			});
		});
	},



	/**
	 * sbBegin()
	 *
	 * Begins a transaction.
	 *
	 * @return {Function[]}
	 */
	begin : function sbBegin (){
		// returns a transaction object
		return [];
	},

	/**
	 * sbEnd(transaction, cb)
	 *
	 * @param  {Function[]}   transaction
	 * @param  {Function} cb
	 * @return {Promise}
	 */
	end : function sbEnd (transaction, cb){
		contract(arguments).params('object', 'function').end();
		// Execute transaction
		var i =1 ;
		return Promise.reduce(transaction, function (res, func) {
			var n = i++;
			return func().then(function () {
			});
		}, null).then(function(res){
			return res;
		}).nodeify(cb);
	},


	/**
	 * sbClean(cb)
	 *
	 * Cleans the whole storage.
	 *
	 * @param  {Function} cb
	 * @return {Promise}
	 */
	clean : function sbClean (cb){
		contract(arguments).params('function').end();
		return dbTasks.clean(this.db, this.options).nodeify(cb);
	},


	/**
	 * sbGet(bucket, key, cb)
	 *
	 * Gets the contents at the bucket's key.
	 *
	 * @param  {string}   bucket
	 * @param  {string|number}   key
	 * @param  {Function} cb
	 * @return {Promise}
	 */
	get : function sbGet (bucket, key, cb){
		contract(arguments)
				.params('string', 'string|number', 'function')
				.end();

		var backend = this;

		return this.findRow(bucket, key).then(function (row) {
				if (!row) {
					return [];
				}
				if (bucket.indexOf('allows_') === 0) {
					return backend.getPermission(key, row);
				}
				return row.value;
			}).nodeify(cb);
	},

	/**
	 * sbGet(bucket, key, cb)
	 *
	 * Returns the union of the values in the given keys.
	 *
	 * @param  {string}   bucket
	 * @param  {array}   key
	 * @param  {Function} cb
	 * @return {Promise}
	 */
	union : function sbUnion(bucket, keys, cb){
		contract(arguments)
			.params('string', 'array', 'function')
			.end();

		var backend = this;

		return backend.findRows(bucket, keys)
			.then(function (rows){
				if (bucket.indexOf('allows_') === 0) {
					return backend.getPermission(keys, rows);
				} else {
					return _.union.apply(_, rows.map(function (row) {
						return row.value;
					}));
				}
			}).nodeify(cb);
	},

	/**
	 * sbAdd(transaction, bucket, key, values)
	 *
	 * Adds values to a given key inside a bucket.
	 *
	 * @param  {array} transaction
	 * @param  {string}   bucket
	 * @param  {string|number}   key
	 * @param  {string|number|array} values
	 * @return {Promise}
	 */
	add : function sbAdd (transaction, bucket, key, values){
		contract(arguments)
				.params('object', 'string', 'string|number','string|array|number')
				.end();

		var backend = this;

		values = Array.isArray(values) ? values : [values];

		transaction.push(function () {
			return backend.findRow(bucket, key)
				.then(function (row){
					var update;
					if (bucket.indexOf('allows_') === 0) {
						update = row && row.value || {};
						update[key] = _.union(update[key], values);
						key = bucket;
						bucket = 'permissions';
					} else {
						update = _.union(row && row.value, values);
					}
					return backend.getModel(bucket).upsert({
						key: key,
						value: JSON.stringify(update)
					});
				});
		});
	},

	/**
	 * sbDel(transaction, bucket, keys)
	 * Delete the given key(s) at the bucket
	 *
	 * @param  {array} transaction
	 * @param  {string}	bucket
	 * @param  {string|array} keys
	 * @return {Promise}
	 */
	del : function sbDel (transaction, bucket, keys){
		contract(arguments)
				.params('object', 'string', 'string|array')
				.end();

		var backend = this;
		keys = Array.isArray(keys) ? keys : [keys];

		transaction.push(function () {
			if (bucket.indexOf('allows_') === 0) {
				return backend.findRow(bucket).then(function (row){
					var update;
					if (!row) {
						return;
					}
					update = row.value;
					keys.forEach(function (key){
						update[key] = undefined;
					});
					return row.set('value', JSON.stringify(update)).save();
				});
			} else {
				return backend.getModel(bucket)
					.destroy({
						where: {key : {$in: keys}}
					});
			}
		});
	},

	/**
	 * sbRemove(transaction, bucket, key, values)
	 *
	 * Removes values from a given key inside a bucket.
	 *
	 * @param  {array} transaction
	 * @param  {string}	bucket
	 * @param  {string|number}   key
	 * @param  {string|number|array} values
	 * @return {Promise}
	 */
	remove : function sbRemove (transaction, bucket, key, values){
		contract(arguments)
				.params('object', 'string', 'string|number','string|array|number')
				.end();

		var backend = this;
		values = Array.isArray(values) ? values : [values];

		transaction.push(function () {
			return backend.findRow(bucket, key)
				.then(function (row){
					var update;
					if(!row) {
						return;
					}
					if (bucket.indexOf('allows_') === 0) {
						update = row.value;
						update[key] = _.difference(update[key], values);
					} else {
						update = _.difference(row.value, values);
					}
					row.value = JSON.stringify(update);
					return row.save();
				});
		});
	},
};

module.exports = SequelizeBackend;
