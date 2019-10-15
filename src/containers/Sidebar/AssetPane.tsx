import React from 'react';
import { connect } from 'react-redux';
import {
  List,
  Spin,
  Collapse,
  Button,
  Icon,
  Popconfirm,
  Switch,
  Pagination,
  Descriptions,
} from 'antd';

import styled from 'styled-components';
import moment from 'moment';
import { bindActionCreators, Dispatch } from 'redux';
import { FilesMetadata } from '@cognite/sdk';
import {
  selectTimeseries,
  removeAssetFromTimeseries,
  TimeseriesState,
  fetchTimeseries,
} from '../../modules/timeseries';
import {
  selectTypes,
  removeTypeFromAsset,
  Type,
  TypesState,
} from '../../modules/types';
import {
  fetchEvents,
  selectEventsByAssetId,
  EventsAndTypes,
} from '../../modules/events';
import AddTypes from '../Modals/AddTypesModal';
import { createAssetTitle } from '../../utils/utils';
import { selectThreeD, ThreeDState } from '../../modules/threed';
import {
  ExtendedAsset,
  fetchAsset,
  deleteAsset,
  selectAssets,
  AssetsState,
} from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { sdk } from '../../index';
import AddChildAsset from '../Modals/AddChildAssetModal';
import { selectFiles } from '../../modules/files';
import { deleteAssetNodeMapping } from '../../modules/assetmappings';
import EditAssetModal from '../Modals/EditAssetModal';
import { selectApp, AppState, setAssetId } from '../../modules/app';
import RootAssetList from './RootAssetList';
import MapNodeToAssetForm from '../MapNodeToAssetForm';
import TimeseriesSection from './TimeseriesSection';
import { trackUsage } from '../../utils/metrics';
import EventsSection from './EventsSection';

const { Panel } = Collapse;

const EditHieraryToggle = styled.div`
  margin-top: 16px;
  span {
    margin-left: 8px;
  }
`;

const SpinContainer = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
`;

const HeaderWithButton = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
`;
const MetadataPanel = styled(Panel)`
  display: flex;
  max-height: 500px;
  flex-direction: column;
  && .ant-collapse-content {
    overflow: auto;
    flex: 1;
  }
`;

type OrigProps = {};

type Props = {
  doFetchEvents: typeof fetchEvents;
  doFetchTimeseries: typeof fetchTimeseries;
  doRemoveAssetFromTimeseries: typeof removeAssetFromTimeseries;
  deleteAssetNodeMapping: typeof deleteAssetNodeMapping;
  doRemoveTypeFromAsset: typeof removeTypeFromAsset;
  deleteAsset: typeof deleteAsset;
  setAssetId: typeof setAssetId;
  timeseries: TimeseriesState;
  events: EventsAndTypes;
  threed: ThreeDState;
  app: AppState;
  assets: AssetsState;
  types: TypesState;
  files?: FilesMetadata[];
} & OrigProps;

type State = {
  showAddChild: boolean;
  showAddTypes: boolean;
  showeditAsset: boolean;
  showEvent?: number;
  asset?: ExtendedAsset;
  activeCollapsed?: any[];
  showEditHierarchy: boolean;
  disableEditHierarchy: boolean;
  documentsTablePage: number;
};

class AssetDrawer extends React.Component<Props, State> {
  readonly state: Readonly<State> = {
    showAddChild: false,
    showeditAsset: false,
    showEditHierarchy: false,
    disableEditHierarchy: true,
    documentsTablePage: 0,
    showAddTypes: false,
  };

  componentDidMount() {
    const { doFetchTimeseries, doFetchEvents, app } = this.props;
    if (app.assetId) {
      doFetchTimeseries(app.assetId);
      doFetchEvents(app.assetId);
    }
    this.resetState();
  }

  componentDidUpdate(prevProps: Props) {
    const {
      doFetchTimeseries,
      doFetchEvents,
      app,
      assets: { all },
    } = this.props;
    if (prevProps.app.assetId !== app.assetId && app.assetId) {
      doFetchTimeseries(app.assetId);
      doFetchEvents(app.assetId);
      this.resetState();
    }
    if (app.assetId && all[app.assetId] !== prevProps.assets.all[app.assetId]) {
      this.resetState();
    }
  }

  get asset() {
    if (this.props.app.assetId) {
      return this.props.assets.all[this.props.app.assetId];
    }
    return undefined;
  }

  addTypeClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    const { asset } = this.state;
    trackUsage('AssetPane.AddTypeClick', {
      assetId: asset && asset.id,
    });
    this.setState({ showAddTypes: true });
    event.stopPropagation();
  };

  onModalClose = () => {
    trackUsage('AssetPane.HideModals', {
      showEvent: this.state.showEvent,
      showAddChild: this.state.showAddChild,
      showeditAsset: this.state.showeditAsset,
      showAddTypes: this.state.showAddTypes,
    });
    this.setState({
      showEvent: undefined,
      showAddChild: false,
      showeditAsset: false,
      showAddTypes: false,
    });
  };

  renderTypes = (asset: ExtendedAsset, types: Type[]) => (
    <Panel
      header={
        <HeaderWithButton>
          <span>Types ({types.length})</span>
          <Button type="primary" onClick={this.addTypeClick}>
            Add
          </Button>
        </HeaderWithButton>
      }
      key="types"
    >
      {types.map(type => (
        <HeaderWithButton key={`ts_${type.id}`}>
          {type.name}
          <Popconfirm
            title="Are you sure？"
            okText="Yes"
            cancelText="No"
            onConfirm={() => this.props.doRemoveTypeFromAsset(type, asset)}
          >
            <Button type="danger">
              <Icon type="delete" />
            </Button>
          </Popconfirm>
        </HeaderWithButton>
      ))}
    </Panel>
  );

  onCollapseChange = (change: string | string[]) => {
    trackUsage('AssetPane.VisiblePanes', {
      change,
    });
    this.setState({ activeCollapsed: change as string[] });
  };

  resetState = () => {
    if (this.asset) {
      this.setState({
        disableEditHierarchy: !!(
          this.asset!.metadata && this.asset!.metadata!.SOURCE
        ),
        documentsTablePage: 0,
      });
    }
  };

  renderExternalLinks = (assetId: number) => {
    const { project } = sdk;

    const opintUrl = `https://opint.cogniteapp.com/${project}/assets/${assetId}`;
    return (
      <Panel header={<span>External links</span>} key="links">
        <Button
          type="link"
          onClick={() => {
            window.open(opintUrl);
            trackUsage('AssetPane.OpenInsights', {});
          }}
        >
          Operational Intelligence
        </Button>
      </Panel>
    );
  };

  renderMetadata = () => {
    const { asset } = this;

    return (
      <MetadataPanel header={<span>Metadata</span>} key="metadata">
        <Descriptions size="small" column={1}>
          {asset && asset.metadata ? (
            Object.keys(asset.metadata).map(key => (
              <Descriptions.Item
                key={key}
                label={key.replace(/^\w/, c => c.toUpperCase())}
              >
                {asset.metadata![key]}
              </Descriptions.Item>
            ))
          ) : (
            <Spin />
          )}
        </Descriptions>
      </MetadataPanel>
    );
  };

  renderEdit = (asset: ExtendedAsset) => {
    const { project } = sdk;
    const {
      app: { revisionId, modelId, rootAssetId },
    } = this.props;
    return (
      <Panel header={<span>Edit Asset Hierarchy</span>} key="edit">
        <Button
          type="primary"
          onClick={() => {
            this.setState({ showAddChild: true });
            trackUsage('AssetEditSection.ShowAdd', {});
          }}
        >
          Add Child Asset
        </Button>
        <br />
        <br />
        <Button
          type="primary"
          onClick={() => {
            this.setState({ showeditAsset: true });
            trackUsage('AssetEditSection.ShoweditAsset', {});
          }}
        >
          Edit Asset
        </Button>
        <br />
        <br />
        <Popconfirm
          title="Are you sure you want to remove this asset and all its children?"
          onConfirm={() => {
            this.props.deleteAsset(asset.id);
            if (revisionId && modelId) {
              this.props.deleteAssetNodeMapping(modelId, revisionId, asset.id);
            }
            this.props.setAssetId(rootAssetId!, asset.parentId || asset.rootId);
          }}
          okText={`Yes (deleteing for tenant ${project})`}
          cancelText="No"
        >
          <Button type="danger">Delete (with Children)</Button>
        </Popconfirm>
      </Panel>
    );
  };

  renderDocuments = (assetId: number) => {
    const { project } = sdk;
    const { files } = this.props;
    const { documentsTablePage } = this.state;

    return (
      <Panel
        header={<span>Documents ({files ? files.length : 0})</span>}
        key="documents"
      >
        <List
          itemLayout="horizontal"
          dataSource={
            files
              ? files.slice(
                  documentsTablePage * 10,
                  documentsTablePage * 10 + 10
                )
              : []
          }
          renderItem={item => (
            <List.Item>
              <List.Item.Meta
                title={
                  <a
                    href={`https://opint.cogniteapp.com/${project}/assets/${assetId}/docs?doc=${item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.name}
                  </a>
                }
                description={`${item.mimeType}, ${item.source}, ${moment(
                  item.uploadedTime
                ).format('DD-MM-YYYY')}`}
              />
            </List.Item>
          )}
        />
        <Pagination
          simple
          current={documentsTablePage + 1}
          total={files ? files.length : 0}
          onChange={page => {
            this.setState({ documentsTablePage: page - 1 });
            trackUsage('DocumentSection.PaginationChange', { page });
          }}
        />
      </Panel>
    );
  };

  render() {
    const { asset } = this;
    const {
      threed: { models },
      timeseries,
    } = this.props;
    const { assetId, modelId } = this.props.app;
    if (!assetId && !modelId) {
      return (
        <>
          <h3>{`Root Assets in ${sdk.project}`}</h3>
          <RootAssetList />
        </>
      );
    }
    if (!assetId && modelId) {
      return (
        <>
          <h3>{`No Asset linked to ${
            models[modelId] ? models[modelId].name : 'Loading...'
          } right now`}</h3>
          <MapNodeToAssetForm />
        </>
      );
    }

    if (!asset) {
      return (
        <SpinContainer>
          <Spin />
        </SpinContainer>
      );
    }
    const { showeditAsset, showAddChild, showAddTypes } = this.state;

    const allTypes = this.props.types.items ? this.props.types.items : [];
    const events = this.props.events.items ? this.props.events.items : [];

    const types = asset.types ? asset.types : [];

    const defaultActiveKey = this.state.activeCollapsed
      ? this.state.activeCollapsed
      : [];

    return (
      <>
        {asset != null && showAddTypes && (
          <AddTypes
            assetId={asset.id}
            asset={asset}
            onClose={this.onModalClose}
            types={allTypes}
          />
        )}
        {asset != null && showAddChild && (
          <AddChildAsset
            assetId={asset.id}
            asset={asset}
            onClose={this.onModalClose}
          />
        )}
        {asset != null && showeditAsset && (
          <EditAssetModal
            assetId={asset.id}
            onClose={this.onModalClose}
            rootAssetId={asset.rootId}
          />
        )}
        <div>
          <h3>{createAssetTitle(asset)}</h3>
          {asset.description && <p>{asset.description}</p>}
          {
            <Collapse
              onChange={this.onCollapseChange}
              defaultActiveKey={defaultActiveKey}
            >
              {asset != null && this.renderExternalLinks(asset.id)}

              <Panel
                header={
                  <span>
                    Timeseries ({Object.keys(timeseries.timeseriesData).length})
                  </span>
                }
                key="timeseries"
              >
                <TimeseriesSection />
              </Panel>
              {this.renderTypes(asset, types)}
              {this.renderDocuments(asset.id)}

              <Panel header={<span>Event ({events.length})</span>} key="events">
                <EventsSection />
              </Panel>
              {this.renderMetadata()}
              {this.state.showEditHierarchy && this.renderEdit(asset)}
            </Collapse>
          }
          <EditHieraryToggle>
            <Switch
              disabled={this.state.disableEditHierarchy}
              onChange={checked =>
                this.setState({ showEditHierarchy: checked })
              }
            />
            <span>Hierarchy Editing</span>
          </EditHieraryToggle>
        </div>
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectApp(state),
    assets: selectAssets(state),
    timeseries: selectTimeseries(state),
    threed: selectThreeD(state),
    events: state.app.assetId
      ? selectEventsByAssetId(state, state.app.assetId)
      : {
          items: [],
          types: [],
        },
    types: selectTypes(state),
    files: state.app.assetId
      ? selectFiles(state).byAssetId[state.app.assetId]
      : [],
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doFetchTimeseries: fetchTimeseries,
      doFetchEvents: fetchEvents,
      doRemoveAssetFromTimeseries: removeAssetFromTimeseries,
      deleteAsset,
      doRemoveTypeFromAsset: removeTypeFromAsset,
      deleteAssetNodeMapping,
      doFetchAsset: fetchAsset,
      setAssetId,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetDrawer);
