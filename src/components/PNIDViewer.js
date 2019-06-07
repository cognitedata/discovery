import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { SVGViewer } from '@cognite/gearbox';
import * as sdk from '@cognite/sdk';
import { Asset } from '../modules/assets';

const getTextFromMetadataNode = node =>
  (node.textContent || '').replace(/\s/g, '');

const StyledSVGViewerContainer = styled.div`
  height: 100%;
  padding-right: 400px;
  padding-top: 50px;
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
  searchAndSelectAssetName = async name => {
    const result = await sdk.Assets.search({ name });
    const exactMatches = result.items.filter(asset => asset.name === name);
    if (exactMatches.length > 0) {
      const assetId = exactMatches[0].id;
      this.props.onAssetIdChange(assetId);
    }
  };

  render() {
    const { asset, documentId } = this.props;
    return (
      <StyledSVGViewerContainer>
        <SVGViewer
          documentId={documentId}
          title="Title"
          description="Description"
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
}

PNIDViewer.propTypes = {
  asset: Asset,
  documentId: PropTypes.number.isRequired,
  onAssetIdChange: PropTypes.func.isRequired,
};

PNIDViewer.defaultProps = {
  asset: undefined,
};

export default PNIDViewer;
