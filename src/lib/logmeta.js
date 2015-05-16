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

	return meta;
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
	var active, inactive;
	switch( type ) {
		case 'E':
			if ( _.contains( this.activeGuests, name ) || _.contains( this.inactiveGuests, name ) ) {
				return false;
			}

			active = this.activeEmployees;
			inactive = this.inactiveEmployees;

			// Update the arrays
			active.push( name );
			_.remove( inactive, function( i ) { return i === name } );

			// Update
			this.activeEmployees = _.uniq( active );
			this.inactiveEmployees = inactive;
			break;
		case 'G':
			if ( _.contains( this.activeEmployees, name ) || _.contains( this.inactiveEmployees, name ) ) {
				return false;
			}

			active = this.activeGuests;
			inactive = this.inactiveGuests;

			// Update the arrays
			active.push( name );
			_.remove( inactive, function( i ) { return i === name } );

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
 *
 * @returns {Boolean}
 */
LogMeta.prototype.visitorIsActive = function( name ) {
	var activeEmployee = _.contains( this.activeEmployees, name ),
		activeGuest = _.contains( this.activeGuests, name );

	return activeEmployee || activeGuest;
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
	var active, inactive;
	switch( type ) {
		case 'E':
			active = this.activeEmployees;
			inactive = this.inactiveEmployees;

			// Update the arrays
			inactive.push( name );
			_.remove( active, function( i ) { return i === name } );

			// Update
			this.activeEmployees = active;
			this.inactiveEmployees = _.uniq( inactive );
			break;
		case 'G':
			active = this.activeGuests;
			inactive = this.inactiveGuests;

			// Update the arrays
			inactive.push( name );
			_.remove( active, function( i ) { return i === name } );

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
	// Get their current location
	var location = this.locations[ name ];

	// If they're not where we said they were, err
	if ( from !== location ) {
		return false;
	}

	// Update the location
	this.locations[ name ] = to;

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
		locations = JSON.stringify( this.locations );

	var data = [
		util.randomString( 6 ),
		this.time,
		JSON.stringify( employees ),
		JSON.stringify( guests ),
		locations
	];

	return data.join( '|' );
};

/**
 * Export the module
 *
 * @type {LogMeta}
 */
module.exports = LogMeta;