import React from 'react';
import { connect } from 'react-redux';
import { List, Button, Icon, Popconfirm, Pagination } from 'antd';
import moment from 'moment';
import { bindActionCreators, Dispatch } from 'redux';
import { CogniteEvent } from '@cognite/sdk';
import { selectAssets } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { selectApp, AppState } from '../../modules/app';
import { trackUsage } from '../../utils/metrics';
import EventPreview from '../../components/EventPreview';
import { selectEventsByAssetId, deleteEvent } from '../../modules/events';
import { SidebarPaneListContent } from './TimeseriesSection';

type OrigProps = {};

type Props = {
  events: CogniteEvent[];
  app: AppState;
  deleteEvent: typeof deleteEvent;
} & OrigProps;

type State = {
  eventsTablePage: number;
  visibleEventId?: number;
};

class EventsSection extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      eventsTablePage: 0,
      visibleEventId: undefined,
    };
  }

  resetState = () => {
    this.setState({
      eventsTablePage: 0,
    });
  };

  eventOnClick = (eventId: number) => {
    trackUsage('AssetPane.EventClick', {
      eventId,
    });
    this.setState({ visibleEventId: eventId });
  };

  onModalClose = () => {
    this.setState({ visibleEventId: undefined });
  };

  render() {
    const { events } = this.props;
    const { eventsTablePage, visibleEventId } = this.state;
    return (
      <>
        {visibleEventId != null && (
          <EventPreview eventId={visibleEventId} onClose={this.onModalClose} />
        )}
        <List
          itemLayout="horizontal"
          dataSource={
            events
              ? events.slice(eventsTablePage * 10, eventsTablePage * 10 + 10)
              : []
          }
          renderItem={event => (
            <List.Item>
              <SidebarPaneListContent>
                <p
                  className="title"
                  onClick={() => this.eventOnClick(event.id)}
                  role="presentation"
                >
                  {moment
                    .unix((event.startTime! as number) / 1000)
                    .format('YYYY-MM-DD HH:mm')}
                </p>
                <p className="subtitle">{event.description}</p>
              </SidebarPaneListContent>
              <div>
                <Popconfirm
                  title="Are you sure？"
                  okText="Yes"
                  cancelText="No"
                  onConfirm={() => this.props.deleteEvent(event.id)}
                >
                  <Button type="danger">
                    <Icon type="delete" />
                  </Button>
                </Popconfirm>
              </div>
            </List.Item>
          )}
        />
        <Pagination
          simple
          current={eventsTablePage + 1}
          total={events ? events.length : 0}
          onChange={page => {
            this.setState({ eventsTablePage: page - 1 });
            trackUsage('EventsSection.PaginationChange', { page });
          }}
        />
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectApp(state),
    assets: selectAssets(state),
    events: state.app.assetId
      ? selectEventsByAssetId(state, state.app.assetId).items
      : [],
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ deleteEvent }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(EventsSection);
