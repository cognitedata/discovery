import React from 'react';
import { connect } from 'react-redux';
import { Modal, Button, message, Input } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import styled from 'styled-components';
import AceEditor from 'react-ace';
import AssetSelect from 'components/AssetSelect';
import { sdk } from 'modules/app';
import { fetchAsset, AssetsState } from '../../modules/assets';
import { addTimeseriesToState } from '../../modules/timeseries';
import { canEditTimeseries } from '../../utils/PermissionsUtils';
import { trackUsage } from '../../utils/Metrics';
import { RootState } from '../../reducers/index';

const FormDetails = styled.div`
  p {
    margin-bottom: 6px;
    margin-top: 12px;
  }
`;

type OwnProps = {
  timeseries?: GetTimeSeriesMetadataDTO;
  onClose: (timeseries?: GetTimeSeriesMetadataDTO) => void;
};

type Props = {
  assets: AssetsState;
  fetchAsset: typeof fetchAsset;
  addTimeseriesToState: typeof addTimeseriesToState;
} & OwnProps;

type State = {
  selectedAssetId?: number;
  metadata?: string;
  description?: string;
  unit?: string;
  name?: string;
};

class EditTimeseriesModal extends React.Component<Props, State> {
  source?: string;

  constructor(props: Props) {
    super(props);

    const { timeseries } = props;
    trackUsage('AddOrEditTimeseriesModal.Load', {
      id: timeseries && timeseries.id,
    });
    if (timeseries) {
      const { unit, name, description, metadata, assetId } = timeseries;

      if (metadata && metadata.COGNITE__SOURCE) {
        this.source = metadata.COGNITE__SOURCE;
        delete metadata.COGNITE__SOURCE;
      }

      this.state = {
        selectedAssetId: assetId,
        metadata: metadata ? JSON.stringify(metadata, null, 2) : undefined,
        description,
        unit,
        name,
      };
    } else {
      this.state = {};
    }
  }

  saveChanges = async () => {
    const { selectedAssetId, name, description, metadata, unit } = this.state;
    if (!canEditTimeseries()) {
      return;
    }
    if (name) {
      let metadataParsed;
      try {
        metadataParsed = metadata ? JSON.parse(metadata) : undefined;
      } catch (e) {
        message.error('Invalid metadata JSON');
        return;
      }
      if (this.props.timeseries) {
        const [timeseries] = await sdk.timeseries.update([
          {
            id: this.props.timeseries.id,
            update: {
              ...(selectedAssetId && {
                assetId: {
                  set: selectedAssetId,
                },
              }),
              name: {
                set: name,
              },
              ...(description && {
                description: {
                  set: description,
                },
              }),
              ...(unit && {
                unit: {
                  set: unit,
                },
              }),
              ...((!unit || unit.length === 0) && {
                unit: {
                  setNull: true,
                },
              }),
              ...((!description || description.length === 0) && {
                description: {
                  setNull: true,
                },
              }),
              ...(metadata && {
                metadata: {
                  set: {
                    ...(this.source && { COGNITE__SOURCE: this.source }),
                    ...metadataParsed,
                  },
                },
              }),
            },
          },
        ]);
        message.info('Updating timeseries...');
        await this.props.addTimeseriesToState([timeseries]);
        this.props.onClose(timeseries);
        trackUsage('AddOrEditTimeseriesModal.EditTimeseries', {
          id: timeseries && timeseries.id,
        });
      } else {
        const [timeseries] = await sdk.timeseries.create([
          {
            assetId: selectedAssetId,
            name,
            description,
            unit,
            metadata: metadataParsed,
          },
        ]);

        await this.props.addTimeseriesToState([timeseries]);
        this.props.onClose(timeseries);
        trackUsage('AddOrEditTimeseriesModal.CreateTimeseries', {
          id: timeseries && timeseries.id,
        });
      }
    } else {
      message.info('A name must be valid');
    }
  };

  render() {
    const { assets, timeseries } = this.props;
    const { selectedAssetId, name, description, unit, metadata } = this.state;
    return (
      <Modal
        visible
        title={timeseries ? 'Update Timeseries' : 'Create Timeseries'}
        onCancel={() => this.props.onClose()}
        footer={[
          <Button
            key="submit"
            type="primary"
            onClick={this.saveChanges}
            disabled={!canEditTimeseries(false)}
          >
            {timeseries ? 'Update Timeseries' : 'Create Timeseries'}
          </Button>,
        ]}
      >
        <FormDetails>
          <p>Name*</p>
          <Input
            value={name}
            placeholder="Name"
            onChange={ev => this.setState({ name: ev.target.value })}
          />
          <p>
            Linked Asset:{' '}
            {selectedAssetId && assets.items[selectedAssetId!]
              ? assets.items[selectedAssetId!].name
              : 'N/A'}
          </p>
          <AssetSelect
            style={{ width: '100%' }}
            selectedAssetIds={selectedAssetId ? [selectedAssetId] : []}
            onAssetSelected={ids => this.setState({ selectedAssetId: ids[0] })}
          />
          <p>Description</p>
          <Input
            value={description}
            placeholder="Description"
            onChange={ev => this.setState({ description: ev.target.value })}
          />
          <p>Unit</p>
          <Input
            value={unit}
            placeholder="Unit"
            onChange={ev => this.setState({ unit: ev.target.value })}
          />
          <p>Metadata</p>
          <AceEditor
            mode="json"
            width="100%"
            height="200px"
            theme="github"
            value={metadata}
            onChange={newValue => this.setState({ metadata: newValue })}
            editorProps={{ $blockScrolling: true }}
          />
        </FormDetails>
      </Modal>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return { assets: state.assets };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      fetchAsset,
      addTimeseriesToState,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditTimeseriesModal);
