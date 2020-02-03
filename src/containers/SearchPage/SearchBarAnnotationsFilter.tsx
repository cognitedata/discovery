import React from 'react';
import { Checkbox } from 'antd';
import { updateSearchByAnnotation } from '../../modules/search';
import { BetaTag } from '../../components/BetaWarning';
import { useDispatch, useSelector } from '../../utils/ReduxUtils';

export const SearchBarAnnotationsFilter = () => {
  const dispatch = useDispatch();

  const searchByAnnotation = useSelector(
    state => state.search.searchByAnnotation
  );

  return (
    <>
      <p>
        Search by Annotation <BetaTag />
      </p>
      <Checkbox
        checked={searchByAnnotation}
        onChange={ev => {
          dispatch(updateSearchByAnnotation(ev.target.checked));
        }}
      />
    </>
  );
};
export default SearchBarAnnotationsFilter;
