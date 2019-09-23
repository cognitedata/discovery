import React from 'react';
import { connect } from 'react-redux';
import { List, Button, message, Icon } from 'antd';
import styled from 'styled-components';
import { SVGViewer } from '@cognite/gearbox';
import { bindActionCreators, Dispatch } from 'redux';
import { selectAssets, AssetsState } from '../modules/assets';
import { selectFiles, FilesState } from '../modules/files';
import { sleep } from '../utils/utils';
import { RootState } from '../reducers';
import { sdk } from '../index';
import { selectApp, AppState, setAssetId } from '../modules/app';
import Placeholder from '../components/Placeholder';

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
  .myCoolThing {
    outline: auto 2px #3838ff;
    transition: all 0.2s ease;
    > {
      text {
        stroke: #3838ff;
        fill: #3838ff;
        transition: all 0.2s ease;
        text-decoration: none;
      }
      path {
        stroke: #3838ff;
        transition: all 0.2s ease;
      }
    }
    &:hover,
    &:focus {
      outline: auto 2px #36a2c2;
    }
  }
`;

type Props = {
  app: AppState;
  assets: AssetsState;
  files: FilesState;
  setAssetId: typeof setAssetId;
};

type State = {
  currentFiles: { id: number; fileName: string }[];
  currentIndex: number;
};

class PNIDViewer extends React.Component<Props, State> {
  svgviewer?: SVGViewer | null = undefined;

  readonly state: Readonly<State> = {
    currentFiles: [],
    currentIndex: 0,
  };

  componentDidUpdate(prevProps: Props) {
    if (prevProps.app.assetId !== this.props.app.assetId) {
      setTimeout(async () => {
        if (this.svgviewer) {
          this.svgviewer.zoomOnCurrentAsset(
            document.querySelector(`.${'current-asset'}`)
          );

          // Workaround https://github.com/cognitedata/gearbox.js/issues/300
          await sleep(250);
          // TODO will remove, need to verify
          // @ts-ignore
          this.svgviewer.pinchZoomInstance.updateAspectRatio();
          this.svgviewer.pinchZoomInstance.update();
        }
      }, 100);
    }
  }

  get currentFile() {
    const { currentFiles, currentIndex } = this.state;
    if (currentFiles.length === 0) {
      return undefined;
    }
    return currentFiles[currentIndex];
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
      const result = await sdk.assets.list({ filter: { name } });
      const exactMatches = result.items.filter(a => a.name === name);
      if (exactMatches.length > 0) {
        [asset] = exactMatches;
      } else {
        message.info('Did not find any asset associated to this object.');
        return;
      }
    } else {
      [asset] = matches;
    }
    this.props.setAssetId(asset.rootId, asset.id);
  };

  loadNextPNID = async (nameString: string) => {
    const { currentFiles } = this.state;

    let name = nameString;

    if (name.indexOf('<tag>') > -1) {
      const startingLocation = name.indexOf('<tag>') + 5;
      name = name.slice(
        startingLocation,
        name.indexOf('</tag>', startingLocation)
      );
    }
    const result = await sdk.files.search({ search: { name: `${name}.svg` } });
    const exactMatch = result.find(a => a.name === `${name}.svg`);
    if (exactMatch) {
      currentFiles.push({
        id: exactMatch.id,
        fileName: exactMatch.name,
      });
    } else {
      message.info('Did not find next pnid graph');
      return;
    }
    this.setState({ currentFiles, currentIndex: currentFiles.length - 1 });
  };

  isCurrentAsset = (metadata: any) => {
    if (!this.props.app.assetId) {
      return false;
    }

    const asset = this.props.assets.all[this.props.app.assetId];
    if (!asset) {
      return false;
    }

    return getTextFromMetadataNode(metadata) === asset.name;
  };

  renderSVGViewer() {
    const { currentFiles, currentIndex } = this.state;
    return (
      <>
        <Button.Group style={{ marginBottom: '12px' }}>
          <Button
            size="small"
            disabled={currentIndex === 0}
            onClick={() => this.setState({ currentIndex: currentIndex - 1 })}
          >
            <Icon type="left" />
            Previous Document
          </Button>
          <Button
            size="small"
            disabled={currentIndex === currentFiles.length - 1}
            onClick={() => this.setState({ currentIndex: currentIndex + 1 })}
          >
            Next Document
            <Icon type="right" />
          </Button>
        </Button.Group>
        <StyledSVGViewerContainer>
          <SVGViewer
            ref={c => {
              this.svgviewer = c; // Will direct access this
            }}
            documentId={this.currentFile ? this.currentFile.id : 0}
            title={this.currentFile && this.currentFile.fileName}
            description="P&ID"
            handleCancel={() => {
              this.setState({ currentFiles: [], currentIndex: 0 });
            }}
            isCurrentAsset={this.isCurrentAsset}
            // metadataClassesConditions={[
            //   {
            //     condition: node => {
            //       return getTextFromMetadataNode(node) === '13PST1233';
            //     },
            //     className: 'myCoolThing',
            //   },
            // ]}
            handleItemClick={item => {
              const name = item.children[0].children[0].innerHTML;
              if (item.children[0].children[0].tagName === 'file_id') {
                this.loadNextPNID(name);
              } else {
                this.searchAndSelectAssetName(name);
              }
            }}
          />
        </StyledSVGViewerContainer>
      </>
    );
  }

  renderFileList() {
    if (!this.props.app.assetId) {
      return <Placeholder componentName="P&ID Viewer" />;
    }

    const filesForThisAsset =
      this.props.files.byAssetId[this.props.app.assetId!] || [];

    const pNIDFiles = filesForThisAsset.filter(
      file =>
        file.name.includes('') &&
        file.mimeType &&
        file.mimeType.toLowerCase().includes('svg')
    );

    return (
      <List
        size="small"
        header={<h3 style={{ marginBottom: 0 }}>P&ID documents</h3>}
        bordered
        dataSource={pNIDFiles}
        renderItem={item => (
          <List.Item>
            <Button
              type="link"
              onClick={() => {
                this.setState({
                  currentFiles: [{ id: item.id, fileName: item.name }],
                  currentIndex: 0,
                });
              }}
            >
              {item.name}
            </Button>
          </List.Item>
        )}
      />
    );
  }

  render() {
    const { currentFile } = this;

    return (
      <ViewerContainer>
        {currentFile && this.renderSVGViewer()}
        {!currentFile && this.renderFileList()}
      </ViewerContainer>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectApp(state),
    files: selectFiles(state),
    assets: selectAssets(state),
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
)(PNIDViewer);
