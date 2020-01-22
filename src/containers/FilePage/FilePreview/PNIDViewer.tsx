import React from 'react';
import { connect } from 'react-redux';
import { message, Button } from 'antd';
import styled from 'styled-components';
import { SVGViewer } from '@cognite/gearbox';
import { bindActionCreators, Dispatch } from 'redux';
import { FilesMetadata } from '@cognite/sdk';
import BottomRightCard from 'components/BottomRightCard';
import { sleep } from 'utils/utils';
import { RootState } from 'reducers';
import { sdk } from 'index';
import { trackUsage } from 'utils/metrics';
import { selectFiles, FilesState } from 'modules/files';
import { selectAssets, AssetsState } from 'modules/assets';
import { canReadAssets } from '../../../utils/PermissionsUtils';

const getTextFromMetadataNode = (node: { textContent?: string }) =>
  (node.textContent || '').replace(/\s/g, '');

const ViewerContainer = styled.div`
  height: 100%;
  width: 100%;
  padding: 12px;
  display: flex;
  flex-direction: column;
`;

const StyledSVGViewerContainer = styled.div`
  flex: 1;
  max-height: 100%;
  width: 100%;
  position: relative;
  .metadata-container.highlighted {
    outline: solid 8px #4a67fb;
    outline-offset: 4px;
    > {
      text {
        stroke: #4a67fb;
        fill: #4a67fb;
        transition: all 0.2s ease;
        text-decoration: none;
      }
      path {
        stroke: #4a67fb;
        transition: all 0.2s ease;
      }
    }
    &:hover,
    &:focus {
      outline: solid 8px #4a67fb;
    }
  }
  .metadata-container.highlighted-secondary {
    outline: solid 8px #fc2574;
    outline-offset: 4px;
    > {
      text {
        stroke: #fc2574;
        fill: #fc2574;
        transition: all 0.2s ease;
        text-decoration: none;
      }
      path {
        stroke: #fc2574;
        transition: all 0.2s ease;
      }
    }
    &:hover,
    &:focus {
      outline: solid 8px #fc2574;
    }
  }
`;

type Props = {
  assetId?: number;
  assets: AssetsState;
  files: FilesState;
  selectedDocument: FilesMetadata;
  onAssetClicked: (id: number) => void;
  onFileClicked: (id: number) => void;
};

type State = {
  currentFile: { id: number; fileName: string };
  selectedItem?: {
    type: 'asset' | 'file';
    name: string;
    description?: string;
    id: number;
  };
};

class PNIDViewer extends React.Component<Props, State> {
  svgviewer?: SVGViewer | null = undefined;

  targetCurrentAsset = true;

  constructor(props: Props) {
    super(props);

    this.state = {
      currentFile: {
        id: props.selectedDocument.id,
        fileName: props.selectedDocument.name,
      },
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.selectedDocument !== this.props.selectedDocument) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        currentFile: {
          id: this.props.selectedDocument.id,
          fileName: this.props.selectedDocument.name,
        },
      });
    }
    if (prevProps.assetId !== this.props.assetId) {
      setTimeout(async () => {
        if (this.svgviewer) {
          this.svgviewer.zoomOnCurrentAsset(
            document.querySelector(`.current-asset`)
          );

          // Workaround https://github.com/cognitedata/gearbox.js/issues/300
          await sleep(250);
          // TODO will remove, need to verify
          if (this.svgviewer.pinchZoomInstance) {
            // @ts-ignore
            this.svgviewer.pinchZoomInstance.updateAspectRatio();
            this.svgviewer.pinchZoomInstance.update();
          }
        }
      }, 100);
    }
  }

  get currentFile() {
    return this.state.currentFile;
  }

  searchAndSelectAssetName = async (nameString: string) => {
    let asset;

    let name = nameString;

    if (name.indexOf('<tag>') > -1) {
      const startingLocation = name.indexOf('<tag>') + 5;
      name = name.slice(
        startingLocation,
        name.indexOf('</tag>', startingLocation)
      );
    }

    const matches = Object.keys(this.props.assets.all)
      .map(id => this.props.assets.all[id])
      .filter(a => a.name === name);

    if (matches.length === 0) {
      if (!canReadAssets()) {
        return;
      }
      const result = await sdk.assets.search({ search: { name } });
      const exactMatches = result.filter(
        a => a.name.replace(/\s+/g, ' ') === name
      );
      if (exactMatches.length > 0) {
        [asset] = exactMatches;
        trackUsage('PNIDViewer.searchAndSelectAssetName', {
          id: asset.id,
          query: name,
        });
      } else {
        message.info('Did not find any asset associated to this object.');
        trackUsage('PNIDViewer.searchAndSelectAssetNameError', { query: name });
        return;
      }
    } else {
      [asset] = matches;
    }
    this.setState({
      selectedItem: {
        id: asset.id,
        name: asset.name,
        description: asset.description,
        type: 'asset',
      },
    });
  };

  loadNextPNID = async (nameString: string) => {
    let name = nameString;

    if (name.indexOf('<tag>') > -1) {
      const startingLocation = name.indexOf('<tag>') + 5;
      name = name.slice(
        startingLocation,
        name.indexOf('</tag>', startingLocation)
      );
    }
    const result = await sdk.files.list({ filter: { name } });
    const exactMatch = result.items.find(a => a.name === name);
    if (exactMatch) {
      this.setState({
        selectedItem: {
          id: exactMatch.id,
          name: exactMatch.name,
          type: 'file',
        },
      });
      trackUsage('PNIDViewer.loadNextPNID', {
        id: exactMatch.id,
        fromParsedPNID: true,
      });
    } else {
      message.info('Did not find next pnid graph');
      trackUsage('PNIDViewer.loadNextPNIDError', { query: name });
      return;
    }
    this.targetCurrentAsset = true;
  };

  isCurrentAsset = (metadata: any) => {
    if (!this.props.assetId) {
      return false;
    }

    const asset = this.props.assets.all[this.props.assetId];
    if (!asset) {
      return false;
    }

    return getTextFromMetadataNode(metadata) === asset.name.replace(/\s/g, '');
  };

  isSelectedAsset = (metadata: any) => {
    if (!this.state.selectedItem) {
      return false;
    }
    return (
      getTextFromMetadataNode(metadata) ===
      this.state.selectedItem.name.replace(/\s/g, '')
    );
  };

  renderSVGViewer() {
    const { selectedItem } = this.state;
    return (
      <>
        <StyledSVGViewerContainer>
          <SVGViewer
            ref={c => {
              this.svgviewer = c; // Will direct access this
            }}
            documentId={this.currentFile ? this.currentFile.id : 0}
            title={this.currentFile && this.currentFile.fileName}
            description="P&ID"
            isCurrentAsset={(node: any) => {
              if (!this.targetCurrentAsset) {
                return false;
              }
              return this.isCurrentAsset(node);
            }}
            metadataClassesConditions={[
              {
                condition: this.isCurrentAsset,
                className: 'highlighted',
              },
              {
                condition: this.isSelectedAsset,
                className: 'highlighted-secondary',
              },
            ]}
            handleItemClick={item => {
              this.targetCurrentAsset = false;
              const name = item.children[0].children[0].innerHTML;
              if (item.children[0].children[0].tagName === 'file_id') {
                this.loadNextPNID(name);
              } else {
                this.searchAndSelectAssetName(name);
              }
            }}
          />
        </StyledSVGViewerContainer>
        {selectedItem && (
          <BottomRightCard
            title={selectedItem.name}
            onClose={() => this.setState({ selectedItem: undefined })}
          >
            <>
              <strong>Description</strong>
              <p>{selectedItem.description || 'N/A'}</p>
              <div className="button-row">
                <Button
                  onClick={() => {
                    if (selectedItem.type === 'asset') {
                      this.props.onAssetClicked(selectedItem.id);
                    } else {
                      this.props.onFileClicked(selectedItem.id);
                    }
                    this.setState({ selectedItem: undefined });
                  }}
                >
                  View {selectedItem.type === 'asset' ? 'Asset' : 'File'}
                </Button>
              </div>
            </>
          </BottomRightCard>
        )}
      </>
    );
  }

  render() {
    const { currentFile } = this;

    return (
      <ViewerContainer>{currentFile && this.renderSVGViewer()}</ViewerContainer>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    files: selectFiles(state),
    assets: selectAssets(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(PNIDViewer);
