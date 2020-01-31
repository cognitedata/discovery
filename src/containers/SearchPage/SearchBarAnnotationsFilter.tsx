import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Checkbox } from 'antd';
import { RootState } from '../../reducers/index';
import { SearchState, updateSearchByAnnotation } from '../../modules/search';
import { BetaTag } from '../../components/BetaWarning';

type OrigProps = {};

type Props = {
  search: SearchState;
  doUpdateSearchByAnnotation: typeof updateSearchByAnnotation;
} & OrigProps;

export const SearchBarAnnotationsFilter = ({
  search,
  doUpdateSearchByAnnotation,
}: Props) => {
  const { searchByAnnotation } = search;
  return (
    <>
      <p>
        Search by Annotation <BetaTag />
      </p>
      <Checkbox
        checked={searchByAnnotation}
        onChange={ev => doUpdateSearchByAnnotation(ev.target.checked)}
      />
    </>
  );
};

const mapStateToProps = (state: RootState) => {
  return {
    search: state.search,
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doUpdateSearchByAnnotation: updateSearchByAnnotation,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SearchBarAnnotationsFilter);
