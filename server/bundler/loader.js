var config = require( 'config' ),
	utils = require( './utils' );

function getCssUrl( filename ) {
	return utils.getHashedUrl( 'sections' + ( config( 'rtl' ) ? '-rtl' : '' ) + '/' + filename + '.css' );
}

function getSectionsModule( sections ) {
	var dependencies,
		loadSection = '',
		sectionLoaders = '';

	if ( config.isEnabled( 'code-splitting' ) ) {
		dependencies = [
			"var config = require( 'config' ),",
			"\tpage = require( 'page' ),",
			"\tReact = require( 'react' ),",
			"\tactivateNextLayoutFocus = require( 'state/ui/layout-focus/actions' ).activateNextLayoutFocus,",
			"\tLoadingError = require( 'layout/error' ),",
			"\tcontroller = require( 'controller' ),",
			"\trestoreLastSession = require( 'lib/restore-last-path' ).restoreLastSession,",
			"\tpreloadHub = require( 'sections-preload' ).hub;",
			'\n',
			'var _loadedSections = {};\n'
		].join( '\n' );

		sections.forEach( function( section ) {
			loadSection += singleEnsure( section.name );
			section.paths.forEach( function( path ) {
				sectionLoaders += splitTemplate( path, section );
			} );
		} );

		return [
			dependencies,
			'function preload( section ) {',
			'	switch ( section ) {',
			'	' + loadSection,
			'	}',
			'}',
			'\n',
			"preloadHub.on( 'preload', preload );",
			'\n',
			'module.exports = {',
			'	get: function() {',
			'		return ' + JSON.stringify( sections ) + ';',
			'	},',
			'	load: function() {',
			'		' + sectionLoaders,
			'	}',
			'};',
			'\n',
			'function loadCSS( cssUrl ) {',
			'	var link = document.createElement( "link" );',
			'	link.setAttribute( "rel", "stylesheet" );',
			'	link.setAttribute( "type", "text/css" );',
			'	link.setAttribute( "href", cssUrl );',
			'	document.getElementsByTagName( "head" )[ 0 ].appendChild( link )',
			'}',
			'\n',
		].join( '\n' );
	}

	dependencies = [
		"var config = require( 'config' ),",
		"\tpage = require( 'page' ),",
		"\tcontroller = require( 'controller' );\n"
	].join( '\n' );

	sectionLoaders = getRequires( sections );

	return [
		dependencies,
		'module.exports = {',
		'	get: function() {',
		'		return ' + JSON.stringify( sections ) + ';',
		'	},',
		'	load: function() {',
		'		' + sectionLoaders,
		'	}',
		'};'
	].join( '\n' );
}

function getRequires( sections ) {
	var content = '';

	sections.forEach( function( section ) {
		content += requireTemplate( section );
	} );

	return content;
}

function splitTemplate( path, section ) {
	var pathRegex = getPathRegex( path ),
		result;

	result = [
		'page( ' + pathRegex + ', function( context, next ) {',
		'	var envId = ' + JSON.stringify( section.envId ) + ';',
		'	if ( envId && envId.indexOf( config( "env_id" ) ) === -1 ) {',
		'		return next();',
		'	}',
		'	if ( _loadedSections[ ' + JSON.stringify( section.module ) + ' ] ) {',
		'		controller.setSection( ' + JSON.stringify( section ) + ' )( context );',
		'		context.store.dispatch( activateNextLayoutFocus() );',
		'		return next();',
		'	}',
		'	if ( config.isEnabled( "restore-last-location" ) && restoreLastSession( context.path ) ) {',
		'		return;',
		'	}',
		'	context.store.dispatch( { type: "SECTION_SET", isLoading: true } );',
		'	require.ensure([], function( require ) {',
		'		context.store.dispatch( { type: "SECTION_SET", isLoading: false } );',
		'		controller.setSection( ' + JSON.stringify( section ) + ' )( context );',
		'		if ( ! _loadedSections[ ' + JSON.stringify( section.module ) + ' ] ) {',
		'			require( ' + JSON.stringify( section.module ) + ' )( controller.clientRouter );',
		'			' + ( section.css ? 'loadCSS( "' + getCssUrl( section.css ) + '" )' : '' ) + '',
		'			_loadedSections[ ' + JSON.stringify( section.module ) + ' ] = true;',
		'		}',
		'		context.store.dispatch( activateNextLayoutFocus() );',
		'		next();',
		'	}, function onError( error ) {',
		'		if ( ! LoadingError.isRetry() ) {',
		'			LoadingError.retry( ' + JSON.stringify( section.name ) + ' );',
		'		} else {',
		'			console.error(error);',
		'			context.store.dispatch( { type: "SECTION_SET", isLoading: false } );',
		'			LoadingError.show( ' + JSON.stringify( section.name ) + ' );',
		'		}',
		'		return;',
		'	},',
		JSON.stringify( section.name ) + ' );',
		'} );\n'
	];

	return result.join( '\n' );
}

function getPathRegex( pathString ) {
	if ( pathString === '/' ) {
		return JSON.stringify( pathString );
	}
	const regex = utils.pathToRegExp( pathString );
	return '/' + regex.toString().slice( 1, -1 ) + '/';
}

function requireTemplate( section ) {
	var pathRegex,
		result;

	result = section.paths.reduce( function( acc, path ) {
		pathRegex = getPathRegex( path );

		return acc.concat( [
			'page( ' + pathRegex + ', function( context, next ) {',
			'	var envId = ' + JSON.stringify( section.envId ) + ';',
			'	if ( envId && envId.indexOf( config( "env_id" ) ) === -1 ) {',
			'		return next();',
			'	}',
			'	controller.setSection( ' + JSON.stringify( section ) + ' )( context );',
			'	require( ' + JSON.stringify( section.module ) + ' )( controller.clientRouter );',
			'	loadCSS( ' + JSON.stringify( section ) + ' );',
			'	next();',
			'} );\n'
		] );
	}, [] );

	return result.join( '\n' );
}

function singleEnsure( chunkName ) {
	var result = [
		'case ' + JSON.stringify( chunkName ) + ':',
		'	return require.ensure([], function() {}, ' + JSON.stringify( chunkName ) + ' );',
		'	break;\n'
	];

	return result.join( '\n' );
}

module.exports = function( content ) {
	var sections;

	sections = require( this.resourcePath );

	if ( ! Array.isArray( sections ) ) {
		this.emitError( 'Chunks module is not an array' );
		return content;
	}

	this.addDependency( 'page' );

	return getSectionsModule( sections );
};
