'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

interface Post {
  id: string;
  title: string;
  date: string;
  platforms: string[];
}

export default function PostSelector() {
  const { isReady, getToolOutput, sendFollowUpMessage } = useWidgetSDK();
  const output = getToolOutput<{ widgetProps: { posts: Post[] } }>();
  const posts = output?.widgetProps?.posts || [];

  if (!isReady) {
    return (
      <div className="flex items-center justify-center p-6 bg-gray-900 text-gray-400 rounded-lg shadow-xl">
        Loading posts...
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 bg-gray-900 text-white rounded-lg shadow-xl font-sans min-w-[300px]">
      <h2 className="text-2xl font-bold mb-4 text-gray-100 border-b border-gray-700 pb-2">Select a Post</h2>
      
      {posts.length === 0 ? (
        <p className="text-gray-400">No posts available.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map(post => (
            <div key={post.id} className="flex flex-col p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-blue-500 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-blue-400">{post.title}</h3>
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">{post.date}</span>
              </div>
              <p className="text-sm text-gray-400 mb-4">Platforms: {post.platforms.join(', ')}</p>
              
              <button 
                onClick={() => sendFollowUpMessage(`Show analytics for post ${post.id}`)}
                className="self-end px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors"
              >
                View Analytics
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
