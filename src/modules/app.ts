import { createAction } from 'redux-actions';
import { Action } from 'redux';
import { RootState } from '../reducers/index';

// Constants
export const SET_TYPES = 'types/SET_TYPES';

interface SetAction extends Action<typeof SET_TYPES> {
  payload: {};
}

type TypeAction = SetAction;

// Reducer
export interface AppState {
  items?: any[];
}
const initialState: AppState = {};

export default function app(
  state = initialState,
  action: TypeAction
): AppState {
  switch (action.type) {
    default:
      return state;
  }
}

// Action creators
const setTypes = createAction(SET_TYPES);

export const actions = {
  setTypes,
};

// Selectors
export const selectTypes = (state: RootState) => state.types || { items: [] };
