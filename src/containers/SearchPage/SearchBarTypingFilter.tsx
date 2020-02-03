import React from 'react';
import { BetaTag } from '../../components/BetaWarning';
import TypeSelect from '../../components/TypeSelect/TypeSelect';

// type OrigProps = {};

// type Props = {} & OrigProps;

const SearchBarTypingFilters = () => {
  return (
    <>
      <p>
        Search by Types <BetaTag />
      </p>
      <TypeSelect onTypeSelected={console.log} />
    </>
  );
};
export default SearchBarTypingFilters;
