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
	crypto = require( 'crypto' ),
	nUtil = require( 'util' ),
	util = require( './util' ),
	LogMeta = require( './logmeta' );

/**
 * Useful constants for encryption
 */
var algorithm = 'aes-256-cbc';

/**
 * Logfile container
 *
 * @constructor
 *
 * @param {String} file    File path
 * @param {String} passkey Secret key
 */
function LogFile( file, passkey ) {
	this.path = file;
	this.passkey = passkey;
	this.metaIndex = null;
	this.meta = null;
	this.newEntries = [];

	// Either open the existing log or create a new one
	this.fd = this.open();
}

/**
 * Get a handle on the logfile.
 *
 * Will set an internal flag if it's a new file.
 *
 * @returns {Number} File descriptor
 */
LogFile.prototype.open = function() {
	var fd;

	// Keep track of whether or not we just created this file
	this.newFile = false;

	try {
		fd = fs.openSync( this.path, 'r+' );
	} catch ( e ) {
		fd = fs.openSync( this.path, 'w+' );
		this.newFile = true;
	}

	// Go ahead and queue up the salt and meta
	this.salt = this.getSalt( fd );
	this.getMeta( fd );

	return fd;
};

/**
 * Get the cryptographic salt used to hash the secret key
 *
 * @param {Number} [fd] File descriptor
 *
 * @returns {String}
 */
LogFile.prototype.getSalt = function( fd ) {
	if ( undefined === fd ) {
		fd = this.fd;
	}

	if ( ! this.salt ) {
		// If it's a new file, create a salt and return it
		if ( this.newFile ) {
			this.salt = util.randomString( 10 );
		}
		// Otherwise, grab the salt from the logfile
		else {
			var saltBuffer = new Buffer( 10 );

			// Read in the salt
			fs.readSync( fd, saltBuffer, 0, 10, 1 );
			this.salt = saltBuffer.toString();
		}
	}

	return this.salt;
};

/**
 * Validate the log's secret key against the stored value.
 *
 * @returns {Boolean}
 */
LogFile.prototype.isValidSecret = function() {
	// Always return true for a new file
	if ( this.newFile ) {
		return true;
	}

	// Make sure we have the salt
	var salt = this.getSalt();

	// Queue a buffer
	var secretBuffer = new Buffer( 128 );

	// Get the hashed secret
	fs.readSync( this.fd, secretBuffer, 0, 128, 12 );
	var hashed = secretBuffer.toString();

	// Recreate the expected hash
	var expected = util.createHash( this.secret, salt );

	return hashed === expected;
};

/**
 * Read the meta index from the header of the logfile.
 *
 * @param {Number} [fd] File descriptor
 *
 * @returns {Number}
 */
LogFile.prototype.metaPointer = function( fd ) {
	if ( undefined === fd ) {
		fd = this.fd;
	}

	if ( null === this.metaIndex ) {
		var indexBuffer = new Buffer( 8 );

		fs.readSync( fd, indexBuffer, 0, 8, 141 );

		var indexString = indexBuffer.toString();
		this.metaIndex = parseInt( indexString, 16 );
	}

	return this.metaIndex;
};

/**
 * Either get the meta from the logfile or create a new meta array.
 *
 *  @param {Number} [fd] File descriptor
 *
 * @returns {LogMeta}
 */
LogFile.prototype.getMeta = function( fd ) {
	if ( undefined === fd ) {
		fd = this.fd;
	}

	if ( null === this.meta ) {
		if ( this.newFile ) {
			this.meta = new LogMeta;
		}
		// Pull our meta from the file
		else {
			// Queue an empty buffer to store our meta
			var metaBuffer = new Buffer(0),
				intermediateBuffer,
				position = this.metaPointer( fd ),
				bytesRead;

			do {
				intermediateBuffer = new Buffer( 128 );
				bytesRead = fs.readSync( fd, intermediateBuffer, 0, 128, position );
				intermediateBuffer = intermediateBuffer.slice( 0, bytesRead );

				// Concatenate everything
				var oldBuffer = new Buffer( metaBuffer );
				metaBuffer = Buffer.concat( [ oldBuffer, intermediateBuffer ] );

				// Increment by a chunk
				position += 128;
			} while ( 128 === bytesRead );

			// Decrypt our buffer
			var encrypted = metaBuffer.toString( 'utf8' ),
				encryptedBuffer = new Buffer( encrypted, 'hex' );
			var decryptedMeta = decrypt( encryptedBuffer, this.passkey );

			// Load our meta
			var metaString = decryptedMeta.toString( 'utf8' );
			this.meta = LogMeta.prototype.load( metaString );
		}

	}

	return this.meta;
};

/**
 * Close the logfile by writing any new data.
 *
 * If this is a new logfile, then everything will be written. Otherwise, just new entries and the meta information
 * will be updated
 */
LogFile.prototype.close = function() {
	if ( this.newFile ) {
		// Collect our data variables
		var salt = this.salt,
			hashed = util.createHash( this.passkey, this.salt ),
			metaIndex = '',
			entries = '',
			metaInfo = '';

		// First, figure out how long our entries will be
		var encryptedEntries = [];
		for ( var i = 0, l = this.newEntries.length; i < l; i++ ) {
			var entry = this.newEntries[ i ],
				entryString = entry.toString();

			// Encrypt the entry
			var encrypted = encrypt( new Buffer( entryString, 'utf8' ), this.passkey );
			encryptedEntries.push( encrypted.toString( 'hex' ) );
		}
		entries = encryptedEntries.join( '$' );

		// Update the meta length
		var metaIndexBuffer = new Buffer( 4 );
		metaIndex = 1 + 10 + 1 + 128 + 1 + 8 + 1 + entries.length + 1;
		metaIndexBuffer.writeUInt32BE( metaIndex, 0 );
		metaIndex = metaIndexBuffer.toString( 'hex' );

		// Get our meta info
		metaInfo = this.meta.toString();
		var encryptedMeta = encrypt( new Buffer( metaInfo, 'utf8' ), this.passkey );
		metaInfo = encryptedMeta.toString( 'hex' );

		var output = nUtil.format( '$%s$%s$%s$%s$%s', salt, hashed, metaIndex, entries, metaInfo );
		//                           salt
		//                              hashed
		//                                 metaIndex
		//                                    entries
		//                                       metaInfo

		// Not strictly necessary, but a good safeguard
		fs.ftruncateSync( this.fd, 0 );

		// Write out our new data
		fs.writeSync( this.fd, output, 0 );
	} else {
		if ( this.newEntries.length > 0 ) {
			var entries = '';

			// Original meta index
			var startWrite = this.metaPointer();

			// Truncate the section with our meta information so we can overwrite
			fs.ftruncateSync( this.fd, startWrite );

			// Now, figure out how long our entries will be
			var newEncrpytedEntries = [];
			for ( var i = 0, l = this.newEntries.length; i < l; i++ ) {
				var entry = this.newEntries[ i ],
					entryString = entry.toString();

				// Encrypt the entry
				var encrypted = encrypt( new Buffer( entryString, 'utf8' ), this.passkey );
				newEncrpytedEntries.push( encrypted.toString( 'hex' ) );
			}
			entries = newEncrpytedEntries.join( '$' );

			// Update the meta length
			var newMetaIndexBuffer = new Buffer( 4 );
			metaIndex = startWrite + entries.length + 1;
			newMetaIndexBuffer.writeUInt32BE( metaIndex, 0 );
			metaIndex = newMetaIndexBuffer.toString( 'hex' );

			// Write out our new meta pointer
			fs.writeSync( this.fd, metaIndex, 141 );

			// Get our meta info
			metaInfo = this.meta.toString();
			var encryptedMeta = encrypt( new Buffer( metaInfo, 'utf8' ), this.passkey );
			metaInfo = encryptedMeta.toString( 'hex' );

			var output = nUtil.format( '$%s$%s', entries, metaInfo );

			// Write out our new data
			fs.writeSync( this.fd, output, startWrite - 1 );
		}
	}

	// Close the file
	fs.closeSync( this.fd );
};

/**
 * Close out the file without writing any data.
 */
LogFile.prototype.exit = function() {
	fs.closeSync( this.fd );
};

/***********************************************************/
/*                 Private utility methods                 */
/***********************************************************/

/**
 * Encrypt a buffer of data.
 *
 * @param {Buffer} buffer
 * @param {String} passkey
 *
 * @returns {Buffer}
 */
function encrypt( buffer, passkey ) {
	// Get a cipher
	var cipher = crypto.createCipher( algorithm, passkey );

	// Encrypt
	return Buffer.concat( [ cipher.update( buffer ), cipher.final() ] );
}

/**
 * Decrypt a buffer of data.
 *
 * @param {Buffer} buffer
 * @param {String} passkey
 *
 * @returns {Buffer}
 */
function decrypt( buffer, passkey ) {
	// Get a cipher
	var decipher = crypto.createDecipher( algorithm, passkey );

	// Decrypt
	return Buffer.concat( [ decipher.update( buffer ), decipher.final() ] );
}

/**
 * Export the module
 */
module.exports = LogFile;