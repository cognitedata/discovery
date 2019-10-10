import React from 'react';
import { connect } from 'react-redux';
import { Table, Button } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { push } from 'connected-react-router';
import styled from 'styled-components';
import { RootState } from '../../reducers/index';
import {
  removeDataKit,
  selectDatakit,
  updateDataKit,
  createDataKit,
  DataKitState,
} from '../../modules/datakit';
import DataKitViewer from './DataKitViewer';
import { selectApp, AppState } from '../../modules/app';

type Props = {
  app: AppState;
  datakit: DataKitState;
  createDataKit: typeof createDataKit;
  removeDataKit: typeof removeDataKit;
  updateDataKit: typeof updateDataKit;
  push: typeof push;
};

const Wrapper = styled.div`
  height: 100%;
  overflow: auto;
  && button {
    margin-right: 6px;
  }
  && > button {
    margin-bottom: 12px;
  }
`;

type State = { selectedDatakit?: string };

class DataKitList extends React.Component<Props, State> {
  state: Readonly<State> = {};

  addNewDatakit = () => {
    // eslint-disable-next-line no-alert
    const name = prompt('Please enter a name for datakit');
    if (name) {
      this.props.createDataKit({ name });
    }
  };

  render() {
    const {
      datakit,
      app: { tenant, currentPage },
    } = this.props;
    const { selectedDatakit } = this.state;
    if (selectedDatakit) {
      return (
        <div
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <Button onClick={() => this.setState({ selectedDatakit: undefined })}>
            BACK
          </Button>
          <DataKitViewer datakitName={selectedDatakit} />
        </div>
      );
    }
    return (
      <Wrapper>
        <Button onClick={() => this.addNewDatakit()}>Add New Datakit</Button>
        <Table
          dataSource={Object.values(datakit)}
          rowKey="name"
          columns={[
            {
              dataIndex: 'name',
              title: 'Name',
              key: 'name',
            },
            {
              dataIndex: 'input.length',
              title: 'Input Timeseries',
              key: 'inputs',
            },
            {
              dataIndex: 'output.length',
              title: 'Output Timeseries',
              key: 'outputs',
            },
            {
              dataIndex: 'name',
              key: 'actions',
              title: 'Actions',
              render: name => {
                return (
                  <>
                    {currentPage !== 1 && (
                      <Button
                        onClick={() => {
                          this.props.push(`/${tenant}/datakits/${name}/edit`);
                        }}
                        type="primary"
                      >
                        Add Timeseries
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        this.setState({ selectedDatakit: name });
                      }}
                      type="primary"
                    >
                      View
                    </Button>
                    <Button
                      onClick={() => {
                        this.props.removeDataKit(name);
                      }}
                    >
                      Delete
                    </Button>
                  </>
                );
              },
            },
          ]}
        />
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectApp(state),
    datakit: selectDatakit(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      createDataKit,
      removeDataKit,
      updateDataKit,
      push,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DataKitList);
