import {
  TypedUseSelectorHook,
  useSelector as originalUseSelector,
  useDispatch as originalUseDispatch,
} from 'react-redux';

import { RootState } from '../reducers/index';

// we do it in such way to be able to mock it in test
export const useSelector: TypedUseSelectorHook<RootState> = originalUseSelector;
export const useDispatch = originalUseDispatch;
