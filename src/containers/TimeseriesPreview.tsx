import React from 'react';
import { Modal, Button, Descriptions } from 'antd';
import { TimeseriesChartMeta } from '@cognite/gearbox';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { selectTimeseries, TimeseriesState } from '../modules/timeseries';
import { RootState } from '../reducers/index';
import { selectApp, AppState, setTimeseriesId } from '../modules/app';
import EditTimeseriesModal from './Modals/EditTimeseriesModal';

type Props = {
  timeseries: TimeseriesState;
  app: AppState;
  setTimeseriesId: typeof setTimeseriesId;
};
type State = { editModal: boolean };

class TimeseriesPreview extends React.PureComponent<Props, State> {
  readonly state: Readonly<State> = {
    editModal: false,
  };

  render() {
    const {
      timeseries: { timeseriesData },
      app: { timeseriesId },
    } = this.props;
    const { editModal } = this.state;
    let timeseries;
    if (timeseriesId) {
      timeseries = timeseriesData[timeseriesId];
    }
    return (
      <Modal
        visible={timeseriesId !== undefined}
        width={1000}
        title={timeseries ? timeseries.name! : 'Loading...'}
        onCancel={() => this.props.setTimeseriesId(undefined)}
        footer={[null, null]}
      >
        <>
          {editModal && timeseriesId && (
            <EditTimeseriesModal
              timeseriesId={timeseriesId}
              onClose={() =>
                // Needed because the TimeseriesChartMeta does not know if we updated the timeseries or not
                setTimeout(() => this.setState({ editModal: false }), 700)
              }
            />
          )}
          <Descriptions title="Timeseries Details" size="small" column={1}>
            <Descriptions.Item label="Description">
              {timeseries ? timeseries.description : 'Loading...'}
            </Descriptions.Item>
            <Descriptions.Item label="External Id">
              {timeseries ? timeseries.externalId : 'Loading...'}
            </Descriptions.Item>
            <Descriptions.Item label="Unit">
              {timeseries ? timeseries.unit : 'Loading...'}
            </Descriptions.Item>
          </Descriptions>
          <Button onClick={() => this.setState({ editModal: true })}>
            Edit Timeseries
          </Button>
          {timeseries && !editModal && (
            <TimeseriesChartMeta timeseriesId={timeseries.id} />
          )}
        </>
      </Modal>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    timeseries: selectTimeseries(state),
    app: selectApp(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ setTimeseriesId }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(TimeseriesPreview);
