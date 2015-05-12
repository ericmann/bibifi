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
 * Module constructor
 *
 * @constructor
 *
 * @param {String} raw Raw object/associative array
 */
function Entry( raw ) {
	// Sanitize our raw entries
	this.name = this.sanitizeName( raw.name );
	this.type = this.sanitizeType( raw.type );
	this.action = this.sanitizeAction( raw.action );
	this.room = this.sanitizeRoom( raw.room );
	this.time = this.sanitizeTime( raw.time );
	this.secret = raw.secret;
}

/**
 * Sanitize a name entry.
 *
 * @param {String} name
 *
 * @returns {String}
 */
Entry.prototype.sanitizeName = function( name ) {
	// Make sure we're using a string
	name = name.toString();

	// Remove whitespace
	name = name.trim();

	// Make sure we have only valid (word) characters
	name = name.replace( /[^(a-zA-Z)]/gi, '' );

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
 * @returns {Number}
 */
Entry.prototype.sanitizeRoom = function( room ) {
	// Use 'lobby' to represent being in the museum, but not a room
	if ( 'lobby' === room ) {
		return 'lobby';
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
	var valid_museum_entry = ! _.isEmpty( this.name ) &&
		! _.isEmpty( this.type ) &&
		! _.isEmpty( this.action ) &&
		! isNaN( this.time ) && 0 < this.time;

	var valid_room = ! isNaN( this.room ) || 'lobby' == this.room;

	return valid_museum_entry && valid_room;
};

/**
 * Export the module.
 *
 * @type {Entry}
 */
module.exports = Entry;