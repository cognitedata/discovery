import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { List, Button } from 'antd';
import styled from 'styled-components';
import { SVGViewer } from '@cognite/gearbox';
import * as sdk from '@cognite/sdk';
import { Asset, Assets, selectAssets } from '../modules/assets';
import { Files, selectFiles } from '../modules/files';
import { sleep } from '../utils/utils';

const getTextFromMetadataNode = node =>
  (node.textContent || '').replace(/\s/g, '');

const ViewerContainer = styled.div`
  height: 100%;
  width: 100%;
  padding-top: 75px;
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

class PNIDViewer extends React.Component {
  state = {
    currentFile: undefined,
  };

  componentDidUpdate(prevProps) {
    if (prevProps.asset !== this.props.asset) {
      setTimeout(async () => {
        if (!this.svgviewer) {
          return;
        }
        this.svgviewer.zoomOnCurrentAsset(
          document.querySelector(`.${'current-asset'}`)
        );

        // Workaround https://github.com/cognitedata/gearbox.js/issues/300
        await sleep(250);
        this.svgviewer.pinchZoomInstance.updateAspectRatio();
        this.svgviewer.pinchZoomInstance.update();
      }, 100);
    }
  }

  onClick(name) {
    this.searchAndSelectAssetName(name);
  }

  searchAndSelectAssetName = async name => {
    let asset;
    const matches = this.props.assets.all.filter(a => a.name === name);
    if (matches.length === 0) {
      const result = await sdk.Assets.search({ name });
      const exactMatches = result.items.filter(a => a.name === name);
      if (exactMatches.length > 0) {
        [asset] = exactMatches;
      } else {
        return;
      }
    } else {
      [asset] = matches;
    }
    this.props.onAssetIdChange(asset.id);
  };

  isCurrentAsset = metadata => {
    if (!this.props.asset) {
      return false;
    }

    return getTextFromMetadataNode(metadata) === this.props.asset.name;

    // if (this.state.currentAsset) {
    //   return getTextFromMetadataNode(metadata) === this.state.currentAsset.name;
    // }
    // return false;
  };

  renderSVGViewer() {
    return (
      <StyledSVGViewerContainer>
        <SVGViewer
          ref={c => {
            this.svgviewer = c; // Will direct access this
          }}
          documentId={this.state.currentFile.id}
          title={this.state.currentFile.name}
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
            this.onClick(name);
          }}
        />
      </StyledSVGViewerContainer>
    );
  }

  renderFileList() {
    if (!this.props.asset) {
      return null;
    }

    const filesForThisAsset = this.props.files.byAssetId[this.props.asset.id];
    if (!filesForThisAsset) {
      return null;
    }

    const pNIDFiles = filesForThisAsset.filter(
      file =>
        file.fileName.includes('-XB-') &&
        file.fileType.toLowerCase() === 'svg' &&
        file.fileName.toLowerCase().endsWith('svg')
    );

    return (
      <List
        size="small"
        header={<div>P&ID documents</div>}
        bordered
        dataSource={pNIDFiles}
        renderItem={item => (
          <List.Item>
            <Button
              type="link"
              onClick={() => {
                this.setState({
                  currentFile: { id: item.id, name: item.fileName },
                });
              }}
            >
              {item.fileName}
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

PNIDViewer.propTypes = {
  asset: Asset,
  assets: Assets.isRequired,
  files: Files.isRequired,
  onAssetIdChange: PropTypes.func.isRequired,
};

PNIDViewer.defaultProps = {
  asset: undefined,
};

const mapStateToProps = state => {
  return { files: selectFiles(state), assets: selectAssets(state) };
};

export default connect(mapStateToProps)(PNIDViewer);
