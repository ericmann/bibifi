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
function Util() {

}

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
 * Make sure a file exists. If not, create it.
 *
 * @param {String} filePath
 */
Util.prototype.verifyFile = function( filePath ) {
	if ( ! fs.existsSync( filePath ) ) {
		fs.writeFileSync( filePath, '', { flag: 'wx' } );
	}
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
 * Validate that a given hash is for a given secret key.
 *
 * @param {String} secret
 * @param {String} hash
 *
 * @return {Boolean}
 */
Util.prototype.validateHash = function( secret, hash ) {
	var hash_parts = hash.split( '::' ),
		salt = hash_parts[0],
		hash_data = hash_parts[1];

	var validate = this.createHash( secret, salt );

	return hash === validate;
};

/**
 * Encrypt some data with a set password.
 *
 * We will create a secure hash of our password with a random, 10-character salt. This salt will be prepended to the password
 * when we encrypt our data.
 *
 * @param {String}        password
 * @param {String|Object} data
 *
 * @returns {String}
 */
Util.prototype.encryptData = function( password, data ) {
	if ( typeof data === 'object' ) {
		data = JSON.stringify( data );
	}

	// Create a salt
	var salt = this.randomString( 10 );

	// Create a security hash of our key we'll use to prepend the output.
	var hash = this.createHash( password, salt ),
		pass_key = salt + password;

	// Create a cipher object to which we'll add data.
	var cipher = crypto.createCipher( algorithm, pass_key );

	// Encrypt our information
	var ciphered = cipher.update( data, inputEncoding, outputEncoding );

	ciphered += cipher.final( outputEncoding );

	// Return our coded output
	return hash + '::' + ciphered;
};

/**
 * Decrypt some data with a set password.
 *
 * We expect the data to be passed in the format:
 *   `salt::hashed_password::encrypted_data`
 *
 * The salt will be pre-pended to the plaint-text password and used as the pass key for the decryption algorithm.
 *
 * @param {String} password
 * @param {String} ciphertext
 *
 * @returns {Object}
 */
Util.prototype.decryptData = function( password, ciphertext ) {
	var cipher_parts = ciphertext.split( '::' ),
		salt = cipher_parts[0],
		data = cipher_parts[2],
		pass_key = salt + password;

	// Create a decipher object
	var decipher = crypto.createDecipher( algorithm, pass_key );

	// Decipher our information
	var deciphered = decipher.update( data, outputEncoding, inputEncoding );

	// Get our decoded data
	deciphered +=  decipher.final( inputEncoding );

	// Return our decoded object
	return JSON.parse( deciphered );
};

/**
 * Print an error message.
 */
Util.prototype.invalid = function() {
	process.stderr.write( 'invalid' );
	process.exit( 255 );
};

/**
 * Export the module
 */
module.exports = new Util;