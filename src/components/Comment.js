import React from 'react'
import PropTypes from 'prop-types'
import { Comment as AntDComment } from 'antd';

function Comment({ author, avatar, content, datetime }) {
  return (
    <AntDComment
      author={author}
      avatar={avatar}
      content={content}
      datetime={datetime}
    />
  )
}

Comment.propTypes = {
  author: PropTypes.string.isRequired,
  avatar: PropTypes.node.isRequired,
  content: PropTypes.string.isRequired,
  datetime: PropTypes.string.isRequired,
}

export default Comment
