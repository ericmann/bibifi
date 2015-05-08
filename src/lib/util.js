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

	return salt + '::' + hasher.digest( 'hex' );
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
 * Export the module
 */
module.exports = new Util;