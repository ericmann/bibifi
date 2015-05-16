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
	crypto = require( 'crypto' ),
	util = require( './util' );

/**
 * Useful constants for encryption
 */
var algorithm = 'aes-256-cbc',
	inputEncoding = 'ascii',
	outputEncoding = 'hex';

/**
 * Module container
 *
 * @constructor
 */
function Util() {}

/**
 * Create a random hex string.
 *
 * @param {Number} len Length of the string to create
 *
 * @returns {string}
 */
Util.prototype.randomString = function( len ) {
	return crypto.randomBytes( Math.ceil( len / 2 ) )
		.toString( 'hex' ) // convert to hexadecimal format
		.slice( 0, len );   // return required number of characters
};

/**
 * Create a hash of a secret key.
 *
 * @param {String}           secret
 * @param {String|Undefined} salt
 *
 * @return {String}
 */
Util.prototype.createHash = function( secret, salt ) {
	if ( undefined == salt ) {
		// Get a random salt
		salt = this.randomString( 10 );
	}

	var hasher = crypto.createHmac( 'sha512', salt );

	hasher.update( secret );

	return hasher.digest( 'hex' );
};

/**
 * Encrypt some data with a set password.
 *
 * We will create a secure hash of our password with a random, 10-character salt. This salt will be prepended to the password
 * when we encrypt our data.
 *
 * @param {String}        pass_key
 * @param {String|Object} data
 *
 * @returns {String}
 */
Util.prototype.encryptData = function( pass_key, data ) {
	if ( typeof data === 'object' ) {
		data = JSON.stringify( data );
	}

	// Create a cipher object to which we'll add data.
	var cipher = crypto.createCipher( algorithm, pass_key );

	// Encrypt our information
	var ciphered = cipher.update( data, inputEncoding, outputEncoding );

	ciphered += cipher.final( outputEncoding );

	// Return our coded output
	return ciphered;
};

/**
 * Decrypt some data with a set password.
 *
 * We expect the data to be passed in the format:
 *   `salt::hashed_password::encrypted_data`
 *
 * The salt will be pre-pended to the plaint-text password and used as the pass key for the decryption algorithm.
 *
 * @param {String} pass_key
 * @param {String} ciphertext
 *
 * @returns {Object}
 */
Util.prototype.decryptData = function( pass_key, ciphertext ) {
	// Create a decipher object
	var decipher = crypto.createDecipher( algorithm, pass_key );

	// Decipher our information
	var deciphered = decipher.update( ciphertext, outputEncoding, inputEncoding );

	// Get our decoded data
	deciphered += decipher.final( inputEncoding );

	// Return our decoded object
	return JSON.parse( deciphered );
};

/**
 * Print an error message.
 */
Util.prototype.invalid = function() {
	process.stdout.write( 'invalid' );
	process.exit( 255 );
};

/**
 * Ascending integer sort tool.
 *
 * @param {Number} a
 * @param {Number} b
 *
 * @returns {number}
 */
Util.prototype.numOrderA = function( a, b ) {
	return a - b;
};

/**
 * Descending integer sort tool.
 *
 * @param {Number} a
 * @param {Number} b
 *
 * @returns {number}
 */
Util.prototype.numOrderD = function( a, b ) {
	return b - a;
};

/**
 * Find the index of an element in a buffer.
 *
 * @param {Buffer} buffer
 * @param {*}      search
 * @param {Number} [offset]
 *
 * @returns {Number}
 */
Util.prototype.bufferIndexOf = function( buffer, search, offset ) {
	offset = offset || 0;

	var m = 0,
		position = -1;

	for ( var i = offset; i < buffer.length; i++ ) {
		if ( buffer[i] == search[m] ) {
			if ( -1 == position ) {
				position = i;
			}
			++m;

			if ( m == search.length ) {
				break;
			}
		} else {
			position = -1;
			m = 0;
		}
	}

	if ( position > -1 && buffer.length - position < search.length ) {
		return -1;
	}

	return position;
};

/**
 * Split a buffer based on a delimeter that appears in the buffer.
 *
 * @param {Buffer} buffer
 * @param {String} delimiter
 *
 * @return {[Buffer]}
 */
Util.prototype.splitBuffer = function( buffer, delimiter ) {
	// Container for split-up lines.
	var lines = [];

	// Some useful variables
	var search = -1;

	// Make our delimiter a buffer as well
	var delimiterBuffer = new Buffer( delimiter );

	while ( ( search = this.bufferIndexOf( buffer, delimiterBuffer ) ) > -1 ) {
		lines.push( buffer.slice( 0, search ) );
		buffer = buffer.slice( search + delimiterBuffer.length, buffer.length );
	}

	if ( buffer.length ) {
		lines.push( buffer );
	}

	// Return our split up buffer
	return lines;
};

/**
 * Export the module
 */
module.exports = new Util;