import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { List, Button } from 'antd';
import styled from 'styled-components';
import { SVGViewer } from '@cognite/gearbox';
import * as sdk from '@cognite/sdk';
import { Asset } from '../modules/assets';
import { Files, selectFiles } from '../modules/files';

const getTextFromMetadataNode = node =>
  (node.textContent || '').replace(/\s/g, '');

const ViewerContainer = styled.div`
  height: 100%;
  width: 100%;
  padding-top: 50px;
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

  searchAndSelectAssetName = async name => {
    const result = await sdk.Assets.search({ name });
    const exactMatches = result.items.filter(asset => asset.name === name);
    if (exactMatches.length > 0) {
      const assetId = exactMatches[0].id;
      this.props.onAssetIdChange(assetId);
    }
  };

  renderSVGViewer() {
    const { asset } = this.props;

    return (
      <StyledSVGViewerContainer>
        <SVGViewer
          documentId={this.state.currentFile.id}
          title={this.state.currentFile.name}
          description="P&ID"
          handleCancel={() => {
            this.setState({ currentFile: undefined });
          }}
          isCurrentAsset={metadata => {
            if (asset) {
              return getTextFromMetadataNode(metadata) === asset.name;
            }
            return false;
          }}
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
            this.searchAndSelectAssetName(name);
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
                  currentFile: { id: item.id, title: item.fileName },
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
  files: Files.isRequired,
  onAssetIdChange: PropTypes.func.isRequired,
};

PNIDViewer.defaultProps = {
  asset: undefined,
};

const mapStateToProps = state => {
  return { files: selectFiles(state) };
};

export default connect(mapStateToProps)(PNIDViewer);
