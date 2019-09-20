import React from 'react';
import { connect } from 'react-redux';
import { Modal, Button, message, Select, Spin } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { Asset } from '@cognite/sdk';
import debounce from 'lodash/debounce';
import { ExtendedAsset, editAsset } from '../../modules/assets';
import { sdk } from '../../index';
import { RootState } from '../../reducers/index';

type Props = {
  assetId: number;
  rootAssetId: number;
  onClose: (e?: any) => void;
  editAsset: typeof editAsset;
  assets: { [key: number]: ExtendedAsset };
};

type State = {
  selectedParent?: number;
  searchResults: Asset[];
  fetching: boolean;
};

class AddChildAsset extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.doSearch = debounce(this.doSearch, 100);

    this.state = {
      searchResults: Object.values(props.assets).filter(
        el => el.id !== props.assetId
      ),
      fetching: false,
      selectedParent: props.assets[props.assetId].parentId,
    };
  }

  doSearch = async (query: string) => {
    if (query.length > 0) {
      this.setState({ fetching: true });
      const results = await sdk.assets.search({
        search: { name: query, description: query },
        filter: {
          rootIds: [{ id: this.props.rootAssetId }],
        },
        limit: 1000,
      });
      this.setState({
        searchResults: results
          .slice(0, results.length)
          .filter(el => el.id !== this.props.assetId),
        fetching: false,
      });
    }
  };

  changeParent = () => {
    if (this.state.selectedParent) {
      this.props.editAsset({
        id: this.props.assetId,
        update: {
          // @ts-ignore
          parentId: {
            set: this.state.selectedParent,
          },
        },
      });
      message.info('Updating asset...');
      this.props.onClose();
    } else {
      message.info('A parent ID must be selected');
    }
  };

  render() {
    const { assets, assetId } = this.props;
    const { selectedParent, fetching, searchResults } = this.state;
    return (
      <Modal
        visible
        title="Change Asset Parent"
        onCancel={this.props.onClose}
        footer={[
          <Button key="submit" type="primary" onClick={this.changeParent}>
            Change Parent
          </Button>,
        ]}
      >
        <p>Current Parent: {assets[assets[assetId].parentId!].name}</p>
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder="Select existing asset"
          value={selectedParent}
          notFoundContent={fetching ? <Spin size="small" /> : null}
          onChange={(id: any) => this.setState({ selectedParent: Number(id) })}
          onSearch={this.doSearch}
          filterOption={false}
        >
          {searchResults.map(asset => {
            return (
              <Select.Option key={asset.id} value={asset.id}>
                {asset.name} ({asset.id})
              </Select.Option>
            );
          })}
        </Select>
      </Modal>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return { assets: state.assets.all };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      editAsset,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AddChildAsset);
