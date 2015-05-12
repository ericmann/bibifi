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

/**
 * Module constructor
 *
 * @constructor
 *
 * @param {Object} raw Raw object/associative array
 */
function Query( raw ) {
	// Sanitize our raw entries
	this.logfile = this.sanitizeLogfile( raw.logfile );
	this.query = this.sanitizeQuery( raw.query );
	this.secret = raw.secret;
}

/**
 * Sanitize a logfile entry.
 *
 * @param {String} logfile
 *
 * @returns {String}
 */
Query.prototype.sanitizeLogfile = function( logfile ) {
	if ( undefined === logfile ) {
		return '';
	}

	// Cast as a string
	logfile = logfile.toString();

	// No whitespace
	logfile = logfile.trim();

	// Only valid chars
	logfile = logfile.replace( /[^(a-zA-Z0-9_)]/g, '' );

	return logfile;
};

/**
 * Make sure we have a query that's either S, R, T, or I
 *
 * @param {String} query
 *
 * @return {String}
 */
Query.prototype.sanitizeQuery = function( query ) {
	if ( undefined === query ) {
		return '';
	}

	// Make sure our query is a string
	query = query.toString();

	// Remove whitespace
	query = query.trim();

	// Upper case
	query = query.toUpperCase();

	// Only S, R, T, or I
	query = query.replace( /[^(S|R|T|I)]/gi, '' );

	// Only one character
	query = query.substr( 0, 1 );

	return query;
};

/**
 * Make sure the object is valid
 */
Query.prototype.isValid = function() {
	return '' !== this.logfile &&
			'' !== this.query;
};

/**
 * Export the module
 */
module.exports = Query;