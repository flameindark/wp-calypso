var crypto = require( 'crypto' );
var fs = require('fs');
var qs = require( 'qs' );

const HASH_LENGTH = 10;
const URL_BASE_PATH = '/calypso';
const SERVER_BASE_PATH = '/public';

function getAssets( stats ) {
	var chunks = stats.chunks;

	return chunks.map( function( chunk ) {
		var filename = chunk.files[ 0 ];
		return {
			name: chunk.names[ 0 ],
			hash: chunk.hash,
			file: filename,
			url: stats.publicPath + filename,
			size: chunk.size
		};
	} );
}

// Adapts route paths to also include wildcard
// subroutes under the root level section.
function pathToRegExp( path ) {
	// Prevents root level double dash urls from being validated.
	if ( path === '/' ) {
		return path;
	}
	return new RegExp( '^' + path + '(/.*)?$' );
}

function hashFile( path ) {
	const md5 = crypto.createHash( 'md5' );
	let data, hash;

	try {
		data = fs.readFileSync( path );
		md5.update( data );
		hash = md5.digest( 'hex' );
		hash = hash.slice( 0, HASH_LENGTH );
	} catch ( e ) {
		hash = new Date().getTime().toString();
	}

	return hash;
}

function getUrl( filename, hash ) {
	return URL_BASE_PATH + '/' + filename + '?' + qs.stringify( {
		v: hash
	} );
}

function getHashedUrl( filename ) {
	return getUrl( filename, hashFile( process.cwd() + SERVER_BASE_PATH + '/' + filename ) );
}

module.exports = {
	getAssets: getAssets,
	pathToRegExp: pathToRegExp,
	getHashedUrl: getHashedUrl
};
