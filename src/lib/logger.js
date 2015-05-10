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
	// Get a handle on the logfile
	var log = this.getLogFile( logfile );

	// If it's an existing file, validate our key first
	if ( 'append' === log[1] ) {
		var valid = this.validateKey( log[0], key );
		if ( ! valid ) {
			return 'key_err';
		}
	}

	// Store our log reference
	this.logDescriptor = log[0];

	// Parse data
	this.parse( log[0], key );

	// Return the current instance
	return this;
};

/**
 * Get a handle to a logfile on the system.
 *
 * @param {String} logfile Path to read
 *
 * @returns {Array} [ File Descriptor, Status ] Status can be 'empty' or 'append'
 */
Logger.prototype.getLogFile = function( logfile ) {
	// File descriptor
	var fd, status;

	try {
		fd = fs.openSync( logfile, 'r+' );
		status = 'append';
	} catch ( e ) {
		// The file doesn't exist, so create it first, then open it.
		fd = fs.openSync( logfile, 'w+' ); // The w+ flag will truncate existing data, so we only use this for _creating_ a logfile
		status = 'empty';
	}

	return [fd, status];
};

/**
 * The hashed key is stored as the prefix to the encrypted file.
 *
 * For reference, the encrypted log is of the format:
 * $0123456789$8d94109748d6156d5ee0a942d1dc510834016c43eea121128bbd4c49c0eafaca538a1aa39062ee3399a25fb364783dba7a18d5fbe16c71c507562b532e5a6e2f$A5fWQsdfjqweRSd234sadasFWEras...
 *  salt       hashed secret                                                                                                                    encrypted logfile
 *
 *  @param {Number} fd     File Descriptor
 *  @param {String} secret Passkey
 *
 *  @returns {Boolean}
 */
Logger.prototype.validateKey = function( fd, secret ) {
	// Queue our buffers
	var saltBuffer = new Buffer(10),
		secretBuffer = new Buffer(128);

	// Get the salt, starting from the beginning of the file and skipping the leading $
	fs.readSync( fd, saltBuffer, 0, 10, 1 );
	var salt = saltBuffer.toString();

	// Get the hashed secret
	fs.readSync( fd, secretBuffer, 0, 128, 12 );
	var hashed = secretBuffer.toString();

	var expectedHash = util.createHash( secret, salt );

	return hashed === expectedHash;
};

/**
 * Decrypt the data contained within the log.
 *
 * @param {Number} fd  File descriptor
 * @param {String} key Passkey
 *
 * @returns {Boolean}
 */
Logger.prototype.parse = function( fd, key ) {
	// Queue our buffers
	var saltBuffer = new Buffer(10);

	// Get the salt, starting from the beginning of the file and skipping the leading $
	fs.readSync( fd, saltBuffer, 0, 10, 1 );
	var salt = saltBuffer.toString();

	// Read the filecontents into a large buffer
	var fileBuffer = new Buffer(0);

	// Set up some intermediate variables
	var intermediateBuffer, // Don't initialize, we flush on each loop
		position = 141,     // Account for salt, hash, and $ characters - 1 + 10 + 1 + 128 + 1 = 141
		bytesRead;

	do {
		intermediateBuffer = new Buffer(128);
		bytesRead = fs.readSync( fd, intermediateBuffer, 0, 128, position );
		intermediateBuffer = intermediateBuffer.slice( 0, bytesRead );

		// Concatenate everything we've read thus far
		var oldBuffer = new Buffer( fileBuffer );
		fileBuffer = Buffer.concat( [ oldBuffer, intermediateBuffer ] );

		// Increment the position
		position += 128;
	} while ( 128 === bytesRead );

	var encrypted = fileBuffer.toString();

	try {
		this.logData = util.decryptData( key, encrypted );
		return true;
	} catch ( e ) {}

	// If we threw an exception, make sure we surface the error.
	return false;
};

/**
 * Add an entry to the log.
 *
 * If the entry is invalid, this function returns false.
 *
 * @param {Entry} entry
 *
 * @returns {Boolean}
 */
Logger.prototype.append = function( entry ) {

};

/**
 * Export the module
 */
module.exports = Logger;