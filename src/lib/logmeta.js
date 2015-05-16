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
var _ = require( 'lodash' );

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
	var parts = serialized.split( '||' );

	// Create a new container
	var meta = new LogMeta;

	// Get the latest timestamp
	var time = parseInt( parts[0], 10 );
	meta.time = isNaN( time ) ? 0 : time;

	// Get employee info
	var employees = JSON.parse( parts[1] );
	meta.activeEmployees = employees[0];
	meta.inactiveEmployees = employees[1];

	// Get guest info
	var guests = JSON.parse( parts[2] );
	meta.activeGuests = guests[0];
	meta.inactiveGuests = guests[1];

	// Get location data
	meta.locations = JSON.parse( parts[3] );

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
			inactive = _.remove( inactive, function( i ) { return i === name } );

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
			inactive = _.remove( inactive, function( i ) { return i === name } );

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
			active = _.remove( active, function( i ) { return i === name } );

			// Update
			this.activeEmployees = active;
			this.inactiveEmployees = _.uniq( inactive );
			break;
		case 'G':
			active = this.activeGuests;
			inactive = this.inactiveGuests;

			// Update the arrays
			inactive.push( name );
			active = _.remove( active, function( i ) { return i === name } );

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

	return this.time + '||' + JSON.stringify( employees ) + '||' + JSON.stringify( guests ) + '||' + locations;
};

/**
 * Export the module
 *
 * @type {LogMeta}
 */
module.exports = LogMeta;