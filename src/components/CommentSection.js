import React from 'react'
import PropTypes from 'prop-types'
import { Mention, List, Button, Avatar } from 'antd'
import Comment from './Comment'

const { toString } = Mention;

function CommentSection({ loading, comments, onComment }) {
  let text = '';
  const onChange = (editorState) => {
    text = toString(editorState);
  }
  const handleComment = () => {
    onComment(text);
  }

  return (
    <React.Fragment>
      <List
        header={`${comments.length} comment${comments.length > 1 ? 's' : ''}`}
        itemLayout="horizontal"
        dataSource={comments}
        loading={loading}
        locale={{emptyText: 'No comments'}}
        renderItem={item => (
          <li>
            <Comment
              actions={item.actions}
              author={item.author}
              avatar={<Avatar size="large" icon="user" />}
              content={item.content}
              datetime={item.datetime}
            />
          </li>
        )}
      />
      {loading ||
        <>
          <Mention
            style={{ width: '100%', height: 100 }}
            onChange={onChange}
            defaultSuggestions={['Fredrik Anfinsen', 'Anders Hafreager']}
            multiLines
            autoFocus
            placeholder="Type in a new comment here"
          />
          <Button type="primary" block style={{ top: 10 }} onClick={handleComment}>
            Comment
          </Button>
        </>
      }
    </React.Fragment>
  )
}

CommentSection.propTypes = {
  loading: PropTypes.bool.isRequired,
  comments: PropTypes.arrayOf(PropTypes.shape({
    author: PropTypes.string.isRequired,
  })).isRequired,
  onComment: PropTypes.func.isRequired,
}

export default CommentSection
