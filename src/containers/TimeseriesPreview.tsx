import React from 'react';
import { Modal, Button, Descriptions } from 'antd';
import { TimeseriesChartMeta } from '@cognite/gearbox';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import moment from 'moment';
import { selectTimeseries, TimeseriesState } from '../modules/timeseries';
import { RootState } from '../reducers/index';
import { selectAppState, AppState, setTimeseriesId } from '../modules/app';
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
          <Button onClick={() => this.setState({ editModal: true })}>
            Edit Timeseries
          </Button>
          <Descriptions size="small" column={1} style={{ marginTop: '12px' }}>
            <Descriptions.Item label="Description">
              {timeseries ? timeseries.description : 'Loading...'}
            </Descriptions.Item>
            <Descriptions.Item label="External Id">
              {timeseries ? timeseries.externalId : 'Loading...'}
            </Descriptions.Item>
            <Descriptions.Item label="Unit">
              {timeseries ? timeseries.unit : 'Loading...'}
            </Descriptions.Item>
            <Descriptions.Item label="Created Time">
              {timeseries
                ? moment(timeseries.createdTime).format('YYYY-MM-DD hh:mm')
                : 'Loading...'}
            </Descriptions.Item>
            <Descriptions.Item label="Last Updated Time">
              {timeseries
                ? moment(timeseries.lastUpdatedTime).format('YYYY-MM-DD hh:mm')
                : 'Loading...'}
            </Descriptions.Item>
          </Descriptions>
          {timeseries && !editModal && (
            <TimeseriesChartMeta
              timeseriesId={timeseries.id}
              showDescription={false}
            />
          )}
        </>
      </Modal>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    timeseries: selectTimeseries(state),
    app: selectAppState(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ setTimeseriesId }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(TimeseriesPreview);
