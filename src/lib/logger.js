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
	nUtil = require( 'util' ),
	util = require( './util' );

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
		var valid = false;
		try {
			valid = this.validateKey( log[0], key );
		} catch ( e ) {}

		if ( ! valid ) {
			return 'key_err';
		}

		// Parse existing log
		this.parse( log[0], key );
	}

	// Store our log reference
	this.logDescriptor = log[0];
	this.security_key = key;

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

		// Pre-build our logfile
		this.logData = {
			'employees': { 'known': [], 'active': [] },
			'guests': { 'known': [], 'active': [] },
			'occupants': { 'lobby': {} },
			'locations': {},
			'last': 0
		};
		this.parsed = true;
		this.dirty = false;
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
 * Add a specific visitor to a room/lobby.
 *
 * Expects sanitized data
 *
 * @param {String}        name
 * @param {String|Number} room
 * @param {Number}        time
 */
Logger.prototype.addToRoom = function( name, room, time ) {
	// Make sure the room container exists
	this.logData.occupants[ room ] = this.logData.occupants[ room ] || {};

	// Set up a container array
	var occupants = [];

	// Find out who's already in the room
	var occupant_history = this.logData.occupants[ room ];

	if ( !_.isEmpty( occupant_history ) ) {
		var keys = _.keys( occupant_history ).sort(),
			last = _.last( keys );

		occupants = occupant_history[ last ];
	}

	// Add an occupant and dedupe
	occupants.push( name );
	occupants = _.uniq( occupants );

	// Store the entry
	this.logData.occupants[ room ][ time ] = occupants ;
};

/**
 * Remove an occupant from a given room.
 *
 * Expects sanitized data
 *
 * @param {String}        name
 * @param {String|Number} room
 * @param {Number}        time
 */
Logger.prototype.removeFromRoom = function( name, room, time ) {
	// Set up a container array
	var occupants = [];

	// Find out who's already in the room
	var occupant_history = this.logData.occupants[ room ],
		keys = _.keys( occupant_history ).sort(),
		last = _.last( keys );
	occupants = occupant_history[ last ];

	// Now remove our visitor from the collection
	_.remove( occupants, function( ident ) { return name === ident } );

	// Store the entry
	this.logData.occupants[ room ][ time ] = occupants;
};

/**
 * Add a visitor to the `known` and `active` arrays for their user type.
 *
 * Expects sanitized data.
 *
 * @param {String} name
 * @param {String} type
 *
 * @returns {Boolean}
 */
Logger.prototype.activateVisitor = function( name, type ) {
	// Get our array keys
	var key, other_list;
	if ( 'E' === type ) {
		key = 'employees';
		other_list = 'guests';
	} else if ( 'G' === type ) {
		key = 'guests';
		other_list = 'employees';
	} else {
		return false;
	}

	// Check for duplicates
	if ( undefined !== this.logData[ other_list ].known[ name ] ) {
		// Already exists in the other list
		return false;
	}
	if ( undefined !== this.logData[ key ].active[ name ] ) {
		// Visitor is already active
		return false;
	}

	// Make sure the name is in our collection
	var known = this.logData[ key ].known || [],
		active = this.logData[ key ].active || [];

	known.push( name );
	active.push( name );

	this.logData[ key ].known = _.uniq( known );
	this.logData[ key ].active = _.uniq( active );

	return true;
};

/**
 * Remove a visitor to the `active` array for their user type.
 *
 * Expects sanitized data.
 *
 * @param {String} name
 * @param {String} type
 *
 * @returns {Boolean}
 */
Logger.prototype.deactivateVisitor = function( name, type ) {
	// Get our array keys
	var key;
	if ( 'E' === type ) {
		key = 'employees';
	} else if ( 'G' === type ) {
		key = 'guests';
	} else {
		return false;
	}

	// Cache our active list
	var active_visitors = this.logData[ key ].active;

	// Fail if the visitor is not active
	if ( ! _.contains( active_visitors, name ) ) {
		return false;
	}

	// Mark them as inactive
	_.remove( active_visitors, function( ident ) { return name === ident; } );

	// Store the updated array
	this.logData[ key ].active = active_visitors;

	return true;
};

/**
 * Mark a visitor as having entered the gallery.
 *
 * If the name is a duplicate (Guests and Employees cannot share names), return false.
 * If the visitor is already in the gallery, return false.
 *
 * Return true after inserting the record.
 *
 * @param {String} name
 * @param {String} type Either E or G
 * @param {Number} timestamp
 *
 * @returns {Boolean}
 */
Logger.prototype.enterGallery = function( name, type, timestamp ) {
	// Sanitize arguments
	name = name.replace( /[^(a-zA-Z)]/g, '' );
	type = type.toUpperCase().replace( /[^(E|G)]/g, '' ).substring( 0, 1 );
	timestamp = parseInt( timestamp, 10 );

	// Sanitization failed
	if ( '' === name || '' === type || isNaN( timestamp ) ) {
		return false;
	}

	// Attempt to activate our visitor
	if ( ! this.activateVisitor( name, type ) ) {
		return false;
	}

	// Add an occupant entry for the lobby
	this.addToRoom( name, 'lobby', timestamp );

	// Add a location entry
	this.logData.locations[ name ] = this.logData.locations[ name ] || {};
	this.logData.locations[ name ][ timestamp ] = 'lobby';

	// Update the timestamp
	this.logData.last = timestamp;

	// Dirty flag for saving
	this.dirty = true;

	// All good, move on!
	return true;
};

/**
 * Mark a visitor as having entered a room.
 *
 * If they're in another room already, return false.
 * If they're not in the gallery, return false.
 *
 * @param {String} name
 * @param {Number} room
 * @param {Number} timestamp
 *
 * @returns {Boolean}
 */
Logger.prototype.enterRoom = function( name, room, timestamp ) {
	// Sanitize arguments
	name = name.replace( /[^(a-zA-Z)]/g, '' );
	room = parseInt( room, 10 );
	timestamp = parseInt( timestamp, 10 );

	// Sanitization failed
	if ( '' === name || isNaN( room ) || isNaN( timestamp ) ) {
		return false;
	}

	// Make sure the visitor is active
	if ( ! _.contains( this.logData.employees.active, name ) && ! _.contains( this.logData.guests.active, name ) ) {
		// They're active as neither a guest or an employee
		return false;
	}

	// Make sure they're not in another room
	var sorted = _.sortBy( this.logData.locations[ name ], function( index ) { return index; } );
	if ( 'lobby' !== _.last( sorted ) ) {
		return false;
	}

	// Add an occupant to the room
	this.addToRoom( name, room, timestamp );

	// Remove the occupant from the lobby
	this.removeFromRoom( name, 'lobby', timestamp );

	// Update location history
	this.logData.locations[ name ][ timestamp ] = room;

	// Update the timestamp
	this.logData.last = timestamp;

	// Dirty flag for saving
	this.dirty = true;

	// All good, move on!
	return true;
};

/**
 * Mark a visitor as having left a room.
 *
 * @param {String} name
 * @param {Number} room
 * @param {Number} timestamp
 *
 * @return {Boolean}
 */
Logger.prototype.exitRoom = function( name, room, timestamp ) {
	// Sanitize arguments
	name = name.replace( /[^(a-zA-Z)]/g, '' );
	room = parseInt( room, 10 );
	timestamp = parseInt( timestamp, 10 );

	// Sanitization failed
	if ( '' === name || isNaN( room ) || isNaN( timestamp ) ) {
		return false;
	}

	// Make sure the visitor is active
	if ( ! _.contains( this.logData.employees.active, name ) && ! _.contains( this.logData.guests.active, name ) ) {
		// They're active as neither a guest or an employee
		return false;
	}

	// Make sure they're actually in the room
	var sorted = _.sortBy( this.logData.locations[ name ], function( index ) { return index; } );
	if ( room !== _.last( sorted ) ) {
		return false;
	}

	// Add an occupant entry for the lobby
	this.addToRoom( name, 'lobby', timestamp );

	// Remove an occupant from the room
	this.removeFromRoom( name, room, timestamp );

	// Update location history
	this.logData.locations[ name ][ timestamp ] = 'lobby';

	// Update the timestamp
	this.logData.last = timestamp;

	// Dirty flag for saving
	this.dirty = true;

	// All good, move on!
	return true;
};

/**
 * Mark a visitor as having left the gallery.
 *
 * @param {String} name
 * @param {String} type
 * @param {Number} timestamp
 *
 * @returns {Boolean}
 */
Logger.prototype.exitGallery = function( name, type, timestamp ) {
	// Sanitize arguments
	name = name.replace( /[^(a-zA-Z)]/g, '' );
	type = type.toUpperCase().replace( /[^(E|G)]/g, '' ).substring( 0, 1 );
	timestamp = parseInt( timestamp, 10 );

	// Sanitization failed
	if ( '' === name || '' === type || isNaN( timestamp ) ) {
		return false;
	}

	// Make sure they're in the lobby
	var sorted = _.sortBy( this.logData.locations[ name ], function( index ) { return index; } );

	if ( 'lobby' !== _.last( sorted ) ) {
		return false;
	}

	// Attempt to deactivate the visitor
	if ( ! this.deactivateVisitor( name, type ) ) {
		return false;
	}

	// Remove the occupant from the lobby
	this.removeFromRoom( name, 'lobby', timestamp );

	// Update the timestamp
	this.logData.last = timestamp;

	// Dirty flag for saving
	this.dirty = true;

	// All good, move on!
	return true;
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
		this.parsed = true;
		this.dirty = false;
		return true;
	} catch ( e ) {}

	// If we threw an exception, make sure we surface the error.
	return false;
};

/**
 * Add an entry to the log.
 *
 * @param {Entry}   entry
 * @param {Boolean} [handleError]
 *
 * @returns {Boolean} If the entry is invalid, this function returns false.
 */
Logger.prototype.append = function( entry, handleError ) {
	if ( undefined === handleError ) {
		handleError = true;
	}

	// Ensure order of operations
	if ( ! this.parsed ) {
		return false;
	}

	var success;
	switch( entry.action ) {
		case 'A':
			if ( null === entry.room || 'lobby' === entry.room ) {
				success = this.enterGallery( entry.name, entry.type, entry.time );
			} else {
				success = this.enterRoom( entry.name, entry.room, entry.time );
			}
			break;
		case 'L':
			if ( null === entry.room || 'lobby' === entry.room ) {
				success = this.exitGallery( entry.name, entry.type, entry.time );
			} else {
				success = this.exitRoom( entry.name, entry.room, entry.time );
			}
			break;
		default:
			success = false;
			break;
	}

	if ( ! success && handleError ) {
		process.stderr.write( 'invalid' );
		process.exit( 255 );
	}
};

/**
 * Write out changes to our logfile.
 */
Logger.prototype.write = function() {
	if ( ! this.dirty ) {
		return;
	}

	// Queue up some new salts and hashes
	var salt = util.randomString( 10 ),
		hash = util.createHash( this.security_key, salt );

	// Get our data to write
	var data = JSON.stringify( this.logData );

	// Encrypt the data
	var encrypted = util.encryptData( this.security_key, data );

	// Concatenate everything together
	var output = nUtil.format( '$%s$%s$%s', salt, hash, encrypted );

	// We have a dirty log, which means we need to overwrite/replace the stored copy.
	fs.writeSync( this.logDescriptor, output, 0 );
};

/**
 * Process a client query against the given log.
 *
 * @param {Query} query
 */
Logger.prototype.query = function( query ) {
	switch( query.query ) {
		case 'S':
			// Print out 3 or more lines:
			// - Employees, comma-separated
			// - Guests, comma-separated
			// - Rooms occupied (ignore the lobby)
			var employees = this.logData.employees.active.join( ',' ),
				guests = this.logData.guests.active.join( ',' );

			var rooms = [];
			_.forEach( this.logData.occupants, function( data, room ) {
				if ( 'lobby' === room ) {
					// Skip the lobby
					return;
				}

				room = parseInt( room, 10 );
				if ( isNaN( room ) ) {
					// Error checking
					return;
				}

				var sorted = _.sortBy( data, function( index ) { return index; } ),
					last_entry = _.values( _.last( sorted ) || [] )[0];

				if ( last_entry.length > 0 ) {
					rooms.push( room.toString() + ': ' + last_entry.join( ',' ) );
				}
			} );

			// Concatenate room data
			rooms = rooms.join( '\n' );

			process.stdout.write( employees + '\n' + guests + '\n' + rooms );
			process.exit( 0 );
			break;
		case 'R':
			break;
		case 'T':
			break;
		case 'I':
			break;
		default:
			process.stderr.write( 'invalid' );
			process.exit( 255 );
			break;
	}
};

/**
 * Export the module
 */
module.exports = Logger;