import React from 'react'
import { connect } from 'react-redux';
import PropTypes from 'prop-types'
import { Modal, Button } from 'antd';

import { Event } from '@cognite/sdk';
import { EventPreview as GearboxEventPreview } from '@cognite/gearbox';

class EventPreview extends React.Component {
  render() {
    return (
      <Modal
        visible={true}
        title="Event"
        onCancel={this.props.onClose}
        footer={[null, null]}
      >
        <GearboxEventPreview 
          eventId={this.props.eventId}
        />
      </Modal>
    )
  }
}

export default EventPreview;
