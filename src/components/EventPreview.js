import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'antd';

import { EventPreview as GearboxEventPreview } from '@cognite/gearbox';

class EventPreview extends React.PureComponent {
  render() {
    return (
      <Modal
        visible
        title="Event"
        onCancel={this.props.onClose}
        footer={[null, null]}
      >
        <GearboxEventPreview eventId={this.props.eventId} />
      </Modal>
    );
  }
}

EventPreview.propTypes = {
  eventId: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default EventPreview;
