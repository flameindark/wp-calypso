/**
 * External dependencies
 */
import { without } from 'lodash';

/**
 * Internal dependencies
 */
import { createReducer } from 'state/utils';
import {
	PANDANCE_SELECTED_TOGGLE,
	PANDANCE_BUSINESS_NAME_ENTER,
	PANDANCE_BUSINESS_DESCRIPTION_ENTER,
} from 'state/action-types';

export default createReducer( {
	business: {
		name: null,
		description: null,
	},
	selected: [ 1, 2, 3, 4, 5, 6, 7 ],
}, {
	[PANDANCE_SELECTED_TOGGLE]: (state, action) => ( {
		...state,
		selected: state.selected.includes( action.id ) ?
			without( state.selected, action.id ) : [ action.id, ...state.selected ]
	} ),
	[PANDANCE_BUSINESS_NAME_ENTER]: (state, action) => ( {
		...state,
		business: {
			...state.business,
			name: action.name,
		}
	} ),
	[PANDANCE_BUSINESS_DESCRIPTION_ENTER]: (state, action) => ( {
		...state,
		business: {
			...state.business,
			description: action.description,
		}
	} ),
} );
