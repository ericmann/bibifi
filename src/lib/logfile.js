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
	zlib = require( 'zlib' ),
	crypto = require( 'crypto' ),
	stream = require( 'stream' ),
	nUtil = require( 'util' ),
	_ = require( 'lodash' ),
	util = require( './util' ),
	LogMeta = require( './logmeta' ),
	Entry = require( './entry' );

/**
 * Useful constants for encryption
 */
var algorithm = 'aes-128-cbc';

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

}

/**
 * Pull the log file in to a buffer.
 *
 * The file is an encrypted GZip string, so we first decrypt, then we decompress, then we populate a buffer.
 *
 * @returns {Promise}
 */
LogFile.prototype.read = function() {
	var logFile = this;

	return new Promise( function( resolve, reject ) {
		try {
			fs.statSync( logFile.path );

			var decipher = crypto.createDecipher( algorithm, logFile.passkey ),
				unzip = zlib.createGunzip();

			var dataStream;
			try {
				dataStream = fs.createReadStream( logFile.path )
					.pipe( decipher )
					.pipe( unzip );

			} catch ( e ) {
				console.log( e );
				return util.invalid();
			}

			var dataBuffers = [];

			dataStream.on( 'readable', function() {
				var buff;
				while( null !== ( buff = dataStream.read() ) ) {
					dataBuffers.push( buff );
				}
			} );

			dataStream.on( 'end', function() {
				// Store the entire buffer for later
				logFile.dataBuffer = Buffer.concat( dataBuffers );

				// We have a buffer, let's get our salt and whatnot
				logFile.newFile = false;

				logFile.getMeta();

				// Continue
				resolve();
			} );
		} catch ( e ) {
			// No file exists! Populate defaults!
			logFile.newFile = true;
			logFile.salt = util.randomString( 10 );
			logFile.meta = new LogMeta;

			// Continue
			resolve();
		}

	} );
};

/**
 * Write the log buffer to disk.
 *
 * @returns {Promise}
 */
LogFile.prototype.write = function() {
	var cipher = crypto.createCipher( algorithm, this.passkey ),
		gzip = zlib.createGzip(),
		logFile = this;

	return new Promise( function( fulfill, reject ) {
		var outputStream = fs.createWriteStream( logFile.path ),
			bufferStream = new stream.PassThrough();

		bufferStream.end( logFile.dataBuffer );
		bufferStream.pipe( gzip )
			.pipe( cipher )
			.pipe( outputStream );

		// Make sure the file is finished writing before we continue
		outputStream.on( 'close', function() {
			fulfill();
		} );
	} );
};

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
 * @returns {String}
 */
LogFile.prototype.getSalt = function() {
	if ( ! this.salt ) {
		// If it's a new file, create a salt and return it
		if ( this.newFile ) {
			this.salt = util.randomString( 10 );
		}
		// Otherwise, grab the salt from the logfile
		else {
			var saltBuffer = this.dataBuffer.slice( 1, 11 );

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
	var secretBuffer = this.dataBuffer.slice( 12, 140 );

	// Get the hashed secret
	var hashed = secretBuffer.toString();

	// Recreate the expected hash
	var expected = util.createHash( this.passkey, salt );

	return hashed === expected;
};

/**
 * Read the meta index from the header of the logfile.
 *
 * @returns {Number}
 */
LogFile.prototype.metaPointer = function() {
	if ( null === this.metaIndex ) {
		var indexBuffer = this.dataBuffer.slice( 141, 149 );

		var indexString = indexBuffer.toString();
		this.metaIndex = parseInt( indexString, 16 );
	}

	return this.metaIndex;
};

/**
 * Either get the meta from the logfile or create a new meta array.
 *
 * @returns {LogMeta}
 */
LogFile.prototype.getMeta = function() {
	if ( null === this.meta ) {
		if ( this.newFile ) {
			this.meta = new LogMeta;
		}
		// Pull our meta from the file
		else {
			// Queue an empty buffer to store our meta
			var metaBuffer = this.dataBuffer.slice( this.metaPointer() );

			// Load our meta
			var metaString = metaBuffer.toString();
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
 *
 * @returns {Promise}
 */
LogFile.prototype.close = function() {
	if ( this.newFile ) {
		// Collect our data variables
		var salt = this.salt,
			hashed = util.createHash( this.passkey, this.salt ),
			metaIndex, entries = [], metaInfo;

		// First, figure out how long our entries will be
		for ( var i = 0, l = this.newEntries.length; i < l; i ++ ) {
			entries.push( this.newEntries[ i ].toString( this ) );
		}
		entries = entries.join( '$' );

		// Update the meta length
		var metaIndexBuffer = new Buffer( 4 );
		metaIndex = 1 + 10 + 1 + 128 + 1 + 8 + 1 + entries.length + 1;
		metaIndexBuffer.writeUInt32BE( metaIndex, 0 );
		metaIndex = metaIndexBuffer.toString( 'hex' );

		// Get our meta info
		metaInfo = this.meta.toString();

		var output = nUtil.format( '$%s$%s$%s$%s$%s', salt, hashed, metaIndex, entries, metaInfo );
		//                           salt
		//                              hashed
		//                                 metaIndex
		//                                    entries
		//                                       metaInfo

		// Create our databuffer
		this.dataBuffer = new Buffer( output );

		return this.write();
	} else {
		if ( this.newEntries.length > 0 ) {
			var entries;

			// Original meta index
			var startWrite = this.metaPointer();

			// Truncate the section with our meta information so we can overwrite
			fs.ftruncateSync( this.fd, startWrite );

			// Now, figure out how long our entries will be
			var newEncrpytedEntries = [];
			for ( var i = 0, l = this.newEntries.length; i < l; i++ ) {
				var entry = this.newEntries[ i ],
					entryString = entry.toString( this );

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

/**
 * Get all entries from the log
 *
 * @param {Array}   visitors Array of [name,type] sub-arrays
 *
 * @returns {[Entry]}
 */
LogFile.prototype.entriesForVisitors = function( visitors ) {
	var entries = [],
		i, l;

	// First, verify we have an accurate query
	var valid = true,
		log = this; // Safety first within the loop!

	// Build lists of guests and employees
	var employees = [],
		guests = [];

	for ( i = 0, l = visitors.length; i < l; i++ ) {
		var visitor = visitors[ i ];

		// Get the ID of the name from the dictionary
		var visitor_id = log.meta.visitorID( visitor[0] );

		switch( visitor[1] ) {
			case 'E':
				if ( ! _.contains( log.meta.activeEmployees, visitor_id ) && ! _.contains( log.meta.inactiveEmployees, visitor_id ) ) {
					valid = false;
				} else {
					employees.push( visitor[0] );
				}
				break;
			case 'G':
				if ( ! _.contains( log.meta.activeGuests, visitor_id ) && ! _.contains( log.meta.inactiveGuests, visitor_id ) ) {
					valid = false;
				} else {
					guests.push( visitor[0] );
				}
				break;
			default:
				valid = false;
		}
	}

	if ( ! valid ) {
		return entries;
	}

	// Now, we iterate through all of the log entries, skipping any not for our visitors
	var entryBuffer = this.dataBuffer.slice( 150, this.metaIndex - 1 );

	var entryBuffers = util.splitBuffer( entryBuffer, '$' );

	for ( i = 0, l = entryBuffers.length; i < l; i++ ) {
		var entry = entryBuffers[ i ];

		// Parse our entry
		entry = Entry.prototype.parse( entry.toString(), this );

		// If this is a good entry, let's keep it
		if ( ( 'E' === entry.type && _.contains( employees, entry.name ) ) || ( 'G' === entry.type && _.contains( guests, entry.name ) ) ) {
			entries.push( entry );
		}
	}

	// Return our collection
	return entries;
};

/**
 * Get all entries for a specific visitor from the log.
 *
 * @param {String} name
 * @param {String} type
 *
 * @returns {[Entry]}
 */
LogFile.prototype.entriesForVisitor = function( name, type ) {
	var entries = [];

	// First, verify we have an accurate query
	var valid = false;
	switch( type ) {
		case 'E':
			valid = _.contains( this.meta.activeEmployees, name ) || _.contains( this.meta.inactiveEmployees, name );
			break;
		case 'G':
			valid = _.contains( this.meta.activeGuests, name ) || _.contains( this.meta.inactiveGuests, name );
			break;
	}

	if ( ! valid ) {
		return entries;
	}

	// Now, we iterate through all of the log entries, skipping any not for our visitor
	var bufferLength = this.metaIndex - 150 - 1,
		entryBuffer = new Buffer( bufferLength );

	fs.readSync( this.fd, entryBuffer, 0, bufferLength, 150 );
	var entryBuffers = util.splitBuffer( entryBuffer, '$' );
	for ( var i = 0, l = entryBuffers.length; i < l; i++ ) {
		// Decrypt our buffer
		var encrypted = entryBuffers[i].toString( 'utf8' ),
			encryptedBuffer = new Buffer( encrypted, 'hex' );

		var decrypted;
		try {
			decrypted = decrypt( encryptedBuffer, this.passkey );
		} catch ( e ) {
			return entries;
		}

		// Parse our entry
		var entry = Entry.prototype.parse( decrypted.toString(), this );

		// If this is a good entry, let's keep it
		if ( name === entry.name ) {
			entries.push( entry );
		}
	}

	// Return our collection
	return entries;
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