import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import { Button } from 'antd';
import { GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import Table, { ColumnProps } from 'antd/lib/table';
import moment from 'moment';
import VerticallyCenteredRow from 'components/VerticallyCenteredRow';
import FlexTableWrapper from 'components/FlexTableWrapper';
import { TimeseriesChartMeta } from '@cognite/gearbox';
import LoadingWrapper from 'components/LoadingWrapper';
import LinkTimeseriesModal from 'containers/Modals/LinkTimeseriesModal';
import { ExtendedAsset } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import {
  fetchTimeseriesForAssetId,
  selectTimeseriesByAssetId,
  selectTimeseries,
  addTimeseriesToState,
} from '../../modules/timeseries';
import ViewingDetailsNavBar from '../../components/ViewingDetailsNavBar';
import { sdk } from '../../index';
import { canEditTimeseries } from '../../utils/PermissionsUtils';
import { trackUsage } from '../../utils/Metrics';

const Wrapper = styled.div`
  height: 100%;
  padding: 24px 56px;
  display: flex;
  flex-direction: column;

  h1 {
    margin-top: 12px;
    margin-bottom: 0px;
  }
`;

type OrigProps = {
  asset?: ExtendedAsset;
  timeseriesId?: number;
  onSelect: (id: number) => void;
  onClearSelection: () => void;
  onNavigateToPage: (type: string, id: number) => void;
};

type Props = {
  timeseries: GetTimeSeriesMetadataDTO[] | undefined;
  selectedTimeseries: GetTimeSeriesMetadataDTO | undefined;
  push: typeof push;
  fetchTimeseriesForAssetId: typeof fetchTimeseriesForAssetId;
  addTimeseriesToState: typeof addTimeseriesToState;
} & OrigProps;

type State = {
  linkTimeseriesModal: boolean;
};

class AssetTimeseriesSection extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { linkTimeseriesModal: false };
  }

  componentDidMount() {
    if (this.props.asset) {
      this.props.fetchTimeseriesForAssetId(this.props.asset.id);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.asset &&
      (!prevProps.asset || this.props.asset.id !== prevProps.asset.id)
    ) {
      this.props.fetchTimeseriesForAssetId(this.props.asset.id);
    }
  }

  get columns(): ColumnProps<GetTimeSeriesMetadataDTO>[] {
    return [
      {
        title: 'Name',
        key: 'name',
        dataIndex: 'name',
      },
      {
        title: 'Description',
        key: 'description',
        dataIndex: 'description',
      },
      {
        title: 'Last Modified',
        key: 'last-modified',
        render: item => {
          return moment(item.updatedTime).format('YYYY-MM-DD hh:mm');
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        render: item => {
          return (
            <>
              <Button
                onClick={e => {
                  e.stopPropagation();
                  this.onUnlinkClicked(item.id);
                }}
                ghost
                type="danger"
                disabled={!canEditTimeseries(false)}
              >
                Unlink
              </Button>
            </>
          );
        },
      },
    ];
  }

  onUnlinkClicked = async (timeseriesId: number) => {
    trackUsage('AssetPage.TimeseresSection.Unlink', {
      timeseriesId,
    });
    if (!canEditTimeseries()) {
      return;
    }
    const timeseries = await sdk.timeseries.update([
      { id: timeseriesId, update: { assetId: { setNull: true } } },
    ]);

    this.props.addTimeseriesToState(timeseries);
  };

  renderItem = () => {
    const { selectedTimeseries, timeseriesId } = this.props;
    if (timeseriesId && selectedTimeseries) {
      return (
        <>
          <ViewingDetailsNavBar
            name={selectedTimeseries.name || 'Timeseries'}
            description={selectedTimeseries.description || ''}
            onButtonClicked={() =>
              this.props.onNavigateToPage('timeseries', timeseriesId)
            }
            onBackClicked={this.props.onClearSelection}
          />
          <div
            style={{
              marginTop: '24px',
            }}
          >
            <TimeseriesChartMeta
              timeseriesId={timeseriesId}
              showMetadata={false}
              showDescription={false}
              showDatapoint={false}
              liveUpdate={!selectedTimeseries.isString}
              updateIntervalMillis={2000}
            />
          </div>
        </>
      );
    }
    return (
      <>
        <ViewingDetailsNavBar
          name="Timeseries"
          description="Loading..."
          onButtonClicked={() => {}}
          onBackClicked={this.props.onClearSelection}
        />
        <LoadingWrapper>Loading Timeseries</LoadingWrapper>
      </>
    );
  };

  render() {
    const { timeseries, timeseriesId } = this.props;
    const { linkTimeseriesModal } = this.state;
    if (timeseriesId) {
      return this.renderItem();
    }
    return (
      <Wrapper>
        <VerticallyCenteredRow>
          <div className="left">
            <p />
          </div>
          <div className="right">
            <Button
              icon="plus"
              type="primary"
              disabled={!canEditTimeseries(false)}
              onClick={() => this.setState({ linkTimeseriesModal: true })}
            >
              Link Timeseries
            </Button>
          </div>
        </VerticallyCenteredRow>
        <FlexTableWrapper>
          <Table
            dataSource={timeseries}
            columns={this.columns}
            scroll={{ y: true }}
            pagination={{
              position: 'bottom',
              showQuickJumper: true,
              showSizeChanger: true,
            }}
            onRow={(row: GetTimeSeriesMetadataDTO) => ({
              onClick: () => {
                this.props.onSelect(row.id);
              },
            })}
            loading={!timeseries}
          />
        </FlexTableWrapper>
        {linkTimeseriesModal && (
          <LinkTimeseriesModal
            asset={this.props.asset!}
            onClose={() => this.setState({ linkTimeseriesModal: false })}
          />
        )}
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState, origProps: OrigProps) => {
  return {
    timeseries: origProps.asset
      ? selectTimeseriesByAssetId(state, origProps.asset.id)
      : undefined,
    selectedTimeseries: origProps.timeseriesId
      ? selectTimeseries(state).timeseriesData[origProps.timeseriesId]
      : undefined,
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    { push, fetchTimeseriesForAssetId, addTimeseriesToState },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetTimeseriesSection);
