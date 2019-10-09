import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { RootState } from '../../reducers/index';
import {
  selectDatakit,
  updateDataKit,
  DataKitState,
} from '../../modules/datakit';

type Props = {
  datakit: DataKitState;
  datakitName: string;
};

type State = {};

class DataKitViewer extends React.Component<Props, State> {
  state = {};

  render() {
    const { datakit, datakitName } = this.props;
    return <pre>{JSON.stringify(datakit[datakitName], null, 2)}</pre>;
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    datakit: selectDatakit(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      updateDataKit,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DataKitViewer);
