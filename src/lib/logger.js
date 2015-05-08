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
	crypto = require( 'crypto' );

/**
 * Module semi-globals
 */
var security_key, log_path, log = {};

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
	verify_file( log_path );
}

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