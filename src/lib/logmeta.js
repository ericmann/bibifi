/**
 * Secure logging mechanism
 *
 * @author Eric Mann <eric@eamann.com>
 *
 * MIT License.
 */

'use strict';

/**
 * Module dependencies
 */
var _ = require( 'lodash' ),
	util = require( './util' );

/**
 * Log meta information
 *
 * @constructor
 */
function LogMeta() {
	this.time = 0;
	this.activeVisitors = [];
	this.inactiveVisitors = [];
	this.locations = {};
	this.dictionary = [];
}

/**
 * Load in a serialized meta object.
 *
 * @param {String} serialized
 */
LogMeta.prototype.load = function( serialized ) {
	var parts = serialized.split( '|' );

	// Create a new container
	var meta = new LogMeta;

	// Items are positional, but item 0 is a random salt
	// 0 - salt
	// 1 - time
	// 2 - visitors
	// 3 - locations
	// 4 - dictionary

	// Get the latest timestamp
	var time = parseInt( parts[1], 10 );
	meta.time = isNaN( time ) ? 0 : time;

	// Get employee info
	var visitors = JSON.parse( parts[2] );
	meta.activeVisitors = visitors[0];
	meta.inactiveVisitors = visitors[1];

	// Get location data
	meta.locations = JSON.parse( parts[3] );

	// Get dictionary data
	meta.dictionary = JSON.parse( parts[4] );

	return meta;
};

/**
 * Get a visitor's ID from the dictionary.
 *
 * @param {String} name
 *
 * @returns {Number}
 */
LogMeta.prototype.visitorID = function( name ) {
	var visitor_id;
	if ( -1 === ( visitor_id = this.dictionary.indexOf( name ) ) ) {
		this.dictionary.push( name );
		visitor_id = this.dictionary.length - 1;
	}

	return visitor_id;
};

/**
 * Activate a visitor by adding them to the correct array, if possible
 *
 * @param {String} name
 *
 * @return {Boolean}
 */
LogMeta.prototype.activateVisitor = function( name ) {
	// Get the ID of the name from the dictionary
	var visitor_id = this.visitorID( name );

	var active = this.activeVisitors,
		inactive = this.inactiveVisitors;

	// Update the arrays
	active.push( visitor_id );
	util.remove( inactive, visitor_id );

	// Update
	this.activeVisitors = _.uniq( active );
	this.inactiveVisitors = inactive;

	return true;
};

/**
 * Check whether or not a visitor is active.
 *
 * @param {String} name
 * @param {String} type
 *
 * @returns {Boolean}
 */
LogMeta.prototype.visitorIsActive = function( name, type ) {
	// Get the ID of the name from the dictionary
	var visitor_id = this.visitorID( name );

	return _.contains( this.activeVisitors, visitor_id );
};

/**
 * Deactivate a visitor by removing them from the correct array, if possible
 *
 * @param {String} name
 *
 * @return {Boolean}
 */
LogMeta.prototype.deactivateVisitor = function( name ) {
	// Get the ID of the name from the dictionary
	var visitor_id = this.visitorID( name );

	var active = this.activeVisitors,
		inactive = this.inactiveVisitors;

	// Update the arrays
	inactive.push( visitor_id );
	util.remove( active, visitor_id );

	// Update
	this.activeVisitors = active;
	this.inactiveVisitors = _.uniq( inactive );

	return true;
};

/**
 * Move a visitor from one room to another.
 *
 * @param {String}        name
 * @param {String|Number} from
 * @param {String|Number} to
 *
 * @returns {Boolean}
 */
LogMeta.prototype.updateLocation = function( name, from, to ) {
	// Get the ID of the name from the dictionary
	var visitor_id = this.visitorID( name );

	// Get their current location
	var location = this.locations[ visitor_id ];

	// If they're not where we said they were, err
	if ( from !== location ) {
		return false;
	}

	// Update the location
	this.locations[ visitor_id ] = to;

	return true;
};

/**
 * Serialize our log meta.
 *
 * @returns {String}
 */
LogMeta.prototype.toString = function() {
	var visitors = [ this.activeVisitors, this.inactiveVisitors ],
		locations = JSON.stringify( this.locations ),
		dictionary = JSON.stringify( this.dictionary );

	var data = [
		util.randomString( 6 ),
		this.time,
		JSON.stringify( visitors ),
		locations,
		dictionary
	];

	return data.join( '|' );
};

/**
 * Export the module
 *
 * @type {LogMeta}
 */
module.exports = LogMeta;