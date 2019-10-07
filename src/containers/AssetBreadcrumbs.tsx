import React, { Component } from 'react';
import { Breadcrumb, Button } from 'antd';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import styled from 'styled-components';
import {
  selectAssets,
  selectCurrentAsset,
  AssetsState,
  ExtendedAsset,
} from '../modules/assets';
import { selectApp, setAssetId, AppState } from '../modules/app';
import { RootState } from '../reducers/index';
import { trackUsage } from '../utils/metrics';

const StyledBreadcrumbs = styled(Breadcrumb)`
  z-index: 100;
`;

class AssetBreadcrumbs extends Component<
  {
    assets: AssetsState;
    app: AppState;
    asset: ExtendedAsset | undefined;
    setAssetId: typeof setAssetId;
  },
  {}
> {
  get parentIds() {
    const {
      assets: { all },
      app: { assetId },
    } = this.props;
    const parentIds: number[] = [assetId!];
    while (all[parentIds[parentIds.length - 1]]) {
      const { parentId } = all[parentIds[parentIds.length - 1]];
      if (parentId) {
        parentIds.push(parentId);
      } else {
        break;
      }
    }
    return parentIds;
  }

  render() {
    const {
      asset,
      assets: { all },
    } = this.props;
    if (!asset) {
      return null;
    }
    const breadcrumbs = [];
    const { parentIds } = this;
    for (let i = parentIds.length - 1; i >= 0; i--) {
      breadcrumbs.push(
        <Breadcrumb.Item key={parentIds[i]}>
          <Button
            onClick={() => {
              trackUsage('AssetBreadcrumbs.Clicked', { assetId: parentIds[i] });
              this.props.setAssetId(this.props.app.rootAssetId!, parentIds[i]);
            }}
          >
            {all[parentIds[i]] ? all[parentIds[i]].name : 'Loading...'}
          </Button>
        </Breadcrumb.Item>
      );
    }
    return <StyledBreadcrumbs>{breadcrumbs}</StyledBreadcrumbs>;
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    assets: selectAssets(state),
    asset: selectCurrentAsset(state),
    app: selectApp(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      setAssetId,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetBreadcrumbs);
