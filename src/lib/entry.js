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
var util = require( './util' );

/**
 * Module constructor
 *
 * @constructor
 *
 * @param {Object} raw Raw object/associative array
 */
function Entry( raw ) {
	// Sanitize our raw entries
	this.name = this.sanitizeName( raw.name );
	this.action = this.sanitizeAction( raw.action );
	this.room = this.sanitizeRoom( raw.room );
	this.time = this.sanitizeTime( raw.time );
	this.secret = raw.secret;
	this.logfile = raw.logfile;
}

/**
 * Recover an object from an encoded string.
 *
 * @param {String}  encoded
 * @param {LogFile} log     Logfile from which the data was extracted
 *
 * @returns {Entry}
 */
Entry.prototype.parse = function( encoded, log ) {
	// Extract our encoded data. Encoded strings are of the format:
	// XXY123|123|123
	// The first two characters are random
	// Y is the visitor action (A or L)
	// The first number is a base36-encoded timestamp
	// Second number is a base36-encoded room ID or 'L'
	// Third number is a base36-encoded visitor ID

	var action = encoded[2],
		data = encoded.substr( 3 );

	// Split our data
	data = data.split( '|' );

	// Parse the timestamp
	var time = parseInt( data[0], 36 );

	// Parse the room
	var room = ( 'L' === data[1] ) ? 'L' : parseInt( data[1], 36 );

	// Parse the visitor ID
	var index = parseInt( data[2], 36 ),
		name = log.meta.dictionary[index];

	var raw = {
		'time': time,
		'action': action,
		'room': room,
		'name': name
	};

	return new Entry( raw );
};

/**
 * Sanitize a name entry.
 *
 * @param {String} name
 *
 * @returns {String}
 */
Entry.prototype.sanitizeName = function( name ) {
	if ( undefined === name || null === name ) {
		return '';
	}

	// Make sure we're using a string
	name = name.toString();

	// Remove whitespace
	name = name.trim();

	// Make sure we have only valid (word) characters
	if ( /[^(a-zA-Z)]/gi.test( name ) ) {
		name = '';
	}

	// Proxy to the type sanitization
	var type = name[0];
	type = this.sanitizeType( type );

	name[ 0 ] = type;

	return name;
};

/**
 * Make sure we have a type that's either E or G.
 *
 * @param {String} type
 *
 * @return {String}
 */
Entry.prototype.sanitizeType = function( type ) {
	if ( undefined === type || null === type ) {
		return '';
	}

	// Make sure our type is a string
	type = type.toString();

	// Remove whitespace
	type = type.trim();

	// Upper case
	type = type.toUpperCase();

	// Only E or G
	type = type.replace( /[^(E|G)]/gi, '' );

	// Only one character
	type = type.substr( 0, 1 );

	return type;
};

/**
 * Make sure our room is a positive integer.
 *
 * @param {*} room
 *
 * @returns {String|Number}
 */
Entry.prototype.sanitizeRoom = function( room ) {
	// Use 'L' to represent being in the museum, but not a room
	if ( 'L' === room || null === room || undefined === room ) {
		return 'L';
	}

	// Cast as an integer
	room = parseInt( room, 10 );

	// Make sure we're positive
	room = Math.abs( room );

	return room;
};

/**
 * Make sure our action is either A or L
 *
 * @param {String} action
 *
 * @return {String}
 */
Entry.prototype.sanitizeAction = function( action ) {
	if ( undefined === action || null === action ) {
		return '';
	}

	// Make sure our action is a string
	action = action.toString();

	// Remove whitespace
	action = action.trim();

	// Upper case
	action = action.toUpperCase();

	// Only A or L
	action = action.replace( /[^(A|L)]/gi, '' );

	// Only one character
	action = action.substr( 0, 1 );

	return action;
};

/**
 * Make sure our time is a positive integer.
 *
 * @param {*} time
 *
 * @returns {Number}
 */
Entry.prototype.sanitizeTime = function( time ) {
	// Cast as an integer
	time = parseInt( time, 10 );

	// Make sure we're positive
	time = Math.abs( time );

	return time;
};

/**
 * Check if the object is valid.
 */
Entry.prototype.isValid = function() {
	var valid_museum_entry = '' !== this.name &&
		'' !== this.action &&
		! isNaN( this.time ) && 0 < this.time;

	var valid_room = ! isNaN( this.room ) || 'L' == this.room;

	return valid_museum_entry && valid_room;
};

/**
 * Convert an object to an encoded string.
 *
 * @param {LogFile} log Logfile for which we're encoding the entry
 *
 * @returns {string}
 */
Entry.prototype.toString = function( log ) {
	// Get the ID of the name from the dictionary
	var visitor_id = log.meta.visitorID( this.name );

	// Encode our integer values as base36
	var time = this.time.toString( 36 ),
		room = ( 'L' === this.room ) ? 'L' : this.room.toString( 36 );
	visitor_id = visitor_id.toString( 36 );

	// Encode our data
	var positional = util.randomString( 2 )+ this.action,
		dynamic = [
			time,
			room,
			visitor_id
		];

	return positional + dynamic.join( '|' );
};

/**
 * Export the module.
 *
 * @type {Entry}
 */
module.exports = Entry;