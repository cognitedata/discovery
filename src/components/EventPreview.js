import React from 'react';
import PropTypes from 'prop-types';
import { Modal, List } from 'antd';

import { EventPreview as GearboxEventPreview } from '@cognite/gearbox';

class EventPreview extends React.PureComponent {
  state = {
    showDetails: undefined,
  };

  renderDetailsWorkorder() {
    const event = this.state.showDetails;
    const fields = {
      DESCRIPTION_1: 'Description',
      LOCATION: 'Area',
      OBJECTNUMBER: 'Object number',
      SOURCE: 'Source',
      WORKORDER_ID: 'Work order id',
    };

    return (
      <List
        dataSource={Object.keys(fields)}
        renderItem={item => (
          <List.Item.Meta
            title={fields[item]}
            description={event.metadata[item]}
          />
        )}
      />
    );
  }

  renderDetails() {
    const event = this.state.showDetails;
    if (event.type === 'Workorder') {
      return this.renderDetailsWorkorder();
    }
    return <></>;
  }

  render() {
    return (
      <Modal
        visible
        title="Event"
        onCancel={this.props.onClose}
        footer={[null, null]}
      >
        <GearboxEventPreview
          eventId={this.props.eventId}
          onShowDetails={event => {
            this.setState({ showDetails: event });
          }}
        />
        {this.state.showDetails && this.renderDetails()}
      </Modal>
    );
  }
}

EventPreview.propTypes = {
  eventId: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default EventPreview;
