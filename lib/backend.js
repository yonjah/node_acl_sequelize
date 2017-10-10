/**
 * Backend Interface.
 *
 * Implement this API for providing a backend for the acl module.
 */
'use strict';

const _        = require('lodash');
const contract = require('./contract');
const dbTasks  = require('./dbTasks');
const defaults = {
	prefix : ''
};

function SequelizeBackend (db, options){
	this.options = _.defaults({}, options, defaults);
	this.db = dbTasks.setup(db, this.options);
	this.Op = this.db.Op || {in: '$in'};
	this.Promise = this.db.Promise;
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
		let res = row && row.value || {};
		keys = Array.isArray(keys) ? keys : [keys];
		res = _.union.apply(_, keys.map(key => res[key] || []));
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
		let perm = false;
		if (bucket.indexOf('allows_') === 0) {
			key    = bucket;
			bucket = 'permissions';
			perm   = true;
		}
		return this.getModel(bucket).findOne({
			where: {key: key.toString()},
			attributes: ['key', 'value']
		}).then(row => {
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
			where: {key: {[this.Op.in]: keys.map(key => key.toString())}},
			attributes: ['key', 'value']
		}).then(rows => {
			return rows.map(row => {
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
		return this.Promise.reduce(transaction, (res, func) => {
			return func().then(() => {});
		}, null).then(res => {
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

		return this.findRow(bucket, key).then(row => {
				if (!row) {
					return [];
				}
				if (bucket.indexOf('allows_') === 0) {
					return this.getPermission(key, row);
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
	union : function sbUnion (bucket, keys, cb){
		contract(arguments)
			.params('string', 'array', 'function')
			.end();

		return this.findRows(bucket, keys)
			.then(rows => {
				if (bucket.indexOf('allows_') === 0) {
					return this.getPermission(keys, rows);
				} else {
					return _.union.apply(_, rows.map(row => {
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

		values = Array.isArray(values) ? values : [values];

		transaction.push(() => {
			return this.findRow(bucket, key)
				.then(row => {
					let update;
					if (bucket.indexOf('allows_') === 0) {
						update = row && row.value || {};
						update[key] = _.union(update[key], values);
						key = bucket;
						bucket = 'permissions';
					} else {
						update = _.union(row && row.value, values);
					}
					return this.getModel(bucket).upsert({
						key,
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

		keys = Array.isArray(keys) ? keys : [keys];

		transaction.push(() => {
			if (bucket.indexOf('allows_') === 0) {
				return this.findRow(bucket).then(row => {
					let update;
					if (!row) {
						return;
					}
					update = row.value;
					keys.forEach(key => {
						update[key] = undefined;
					});
					return row.set('value', JSON.stringify(update)).save();
				});
			} else {
				return this.getModel(bucket)
					.destroy({
						where: {key : {[this.Op.in]: keys}}
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

		values = Array.isArray(values) ? values : [values];

		transaction.push(() => {
			return this.findRow(bucket, key)
				.then(row => {
					let update;
					if (!row) {
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
	}
};

module.exports = SequelizeBackend;
