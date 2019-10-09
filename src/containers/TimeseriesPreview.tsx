import React from 'react';
import { Modal } from 'antd';
import { TimeseriesChartMeta } from '@cognite/gearbox';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { selectTimeseries, TimeseriesState } from '../modules/timeseries';
import { RootState } from '../reducers/index';
import { selectApp, AppState, setTimeseriesId } from '../modules/app';

type Props = {
  timeseries: TimeseriesState;
  app: AppState;
  setTimeseriesId: typeof setTimeseriesId;
};

class TimeseriesPreview extends React.PureComponent<Props, {}> {
  render() {
    const {
      timeseries: { timeseriesData },
      app: { timeseriesId },
    } = this.props;
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
        {timeseries && <TimeseriesChartMeta timeseriesId={timeseries.id} />}
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

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TimeseriesPreview);
