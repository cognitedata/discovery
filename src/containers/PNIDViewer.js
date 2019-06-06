import React from 'react';
import PropTypes from 'prop-types';
import { SVGViewer } from '@cognite/gearbox';
import { Asset } from '../modules/assets';

class PNIDViewer extends React.Component {
  state = {};

  render() {
    return (
      <SVGViewer
        documentId={8910925076675219}
        title="Title"
        description="Description"
      />
    );
  }
}
PNIDViewer.propTypes = {
  asset: Asset.isRequired,
};

export default PNIDViewer;
