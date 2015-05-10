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
 */
function Logger() {}

/**
 * Open a logfile using a given key.
 *
 * If the logfile doesn't exist, create it and return at new Logger instance pointing at it.
 * If the logfile exists and the key matches the hash at the beginning of the file, open it (decrypted) and return a new Logger instance.
 * If the key is a mismatch, return the string 'key_err';
 *
 * @param {String} logfile
 * @param {String} key
 *
 * @returns {Logger|String}
 */
Logger.prototype.open = function( logfile, key ) {

};

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

	// Parse entry

	// Validate entry

	// Store the entry
	entries.push( entry );

	// Write the log
	this.write();

	// Exit
	process.exit( 0 );
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