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
 * Test module
 */
var CLI = require( '../src/lib/cli' );

function test_validEntryArgs( test ) {
	// Cache
	var _argv = process.argv;

	process.argv = [
		'node',
		'logappend.js',
		'-T',
		'5',
		'-S',
		'secret',
		'-A',
		'-E',
		'Tony',
		'log1'
	];

	var cli = new CLI,
		parsed = cli.append_parsed();

	test.equal( parsed.status, 'valid' );
	test.strictEqual( parsed.data['time'], 5 );
	test.strictEqual( parsed.data['secret'], 'secret' );
	test.strictEqual( parsed.data['action'], 'A' );
	test.equal( parsed.data['room'], undefined );
	test.strictEqual( parsed.data['type'], 'E' );
	test.strictEqual( parsed.data['name'], 'Tony' );
	test.strictEqual( parsed.data['logfile'], 'log1' );

	// Reset
	process.argv = _argv;

	test.done();
}

function test_validRoomEntryArgs( test ) {
	// Cache
	var _argv = process.argv;

	process.argv = [
		'node',
		'logappend.js',
		'-T',
		'2',
		'-S',
		'secret',
		'-A',
		'-R',
		'2',
		'-E',
		'Sam',
		'log1'
	];

	var cli = new CLI,
		parsed = cli.append_parsed();

	test.equal( parsed.status, 'valid' );
	test.strictEqual( parsed.data['time'], 2 );
	test.strictEqual( parsed.data['secret'], 'secret' );
	test.strictEqual( parsed.data['action'], 'A' );
	test.strictEqual( parsed.data['room'], 2 );
	test.strictEqual( parsed.data['type'], 'E' );
	test.strictEqual( parsed.data['name'], 'Sam' );
	test.strictEqual( parsed.data['logfile'], 'log1' );

	// Reset
	process.argv = _argv;

	test.done();
}

function test_validExitArgs( test ) {
	// Cache
	var _argv = process.argv;

	process.argv = [
		'node',
		'logappend.js',
		'-T',
		'2345',
		'-S',
		'secret',
		'-L',
		'-G',
		'Bob',
		'log'
	];

	var cli = new CLI,
		parsed = cli.append_parsed();

	test.equal( parsed.status, 'valid' );
	test.strictEqual( parsed.data['time'], 2345 );
	test.strictEqual( parsed.data['secret'], 'secret' );
	test.strictEqual( parsed.data['action'], 'L' );
	test.strictEqual( parsed.data['type'], 'G' );
	test.strictEqual( parsed.data['name'], 'Bob' );
	test.strictEqual( parsed.data['logfile'], 'log' );

	// Reset
	process.argv = _argv;

	test.done();
}

function test_validRoomExitArgs( test ) {
	// Cache
	var _argv = process.argv;

	process.argv = [
		'node',
		'logappend.js',
		'-T',
		'00123',
		'-S',
		'secret',
		'-L',
		'-R',
		'0',
		'-E',
		'Sam',
		'log1'
	];

	var cli = new CLI,
		parsed = cli.append_parsed();

	test.equal( parsed.status, 'valid' );
	test.strictEqual( parsed.data['time'], 123 );
	test.strictEqual( parsed.data['secret'], 'secret' );
	test.strictEqual( parsed.data['action'], 'L' );
	test.strictEqual( parsed.data['room'], 0 );
	test.strictEqual( parsed.data['type'], 'E' );
	test.strictEqual( parsed.data['name'], 'Sam' );
	test.strictEqual( parsed.data['logfile'], 'log1' );

	// Reset
	process.argv = _argv;

	test.done();
}

function test_validBatchArgs( test ) {
	// Cache
	var _argv = process.argv;

	process.argv = [
		'node',
		'logappend.js',
		'-B',
		'batchfile'
	];

	var cli = new CLI,
		parsed = cli.append_parsed();

	test.equal( parsed.status, 'valid' );
	test.strictEqual( parsed.data['batchfile'], 'batchfile' );

	// Reset
	process.argv = _argv;

	test.done();
}

function test_invalidArgs( test ) {
	// Cache
	var _argv = process.argv;

	process.argv = [
		'node',
		'logappend.js',
		'-T',
		'5',
		'-S',
		'secret',
		'-A',
		'-breakage',
		'-E',
		'Tony',
		'log1'
	];

	var cli = new CLI,
		parsed = cli.append_parsed();

	test.equal( parsed.status, 'invalid' );

	// Reset
	process.argv = _argv;

	test.done();
}

/**
 * Export the test group
 */
module.exports = {
	setUp: function ( callback ) {
		callback();
	},

	tearDown: function ( callback ) {
		callback();
	},

	test_validEntryArgs: test_validEntryArgs,
	test_validRoomEntryArgs: test_validRoomEntryArgs,
	test_validExitArgs: test_validExitArgs,
	test_validRoomExitArgs: test_validRoomExitArgs,
	test_validBatchArgs: test_validBatchArgs,
	test_invalidArgs: test_invalidArgs
};