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
var fs = require( 'fs' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	util = require( './util' );

/**
 * Module semi-globals
 */
var security_key, log_path, entries = [];

/**
 * Module definition
 *
 * @constructor
 *
 * @param {String} key       Security key
 * @param {String} file_path Log path
 */
function Logger( key, file_path ) {
	security_key = key;

	if ( undefined === file_path ) {
		file_path = path.join( process.cwd(), 'log' );
	}
	log_path = file_path;

	// Make sure the log file exists
	util.verifyFile( log_path );
}

/**
 * Fields on the prototype, exposed for testing purposes.
 */

/**
 * List of employees who have been in the museum.
 *
 * @type {Array}
 */
Logger.prototype.employees = [];

/**
 * List of guests who have been in the museum.
 *
 * @type {Array}
 */
Logger.prototype.guests = [];

/**
 * Cache the latest timestamp used by the log.
 *
 * @type {Number}
 */
Logger.prototype.latest_timestamp = 0;

/**
 * Make sure guests and employees are unique in the system.
 *
 * @param {Object} entry
 *
 * @returns {Boolean}
 */
Logger.prototype.validate_entry_type = function( entry ) {
	switch( entry.type ) {
		case 'employee':
			if ( _.contains( this.guests, entry.name ) ) {
				return false;
			}
			break;
		case 'guest':
			if ( _.contains( this.employees, entry.name ) ) {
				return false;
			}
			break;
		default:
			return false;
			break;
	}

	return true;
}

/**
 * Make sure we both sanitize fields and validate our entry is valid before proceeding.
 *
 * @param {Object} entry
 *
 * @returns {Object}
 */
function validate_entry( entry ) {

	// Validate entry type
	if ( ! validate_entry_type( entry ) ) {
		return util.invalid();
	}

	// Sanitize and validate timestamp
	entry.timestamp = parseInt( entry.timestamp, 10 );
	if ( entry.timestamp <= this.latest_timestamp ) {
		return util.invalid();
	}

	// We're good to go!
	return entry;
}

/**
 * Append a log entry to the collection.
 *
 * @param {Object} entry
 */
Logger.prototype.append = function( entry ) {

};

/**
 * Write the current object to the log.
 */
Logger.prototype.write = function() {

};

/**
 * Read from the specified log file.
 *
 * @returns {Object} Returns a status object {status: 'open', data: ... }
 */
Logger.prototype.read = function() {

};

/**
 * Export the module
 */
module.exports = Logger;