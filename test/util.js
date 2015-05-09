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

exports.test_createHash_creates_stable_hash = function( test ) {
	var unhashed = '123456',
		hashed = 'abcdefghij::67615732412823f2e3b59dc4ccbab5cde62c8d67dabc0429a276c5deb20dc9f0f1caf4d936cd1b7564ed5236ec8b49159638361dd788febc3d760100b62e9ad3';

	// Cache util's randomness
	var _randomValueHex = util.randomString;
	util.randomString = function( len ) { return 'abcdefghij' };

	var actual = util.createHash( unhashed );

	test.strictEqual( hashed, actual );

	// Reset
	util.randomString = _randomValueHex;

	test.done();
};

exports.test_validateHash_validates_hash = function( test ) {
	var unhashed = '123456',
		hashed = 'abcdefghij::67615732412823f2e3b59dc4ccbab5cde62c8d67dabc0429a276c5deb20dc9f0f1caf4d936cd1b7564ed5236ec8b49159638361dd788febc3d760100b62e9ad3';

	// Cache util's randomness
	var _randomValueHex = util.randomString;
	util.randomString = function( len ) { return 'abcdefghij' };

	test.ok( util.validateHash( unhashed, hashed ) );
	test.ok( ! util.validateHash( unhashed, 'abcd' ) );

	// Reset
	util.randomString = _randomValueHex;

	test.done();
};

exports.test_encryptData_protects_data = function( test ) {
	var secret = '123456',
		data = { obj: {arr: [ 1, 2 ] } };

	// Cache util's functionality
	var _createHash = util.createHash,
		_randomString = util.randomString;
	util.createHash = function( key ) {
		return 'hashed_key';
	};
	util.randomString = function( len ) {
		return '';
	};

	var expected = 'hashed_key::15a23f531fa49e2f5e38be23da8a943e51feac1bfef8712a916ce6bdf6fb7582',
		actual = util.encryptData( secret, data );

	test.strictEqual( actual, expected );

	// Reset
	util.createHash = _createHash;
	util.randomString = _randomString;

	test.done();
};

exports.test_decryptData_exposes_data = function( test ) {
	var secret = '123456',
		ciphertext = '::hashed_key::15a23f531fa49e2f5e38be23da8a943e51feac1bfef8712a916ce6bdf6fb7582';

	var expected = { obj: {arr: [ 1, 2 ] } },
		actual = util.decryptData( secret, ciphertext );

	test.deepEqual( actual, expected );

	test.done();
};

exports.test_encryption_decryption_integration = function( test ) {
	var data = { obj: {arr: [ 1, 2 ] }},
		password = 'abcdef';

	var encrypted = util.encryptData( password, data );

	var decrypted = util.decryptData( password, encrypted );

	test.notEqual( undefined, decrypted.obj );
	test.notEqual( undefined, decrypted.obj.arr );
	test.equal( 2, decrypted.obj.arr.length );
	test.done();
};

exports.test_invalid = function( test ) {
	var lastErr,
		exitCode;

	// Capture stderr
	var _write = process.stderr.write,
		_exit = process.exit;
	process.stderr.write = function( output ) {
		lastErr = output;
	};
	process.exit = function( code ) {
		exitCode = code;
	};

	util.invalid();

	test.strictEqual( lastErr, 'invalid' );
	test.strictEqual( exitCode, 255 );

	// Reset
	process.stderr.write = _write;
	process.exit = _exit;

	test.done();
};