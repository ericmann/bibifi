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

	logger.prototype.getLogFile( 'log1' );

	try {
		fs.openSync( 'log1', 'r' );
		exists = true;
	} catch ( e ) {
		exists = false;
	}

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

/**
 * Export the test group
 */
module.exports = {
	setUp: function ( callback ) {
		try { fs.unlinkSync( 'log1' ); } catch ( e ) {}
		try { fs.unlinkSync( 'log2' ); } catch ( e ) {}
		try { fs.unlinkSync( 'log3' ); } catch ( e ) {}

		callback();
	},

	tearDown: function ( callback ) {
		try { fs.unlinkSync( 'log1' ); } catch ( e ) {}
		try { fs.unlinkSync( 'log2' ); } catch ( e ) {}
		try { fs.unlinkSync( 'log3' ); } catch ( e ) {}

		callback();
	},

	test_getLogFile_creates_file: test_getLogFile_creates_file,
	test_validateKey_accepts_valid_key: test_validateKey_accepts_valid_key,
	test_validateKey_rejects_invalid_key: test_validateKey_rejects_invalid_key
};