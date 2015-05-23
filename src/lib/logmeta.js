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
	this.activeEmployees = [];
	this.inactiveEmployees = [];
	this.activeGuests = [];
	this.inactiveGuests = [];
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
	// 2 - employees
	// 3 - guests
	// 4 - locations
	// 5 - dictionary

	// Get the latest timestamp
	var time = parseInt( parts[1], 10 );
	meta.time = isNaN( time ) ? 0 : time;

	// Get employee info
	var employees = JSON.parse( parts[2] );
	meta.activeEmployees = employees[0];
	meta.inactiveEmployees = employees[1];

	// Get guest info
	var guests = JSON.parse( parts[3] );
	meta.activeGuests = guests[0];
	meta.inactiveGuests = guests[1];

	// Get location data
	meta.locations = JSON.parse( parts[4] );

	// Get dictionary data
	meta.dictionary = JSON.parse( parts[5] );

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
 * @param {String} type
 * @param {String} name
 *
 * @return {Boolean}
 */
LogMeta.prototype.activateVisitor = function( type, name ) {
	// Get the ID of the name from the dictionary
	var visitor_id = this.visitorID( name );

	var active, inactive;
	switch( type ) {
		case 'E':
			active = this.activeEmployees;
			inactive = this.inactiveEmployees;

			// Update the arrays
			active.push( visitor_id );
			util.remove( inactive, visitor_id );

			// Update
			this.activeEmployees = _.uniq( active );
			this.inactiveEmployees = inactive;
			break;
		case 'G':
			active = this.activeGuests;
			inactive = this.inactiveGuests;

			// Update the arrays
			active.push( visitor_id );
			util.remove( inactive, visitor_id );

			// Update
			this.activeGuests = _.uniq( active );
			this.inactiveGuests = inactive;
			break;
		default:
			return false;
	}

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

	switch( type ) {
		case 'E':
			return _.contains( this.activeEmployees, visitor_id );
		case 'G':
			return _.contains( this.activeGuests, visitor_id );
			break;
		default:
			return false;
	}
};

/**
 * Deactivate a visitor by removing them from the correct array, if possible
 *
 * @param {String} type
 * @param {String} name
 *
 * @return {Boolean}
 */
LogMeta.prototype.deactivateVisitor = function( type, name ) {
	// Get the ID of the name from the dictionary
	var visitor_id = this.visitorID( name );

	var active, inactive;
	switch( type ) {
		case 'E':
			active = this.activeEmployees;
			inactive = this.inactiveEmployees;

			// Update the arrays
			inactive.push( visitor_id );
			util.remove( active, visitor_id );

			// Update
			this.activeEmployees = active;
			this.inactiveEmployees = _.uniq( inactive );
			break;
		case 'G':
			active = this.activeGuests;
			inactive = this.inactiveGuests;

			// Update the arrays
			inactive.push( visitor_id );
			util.remove( active, visitor_id );

			// Update
			this.activeGuests = active;
			this.inactiveGuests = _.uniq( inactive );
			break;
		default:
			return false;
	}

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
	var employees = [ this.activeEmployees, this.inactiveEmployees ],
		guests = [ this.activeGuests, this.inactiveGuests ],
		locations = JSON.stringify( this.locations ),
		dictionary = JSON.stringify( this.dictionary );

	var data = [
		util.randomString( 6 ),
		this.time,
		JSON.stringify( employees ),
		JSON.stringify( guests ),
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