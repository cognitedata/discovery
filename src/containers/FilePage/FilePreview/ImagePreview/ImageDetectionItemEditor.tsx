import React, { useState } from 'react';
import { Card, Input, Button, Tag } from 'antd';
import AssetSelect from 'components/AssetSelect';
import { CogniteDetection } from 'utils/detectionApi';
import styled from 'styled-components';
import { PendingDetection } from './ImageDetectionPreview';
import { useSelector } from '../../../../utils/ReduxUtils';

const WrappedCard = styled(Card)`
  && {
    width: 300px;
  }
  .button-row {
    margin-top: 12px;
    & > * {
      margin-left: 6px;
    }
    & > *:first-child() {
      margin-left: 0px;
    }
  }
`;

type Props = {
  detection: PendingDetection | CogniteDetection;
  editable: boolean;
  onUpdateDetection: (detection: PendingDetection | CogniteDetection) => void;
  onDeleteDetection: () => void;
};

const ImageDetectionItemEditor = ({
  detection,
  editable,
  onUpdateDetection,
  onDeleteDetection,
}: Props) => {
  const assetsMap = useSelector(state => state.assets.items);
  const [label, setLabel] = useState(detection ? detection.label : '');
  const [assetIds, setAssetIds] = useState(
    detection ? detection.assetIds : undefined
  );
  const [description, setDescription] = useState(
    detection ? detection.description : undefined
  );

  const [loading, setLoading] = useState(false);

  const isNewDetection = Number.isNaN(Number(detection.id));

  if (editable) {
    return (
      <WrappedCard>
        <p>Label</p>
        <Input onChange={e => setLabel(e.target.value)} value={label} />
        <p>Description</p>
        <Input.TextArea
          onChange={e => setDescription(e.target.value)}
          value={description}
        />
        <p>Assets</p>
        <AssetSelect
          multiple
          selectedAssetIds={assetIds}
          style={{ width: '100%' }}
          onAssetSelected={(ids: number[]) => setAssetIds(ids)}
        />
        <div className="button-row">
          <Button
            type="primary"
            icon={isNewDetection ? 'plus' : 'edit'}
            loading={loading}
            onClick={async () => {
              setLoading(true);
              await onUpdateDetection({
                ...detection,
                label,
                description,
                assetIds,
              });
              setLoading(false);
            }}
          >
            {isNewDetection ? 'Add Detection' : 'Edit Detection'}
          </Button>
          <Button icon="delete" onClick={() => onDeleteDetection()} />
        </div>
      </WrappedCard>
    );
  }
  return (
    <WrappedCard>
      <h4>{label}</h4>
      <p>{description}</p>

      {(detection.assetIds || []).map(id => (
        <Tag key={id}>{assetsMap[id] ? assetsMap[id].name : 'Loading...'}</Tag>
      ))}
    </WrappedCard>
  );
};

export default ImageDetectionItemEditor;
