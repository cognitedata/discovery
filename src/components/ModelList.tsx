import React from 'react';
import { List, Icon } from 'antd';
import { Link } from 'react-router-dom';
import { Model3D } from '@cognite/sdk';

function ModelList({ loading, items }: { loading: boolean; items: Model3D[] }) {
  return (
    <List
      header={`${items.length} model${items.length > 1 ? 's' : ''}`}
      itemLayout="horizontal"
      dataSource={items}
      loading={loading}
      locale={{
        emptyText:
          'No models. Please upload a 3D model first: https://doc.cognitedata.com/dev/guides/3d/upload-3d.html',
      }}
      renderItem={item => (
        <li>
          <Link to={`models/${item.id}/revisions`}>
            <Icon type="code-sandbox" />
            {item.name}
          </Link>
        </li>
      )}
    />
  );
}

export default ModelList;
