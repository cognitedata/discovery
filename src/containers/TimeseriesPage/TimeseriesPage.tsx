import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, Modal, notification } from 'antd';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import { TimeseriesChart } from '@cognite/gearbox';
import { RootState } from '../../reducers/index';
import LoadingWrapper from '../../components/LoadingWrapper';
import TimeseriesSidebar from './TimeseriesSidebar';
import {
  canEditTimeseries,
  canReadTimeseries,
} from '../../utils/PermissionsUtils';
import {
  deleteTimeseries,
  TimeseriesState,
  selectTimeseries,
  fetchTimeseries,
} from '../../modules/timeseries';

const BackSection = styled.div`
  padding: 22px 26px;
  border-bottom: 1px solid #d9d9d9;
`;

const Wrapper = styled.div`
  display: flex;
  flex: 1;
  height: 0;
`;

const TimeseriesView = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

type OrigProps = {
  match: {
    params: {
      itemId?: number;
      timeseriesId: number;
      tenant: string;
    };
  };
};

type Props = {
  timeseries: TimeseriesState;
  fetchTimeseries: typeof fetchTimeseries;
  deleteTimeseries: typeof deleteTimeseries;
  push: typeof push;
} & OrigProps;

type State = {};

class TimeseriesPage extends React.Component<Props, State> {
  postDeleted = false;

  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    canReadTimeseries();
    if (!this.timeseries) {
      this.props.fetchTimeseries([
        { id: this.props.match.params.timeseriesId },
      ]);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.match.params.timeseriesId !==
      prevProps.match.params.timeseriesId
    ) {
      this.props.fetchTimeseries([
        { id: this.props.match.params.timeseriesId },
      ]);
    }
  }

  get tenant() {
    return this.props.match.params.tenant;
  }

  get timeseries() {
    return this.props.timeseries.timeseriesData[
      this.props.match.params.timeseriesId
    ];
  }

  get itemId() {
    return this.props.match.params.itemId;
  }

  onBackClicked = () => {
    this.props.push(`/${this.props.match.params.tenant}/search/timeseries`);
  };

  onDeleteClicked = () => {
    if (!canEditTimeseries()) {
      return;
    }
    Modal.confirm({
      title: 'Do you want to delete this timeseries?',
      content: 'This is a irreversible change',
      onOk: async () => {
        const { id, name } = this.timeseries;
        this.postDeleted = true;
        await this.props.deleteTimeseries(id);
        notification.success({
          message: `Successfully Deleted ${name}`,
        });
        this.onBackClicked();
      },
      onCancel() {},
    });
  };

  onGoToAssetClicked = (id: number) => {
    this.props.push(`/${this.tenant}/asset/${id}`);
  };

  render() {
    return (
      <>
        <BackSection>
          <Button type="link" icon="arrow-left" onClick={this.onBackClicked}>
            Back to Search Result
          </Button>
        </BackSection>
        {this.timeseries ? (
          <Wrapper>
            <TimeseriesSidebar
              timeseries={this.timeseries}
              onGoToAssetClicked={this.onGoToAssetClicked}
              onDeleteClicked={this.onDeleteClicked}
            />
            <TimeseriesView>
              <TimeseriesChart
                timeseriesIds={[this.timeseries.id]}
                contextChart
                startTime={new Date().setFullYear(new Date().getFullYear() - 1)}
                zoomable
                crosshair
              />
            </TimeseriesView>
          </Wrapper>
        ) : (
          <LoadingWrapper>
            <p>Loading Timeseries...</p>
          </LoadingWrapper>
        )}
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    timeseries: selectTimeseries(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ push, fetchTimeseries, deleteTimeseries }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(TimeseriesPage);
