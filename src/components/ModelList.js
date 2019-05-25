import React from 'react'
import PropTypes from 'prop-types'
import { List, Icon } from 'antd';
import { Link } from 'react-router-dom'
import { Model } from '../reducers/models'

function ModelList({ loading, items }) {
  return (
    <List
      header={`${items.length} model${items.length > 1 ? 's' : ''}`}
      itemLayout="horizontal"
      dataSource={items}
      loading={loading}
      locale={{emptyText: 'No models. Please upload a 3D model first: https://doc.cognitedata.com/dev/guides/3d/upload-3d.html'}}
      renderItem={item => (
        <li>
          <Link to={`models/${item.id}/revisions`}><Icon type="code-sandbox" />{item.name}</Link>
        </li>
      )}
    />
  )
}

ModelList.propTypes = {
  loading: PropTypes.bool.isRequired,
  items: PropTypes.arrayOf(Model).isRequired,
}

export default ModelList
