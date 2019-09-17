import React from 'react';
import { Modal } from 'antd';
import { TimeseriesChartMeta } from '@cognite/gearbox';

type Props = {
  timeseries: {
    id: number;
    name: string;
  };
  onClose: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
};

class TimeseriesPreview extends React.PureComponent<Props, {}> {
  render() {
    return (
      <Modal
        visible
        width={1000}
        title={this.props.timeseries.name}
        onCancel={this.props.onClose}
        footer={[null, null]}
      >
        <TimeseriesChartMeta timeseriesId={this.props.timeseries.id} />
      </Modal>
    );
  }
}

export default TimeseriesPreview;
