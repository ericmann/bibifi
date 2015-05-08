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
 * Create a random hex string.
 *
 * @param {Number} len Length of the string to create
 *
 * @returns {string}
 */
function randomValueHex( len ) {
	return crypto.randomBytes( Math.ceil( len / 2 ) )
		.toString( 'hex' ) // convert to hexadecimal format
		.slice( 0, len );   // return required number of characters
}

/**
 * Make sure the .derrick.d file exists. If not, create it.
 *
 * @param {String} filePath
 */
function verify_file( filePath ) {
	if ( ! fs.existsSync( filePath ) ) {
		fs.writeFileSync( filePath, '', { flag: 'wx' } );
	}
}

/**
 * Export the module
 */
module.exports = {
	randomString: randomValueHex,

	verifyFile: verify_file
};