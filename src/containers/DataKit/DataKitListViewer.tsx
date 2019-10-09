import React from 'react';
import { connect } from 'react-redux';
import { Table } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { Button } from 'antd/lib/radio';
import { RootState } from '../../reducers/index';
import {
  DataKit,
  removeDataKit,
  selectDatakit,
  updateDataKit,
  createDataKit,
  DataKitState,
} from '../../modules/datakit';
import DataKitViewer from './DataKitViewer';

type Props = {
  datakit: DataKitState;
  createDataKit: typeof createDataKit;
  removeDataKit: typeof removeDataKit;
  updateDataKit: typeof updateDataKit;
};

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
    const { datakit } = this.props;
    const { selectedDatakit } = this.state;
    if (selectedDatakit) {
      return (
        <>
          <Button onClick={() => this.setState({ selectedDatakit: undefined })}>
            BACK
          </Button>
          <DataKitViewer datakitName={selectedDatakit} />
        </>
      );
    }
    return (
      <>
        <Button onClick={() => this.addNewDatakit()}>Add New Datakit</Button>
        <Table
          dataSource={Object.values(datakit)}
          rowKey="name"
          onRowClick={(row: DataKit) =>
            this.setState({ selectedDatakit: row.name })
          }
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
                  <Button onClick={() => this.props.removeDataKit(name)}>
                    Delete
                  </Button>
                );
              },
            },
          ]}
        />
      </>
    );
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
      createDataKit,
      removeDataKit,
      updateDataKit,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DataKitList);
