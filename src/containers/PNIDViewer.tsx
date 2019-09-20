import React from 'react';
import { connect } from 'react-redux';
import { List, Button, message } from 'antd';
import styled from 'styled-components';
import { SVGViewer } from '@cognite/gearbox';
import { bindActionCreators, Dispatch } from 'redux';
import { selectAssets, AssetsState } from '../modules/assets';
import { selectFiles, FilesState } from '../modules/files';
import { sleep } from '../utils/utils';
import { RootState } from '../reducers';
import { sdk } from '../index';
import { selectApp, AppState, setAssetId } from '../modules/app';

const getTextFromMetadataNode = (node: { textContent?: string }) =>
  (node.textContent || '').replace(/\s/g, '');

const ViewerContainer = styled.div`
  height: 100%;
  width: 100%;
  padding: 24px;
  padding-top: 75px;
  background: #f5f5f5;
`;

const StyledSVGViewerContainer = styled.div`
  height: 100%;
  width: 100%;
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
  currentFile?: { id: number; fileName: string };
};

class PNIDViewer extends React.Component<Props, State> {
  readonly state: Readonly<State> = {
    currentFile: undefined,
  };

  svgviewer?: SVGViewer | null = undefined;

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
      const result = await sdk.assets.search({ search: { name } });
      const exactMatches = result.filter(a => a.name === name);
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
    let { currentFile } = this.state;

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
      currentFile = {
        id: exactMatch.id,
        fileName: exactMatch.name,
      };
    } else {
      message.info('Did not find next pnid graph');
      return;
    }
    this.setState({ currentFile });
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
    return (
      <StyledSVGViewerContainer>
        <SVGViewer
          ref={c => {
            this.svgviewer = c; // Will direct access this
          }}
          documentId={this.state.currentFile ? this.state.currentFile.id : 0}
          title={this.state.currentFile && this.state.currentFile.fileName}
          description="P&ID"
          handleCancel={() => {
            this.setState({ currentFile: undefined });
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
    );
  }

  renderFileList() {
    if (!this.props.app.assetId) {
      return null;
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
                  currentFile: { id: item.id, fileName: item.name },
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
    const { currentFile } = this.state;

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
