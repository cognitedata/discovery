import React, { Component } from 'react';
import { List } from 'antd';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { RootState } from '../../reducers/index';
import { selectApp, setAssetId } from '../../modules/app';
import { trackUsage } from '../../utils/metrics';
import {
  selectAssets,
  fetchRootAssets,
  AssetsState,
} from '../../modules/assets';

type Props = {
  setAssetId: typeof setAssetId;
  fetchRootAssets: typeof fetchRootAssets;
  assets: AssetsState;
  tenant: string;
};
class ModelList extends Component<Props, {}> {
  componentDidMount() {
    this.props.fetchRootAssets();
  }

  render() {
    const {
      assets: { all },
    } = this.props;
    const items = Object.values(all).filter(asset => asset.rootId === asset.id);
    return (
      <List
        itemLayout="horizontal"
        dataSource={items}
        locale={{
          emptyText: 'No root assets found!',
        }}
        renderItem={item => {
          return (
            <List.Item
              onClick={() => {
                this.props.setAssetId(item.rootId, item.id);
                trackUsage('RootAssetList.SelectAsset', {
                  assetId: item.rootId,
                });
              }}
              style={{
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              <List.Item.Meta
                title={item.name}
                description={item.description}
              />
            </List.Item>
          );
        }}
      />
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    assets: selectAssets(state),
    tenant: selectApp(state).tenant!,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      fetchRootAssets,
      setAssetId,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ModelList);
