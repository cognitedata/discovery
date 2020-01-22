import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import { Button, Tabs, Descriptions, List } from 'antd';
import moment from 'moment';
import { AssetIcon } from 'assets';
import { RootState } from '../../reducers/index';
import { ThreeDModel } from '../../modules/threed';
import {
  selectAssetById,
  ExtendedAsset,
  fetchAssets,
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

  .ant-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .ant-tabs-content {
    flex: 1;
    position: relative;
    height: 0;
  }

  .ant-tabs-tabpane {
    overflow: auto;
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
  model: ThreeDModel;
  revisionId: number;
  onGoToAssetClicked: (id: number) => void;
};

type Props = {
  push: typeof push;
  fetchAssets: typeof fetchAssets;
  assets: (ExtendedAsset | undefined)[];
  assetIds: number[];
} & OrigProps;

type State = {};

class TimeseriesSidebar extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    if (this.props.assetIds.length > 0 && this.props.model) {
      this.props.fetchAssets(this.props.assetIds.map(id => ({ id })));
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.assetIds.length !== prevProps.assetIds.length ||
      this.props.model.id !== prevProps.model.id
    ) {
      this.props.fetchAssets(this.props.assetIds.map(id => ({ id })));
    }
  }

  render() {
    const { model, revisionId } = this.props;
    const revision = model.revisions
      ? model.revisions.find(el => el.id === revisionId)
      : undefined;
    return (
      <Wrapper>
        <h1>{model.name}</h1>
        <ButtonRow>
          <Button type="primary" shape="round" disabled>
            Edit
          </Button>
          <Button type="danger" shape="circle" icon="delete" disabled />
        </ButtonRow>
        <Tabs size="small" tabBarGutter={6}>
          <Tabs.TabPane tab="Details" key="details">
            <Descriptions size="small" bordered column={1}>
              <Descriptions.Item label="ID">{model.id}</Descriptions.Item>
              <Descriptions.Item label="Created">
                {moment(model.createdTime).format('YYYY-MM-DD hh:mm')}
              </Descriptions.Item>
              {revision && (
                <>
                  <Descriptions.Item label="Revision ID">
                    {revision.id}
                  </Descriptions.Item>
                  <Descriptions.Item label="Asset Mapping Count">
                    {revision.assetMappingCount}
                  </Descriptions.Item>
                  <Descriptions.Item label="Published Status">
                    {revision.published ? 'true' : 'false'}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Linked Assets" key="assets">
            <>
              <Button disabled>Link an asset</Button>
              <List
                dataSource={this.props.assets}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button ghost type="danger" disabled>
                        Unlink
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Button
                          type="link"
                          icon="control"
                          onClick={() => {
                            if (item) {
                              this.props.onGoToAssetClicked(item.id);
                            }
                          }}
                        >
                          <img
                            src={AssetIcon}
                            alt=""
                            style={{ marginRight: '4px' }}
                          />
                          {item ? item.name : 'Loading...'}
                        </Button>
                      }
                    />
                  </List.Item>
                )}
              />
            </>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Metadata" key="metadata">
            <pre>{JSON.stringify(model.metadata, null, 2)}</pre>
          </Tabs.TabPane>
        </Tabs>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState, origProps: OrigProps) => {
  const representsAssets = Object.keys(state.threed.representsAsset)
    .filter(id => {
      const representations = state.threed.representsAsset[Number(id)];
      return (
        representations &&
        representations.some(
          representation =>
            representation.modelId === origProps.model.id &&
            representation.revisionId === origProps.revisionId
        )
      );
    })
    .map(assetId => Number(assetId));
  return {
    assetIds: representsAssets,
    assets: representsAssets
      ? representsAssets.map(id => selectAssetById(state, id))
      : [],
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ push, fetchAssets }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(TimeseriesSidebar);
