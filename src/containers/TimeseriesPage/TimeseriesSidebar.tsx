import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import { Button, Tabs, Descriptions, List } from 'antd';
import moment from 'moment';
import { GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import { RootState } from '../../reducers/index';
import {
  selectAssetById,
  ExtendedAsset,
  fetchAsset,
} from '../../modules/assets';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 360px;
  padding: 16px;
  border-right: 1px solid #d9d9d9;

  h1 {
    margin-top: 12px;
    margin-bottom: 0px;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  margin-bottom: 20px;
  margin-top: 24px;

  && > * {
    margin-left: 16px;
  }
  && > *:nth-child(1) {
    margin-left: 0px;
  }
`;

type OrigProps = {
  timeseries: GetTimeSeriesMetadataDTO;
  onGoToAssetClicked: (id: number) => void;
};

type Props = {
  push: typeof push;
  fetchAsset: typeof fetchAsset;
  asset: ExtendedAsset | undefined;
} & OrigProps;

type State = {};

class TimeseriesSidebar extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    if (this.props.timeseries.assetId && !this.props.asset) {
      this.props.fetchAsset(this.props.timeseries.assetId);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      prevProps.timeseries.id !== this.props.timeseries.id &&
      this.props.timeseries.assetId &&
      !this.props.asset
    ) {
      this.props.fetchAsset(this.props.timeseries.assetId);
    }
  }

  render() {
    const { timeseries } = this.props;
    return (
      <Wrapper>
        <h1>{timeseries.name}</h1>
        <ButtonRow>
          <Button type="primary" shape="round">
            Edit
          </Button>
          <Button type="danger" shape="circle" icon="delete" />
          <Button type="default" shape="circle" icon="ellipsis" />
        </ButtonRow>
        <Tabs size="small" tabBarGutter={6}>
          <Tabs.TabPane tab="Details" key="details">
            <Descriptions size="small" bordered column={1}>
              <Descriptions.Item label="Description">
                {timeseries.description}
              </Descriptions.Item>
              <Descriptions.Item label="External ID">
                {timeseries.externalId}
              </Descriptions.Item>
              <Descriptions.Item label="ID">{timeseries.id}</Descriptions.Item>
              <Descriptions.Item label="Unit">
                {timeseries.unit}
              </Descriptions.Item>
              <Descriptions.Item label="Is Step">
                {timeseries.isStep ? 'true' : 'false'}
              </Descriptions.Item>
              <Descriptions.Item label="Is String">
                {timeseries.isString ? 'true' : 'false'}
              </Descriptions.Item>
              <Descriptions.Item label="Created Time">
                {moment(timeseries.createdTime).format('YYYY-MM-DD hh:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Last Modified">
                {moment(timeseries.lastUpdatedTime).format('YYYY-MM-DD hh:mm')}
              </Descriptions.Item>
            </Descriptions>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Linked Assets" key="assets">
            <>
              <Button>Link an asset</Button>
              <List
                dataSource={
                  timeseries.assetId
                    ? [
                        {
                          name: this.props.asset
                            ? this.props.asset.name
                            : 'Loading...',
                          id: timeseries.assetId,
                        },
                      ]
                    : []
                }
                loading={!!timeseries.assetId && !this.props.asset}
                rowKey={item => (item ? `${item.id}` : 'asset')}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button ghost type="danger">
                        Unlink
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Button
                          ghost
                          type="primary"
                          icon="control"
                          onClick={() => this.props.onGoToAssetClicked(item.id)}
                        >
                          {item.name}
                        </Button>
                      }
                    />
                  </List.Item>
                )}
              />
            </>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Metadata" key="metadata">
            <pre>{JSON.stringify(timeseries.metadata, null, 2)}</pre>
          </Tabs.TabPane>
        </Tabs>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState, origProps: OrigProps) => {
  return {
    asset: origProps.timeseries.assetId
      ? selectAssetById(state, origProps.timeseries.assetId)
      : undefined,
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ push, fetchAsset }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(TimeseriesSidebar);
