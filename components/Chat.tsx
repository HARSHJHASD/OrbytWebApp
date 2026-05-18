import { useState, useEffect } from 'react';
import { reviveChat } from '../services/api';

function Chat({ chat }) {
  const [isExpired, setIsExpired] = useState(chat.expired);

  const handleReviveChat = async () => {
    try {
      await reviveChat(chat._id);
      setIsExpired(false);
      alert('Chat revived successfully!');
    } catch (error) {
      alert('Failed to revive chat. Please try again.');
    }
  };

  if (isExpired) {
    return (
      <div className="chat-expired">
        <p>This chat has expired.</p>
        <button onClick={handleReviveChat}>Revive Chat</button>
      </div>
    );
  }

  return (
    <div className="chat">
      {/* ...existing chat UI... */}
    </div>
  );
}

export default Chat;