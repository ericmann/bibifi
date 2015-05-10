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
 * Test module.
 *
 * @type {Object}
 */
var fs = require( 'fs' ),
	logger = require( '../src/lib/logger' );

function test_getLogFile_creates_file( test ) {
	// Make sure no file exists
	var exists;
	try {
		fs.openSync( 'log1', 'r' );
		exists = true;
	} catch ( e ) {
		exists = false;
	}

	test.ok( ! exists );

	var logfile = logger.prototype.getLogFile( 'log1' );

	try {
		fs.openSync( 'log1', 'r' );
		exists = true;
	} catch ( e ) {
		exists = false;
	}

	test.strictEqual( logfile[1], 'empty' );
	test.ok( exists );

	test.done();
}

function test_validateKey_accepts_valid_key( test ) {
	// Because I'm lazy, let's create a mock log using the actual filesystem
	fs.writeFileSync( 'log2', '$0123456789$8d94109748d6156d5ee0a942d1dc510834016c43eea121128bbd4c49c0eafaca538a1aa39062ee3399a25fb364783dba7a18d5fbe16c71c507562b532e5a6e2f$A5fWQsdfjqweRSd234sadasFWEras' );

	// Now, we're going to attempt to validate the key.
	var secret = '123456';

	// Open our file (again, we're lazy
	var fd = fs.openSync( 'log2', 'r+' );

	// Test our code
	var valid = logger.prototype.validateKey( fd, secret );

	test.ok( valid );

	test.done();
}

function test_validateKey_rejects_invalid_key( test ) {
	// Because I'm lazy, let's create a mock log using the actual filesystem
	fs.writeFileSync( 'log3', '$0123457789$8d94109748d6156d5ee0a942d1dc510834016c43eea121128bbd4c49c0eafaca538a1aa39062ee3399a25fb364783dba7a18d5fbe16c71c507562b532e5a6e2f$A5fWQsdfjqweRSd234sadasFWEras' );

	// Now, we're going to attempt to validate the key.
	var secret = '123456';

	// Open our file (again, we're lazy
	var fd = fs.openSync( 'log3', 'r+' );

	// Test our code
	var valid = logger.prototype.validateKey( fd, secret );

	test.ok( ! valid );

	test.done();
}

function test_open_newLog( test ) {
	// Cache behavior
	var _getLogFile = logger.prototype.getLogFile,
		_parse = logger.prototype.parse;
	logger.prototype.getLogFile = function( logfile ) {
		return [1, 'empty'];
	};
	logger.prototype.parse = function( fd, key ) {
		return true;
	};

	var log = logger.prototype.open( 'log4', '12345' );

	test.notEqual( typeof log, 'string' );

	// Reset
	logger.prototype.getLogFile = _getLogFile;
	logger.prototype.parse = _parse;

	test.done();
}

function test_open_existingLog( test ) {
	// Cache behavior
	var _getLogFile = logger.prototype.getLogFile,
		_validateKey = logger.prototype.validateKey,
		_parse = logger.prototype.parse;
	logger.prototype.getLogFile = function( logfile ) {
		return [1, 'append'];
	};
	logger.prototype.validateKey = function( log, key ) {
		return true;
	};
	logger.prototype.parse = function( fd, key ) {
		return true;
	};

	var log = logger.prototype.open( 'log5', '123456' );

	test.notEqual( typeof log, 'string' );

	// Reset
	logger.prototype.getLogFile = _getLogFile;
	logger.prototype.validateKey = _validateKey;
	logger.prototype.parse = _parse;

	test.done();
}

function test_open_logError( test ) {
	// Cache behavior
	var _getLogFile = logger.prototype.getLogFile,
		_validateKey = logger.prototype.validateKey,
		_parse = logger.prototype.parse;
	logger.prototype.getLogFile = function( logfile ) {
		return [1, 'append'];
	};
	logger.prototype.validateKey = function( log, key ) {
		return false;
	};
	logger.prototype.parse = function( fd, key ) {
		return true;
	};

	var log = logger.prototype.open( 'log6', 'bad_secret' );

	test.strictEqual( log, 'key_err' );

	// Reset
	logger.prototype.getLogFile = _getLogFile;
	logger.prototype.validateKey = _validateKey;
	logger.prototype.parse = _parse;

	test.done();
}

/**
 * Really more of an integration test, as we're depending on `open` calling `parse` internally.
 *
 * @param {Object} test
 */
function test_parse_decodes_data( test ) {
	// Because I'm lazy, let's create a mock log using the actual filesystem
	fs.writeFileSync( 'log4', '$0123456789$8d94109748d6156d5ee0a942d1dc510834016c43eea121128bbd4c49c0eafaca538a1aa39062ee3399a25fb364783dba7a18d5fbe16c71c507562b532e5a6e2f$15a23f531fa49e2f5e38be23da8a943e51feac1bfef8712a916ce6bdf6fb7582' );

	var log = logger.prototype.open( 'log4', '123456' );

	test.equal( typeof log, 'object' );
	test.equal( typeof log.logData, 'object' );
	test.equal( log.logData['obj']['arr'].length, 2 ); // Make sure our encrypted data came back out

	test.done();
}

/**
 * Export the test group
 */
module.exports = {
	setUp: function ( callback ) {
		try { fs.unlinkSync( 'log1' ); } catch ( e ) {}
		try { fs.unlinkSync( 'log2' ); } catch ( e ) {}
		try { fs.unlinkSync( 'log3' ); } catch ( e ) {}
		try { fs.unlinkSync( 'log4' ); } catch ( e ) {}

		callback();
	},

	tearDown: function ( callback ) {
		try { fs.unlinkSync( 'log1' ); } catch ( e ) {}
		try { fs.unlinkSync( 'log2' ); } catch ( e ) {}
		try { fs.unlinkSync( 'log3' ); } catch ( e ) {}
		try { fs.unlinkSync( 'log4' ); } catch ( e ) {}

		callback();
	},

	test_getLogFile_creates_file: test_getLogFile_creates_file,
	test_validateKey_accepts_valid_key: test_validateKey_accepts_valid_key,
	test_validateKey_rejects_invalid_key: test_validateKey_rejects_invalid_key,
	test_open_newLog: test_open_newLog,
	test_open_existingLog: test_open_existingLog,
	test_open_logError: test_open_logError,
	test_parse_decodes_data: test_parse_decodes_data
};