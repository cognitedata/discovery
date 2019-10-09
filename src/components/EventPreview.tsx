import React from 'react';
import { Modal, List } from 'antd';

import { EventPreview as GearboxEventPreview } from '@cognite/gearbox';
import { CogniteEvent } from '@cognite/sdk';

type Props = {
  eventId: number;
  onClose: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
};

type State = {
  showDetails?: CogniteEvent;
};

class EventPreview extends React.PureComponent<Props, State> {
  readonly state: Readonly<State> = {
    showDetails: undefined,
  };

  renderDetailsWorkorder() {
    const event = this.state.showDetails;
    const fields: { [key: string]: string } = {
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
            description={event && event.metadata && event.metadata[item]}
          />
        )}
      />
    );
  }

  renderDetails() {
    const event = this.state.showDetails;
    if (event && event.type === 'Workorder') {
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

export default EventPreview;
