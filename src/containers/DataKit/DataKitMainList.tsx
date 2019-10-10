import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import { RootState } from '../../reducers/index';
import {
  removeDataKit,
  selectDatakit,
  updateDataKit,
  createDataKit,
  DataKitState,
} from '../../modules/datakit';
import { selectApp, setAppCurrentPage } from '../../modules/app';
import DataKitListViewer from '.';

const Wrapper = styled.div`
  padding: 24px;
  margin: 12px;
  background: #fff;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

type Props = {
  tenant: string;
  datakit: DataKitState;
  createDataKit: typeof createDataKit;
  removeDataKit: typeof removeDataKit;
  updateDataKit: typeof updateDataKit;
  setAppCurrentPage: typeof setAppCurrentPage;
  push: typeof push;
};

type State = { selectedDatakit?: string };

class DataKitMainList extends React.Component<Props, State> {
  state: Readonly<State> = {};

  componentDidMount() {
    this.props.setAppCurrentPage(0);
  }

  addNewDatakit = () => {
    // eslint-disable-next-line no-alert
    const name = prompt('Please enter a name for datakit');
    if (name) {
      this.props.createDataKit({ name });
    }
  };

  render() {
    return (
      <Wrapper>
        <h1>Welcome to Cognite Data Studio</h1>
        <p>Create, enhance and deplopy your data kits with ease.</p>
        <div style={{ flex: 1 }}>
          <DataKitListViewer />
        </div>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    datakit: selectDatakit(state),
    tenant: selectApp(state).tenant!,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      createDataKit,
      removeDataKit,
      updateDataKit,
      setAppCurrentPage,
      push,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DataKitMainList);
