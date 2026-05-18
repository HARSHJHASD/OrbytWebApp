// ...existing imports...

function ChatList({ chats }) {
  return (
    <div className="chat-list">
      {chats.map(chat => (
        <Chat key={chat._id} chat={chat} />
      ))}
    </div>
  );
}

export default ChatList;