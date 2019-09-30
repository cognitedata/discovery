import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, Divider, message } from 'antd';
import moment from 'moment';
import styled from 'styled-components';
import {
  selectThreeD,
  ThreeDState,
  setRevisionRepresentAsset,
} from '../../modules/threed';
import {
  selectAssets,
  AssetsState,
  createNewAsset,
  fetchAssets,
} from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { selectApp, AppState } from '../../modules/app';
import { sdk } from '../../index';
import {
  FilesMetadataWithDownload,
  FileExplorerTabsType,
} from './FileExplorer';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ItemPreview = styled.div`
  display: flex;
  flex: 1;
  margin-top: 12px;
  .content {
    flex: 2;
  }
  .preview {
    flex: 1 400px;
    margin-right: 12px;
    background-repeat: no-repeat;
    background-size: contain;
  }
  .preview img {
    width: 100%;
  }
`;

type OrigProps = {
  selectedDocument: FilesMetadataWithDownload;
  unselectDocument: () => void;
};

type Props = {
  app: AppState;
  assets: AssetsState;
  threed: ThreeDState;
  fetchAssets: typeof fetchAssets;
  createNewAsset: typeof createNewAsset;
  setRevisionRepresentAsset: typeof setRevisionRepresentAsset;
} & OrigProps;

type State = { filePreviewUrl?: string };

class MapModelToAssetForm extends React.Component<Props, State> {
  state: Readonly<State> = {};

  componentDidMount() {
    this.componentDidUpdate();
  }

  componentDidUpdate() {
    if (
      (this.type === 'images' || this.type === 'documents') &&
      !this.state.filePreviewUrl
    ) {
      this.fetchFileUrl();
    }
  }

  get type(): FileExplorerTabsType {
    const { mimeType } = this.props.selectedDocument;
    if (!mimeType) {
      return 'all';
    }
    if (mimeType.toLowerCase().indexOf('pdf') !== -1) {
      return 'documents';
    }
    if (
      mimeType.toLowerCase().indexOf('png') !== -1 ||
      mimeType.toLowerCase().indexOf('jpeg') !== -1
    ) {
      return 'images';
    }
    return 'all';
  }

  fetchFileUrl = async () => {
    const { selectedDocument } = this.props;
    const [url] = await sdk.files.getDownloadUrls([
      { id: selectedDocument.id },
    ]);
    this.setState({
      filePreviewUrl: url.downloadUrl,
    });
  };

  render() {
    const { selectedDocument } = this.props;
    const { filePreviewUrl } = this.state;
    const {
      name,
      source,
      mimeType,
      createdTime,
      metadata,
      id,
    } = selectedDocument;
    return (
      <Wrapper>
        <Button onClick={this.props.unselectDocument}>BACK</Button>
        <ItemPreview>
          {this.type === 'images' && (
            <div
              className="preview"
              style={{ backgroundImage: `url(${filePreviewUrl})` }}
            >
              {!filePreviewUrl && <p>Loading...</p>}
            </div>
          )}
          {this.type === 'documents' && (
            <div className="preview">
              {filePreviewUrl ? (
                <object
                  width="100%"
                  height="100%"
                  data={filePreviewUrl}
                  type="application/pdf"
                >
                  <embed src={filePreviewUrl} type="application/pdf" />
                </object>
              ) : (
                <p>Loading...</p>
              )}
            </div>
          )}
          <div className="content">
            <p>Name: {name}</p>
            <p>Source: {source}</p>
            <p>Type: {mimeType}</p>
            <p>ID: {id}</p>
            <p>Created Date: {moment(createdTime).format('DD/MM/YYYY')}</p>
            <pre>{JSON.stringify(metadata, null, 2)}</pre>

            <Divider />
            <Button onClick={() => message.info('Coming soon...')}>
              Link to Asset
            </Button>
            <br />
            <br />
            <Button onClick={() => message.info('Coming soon...')}>
              Add Labels
            </Button>
            <Button onClick={() => message.info('Coming soon...')}>
              Add Type
            </Button>
            <Button onClick={() => message.info('Coming soon...')}>
              Add Metadata
            </Button>
            {this.type === 'documents' && (
              <>
                <Divider />
                <Button
                  size="large"
                  type="primary"
                  onClick={() => message.info('Coming soon...')}
                >
                  Detect Assets In Document
                </Button>
              </>
            )}
          </div>
        </ItemPreview>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectApp(state),
    threed: selectThreeD(state),
    assets: selectAssets(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      createNewAsset,
      fetchAssets,
      setRevisionRepresentAsset,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MapModelToAssetForm);
