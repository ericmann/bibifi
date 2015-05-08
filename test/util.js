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
var fs = require( 'fs' );

/**
 * Test module.
 *
 * @type {Object}
 */
var util = require( '../src/lib/util' );

exports.test_randomString_length = function( test ) {
	/**
	 * Test a few lengths
	 */
	for ( var i = 0, l = 10; i < l; i++ ) {
		var length = Math.floor( 10 * Math.random() ),
			randomHex = util.randomString( length );

		test.strictEqual( length, randomHex.length );
	}

	test.done();
};

exports.test_randomString_unique = function( test ) {
	/**
	 * Test uniqueness of strings
	 */
	var first = util.randomString( 5 ),
		second = util.randomString( 5 );

	test.notEqual( first, second );

	test.done();
};

exports.test_verifyFile_exists = function( test ) {
	var _existsSync = fs.existsSync,
		called = false;

	fs.existsSync = function( path ) {
		called = true;

		return 'exists' === path;
	};

	util.verifyFile( 'exists' );

	test.ok( called );

	fs.existsSync = _existsSync;
	test.done();
};

exports.test_verifyFile_creates_new_file = function( test ) {
	var _existsSync = fs.existsSync,
		_writeSync = fs.writeFileSync,
		existsCalled = false,
		writeCalled = true;

	fs.existsSync = function( path ) {
		existsCalled = true;

		return 'exists' === path;
	};
	fs.writeFileSync = function( path, content, flags ) {
		writeCalled = true;
		return;
	};

	util.verifyFile( 'missing' );

	test.ok( existsCalled );
	test.ok( writeCalled );

	fs.existsSync = _existsSync;
	fs.writeFileSync = _writeSync;
	test.done();
};