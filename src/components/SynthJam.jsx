import React, { useState, useEffect, useRef, useCallback } from 'react';
import Pusher from 'pusher-js';
import * as Tone from 'tone';
import filter from 'leo-profanity';
import { Music, MessageSquare, X, Users, Wifi, WifiOff, Radio } from 'lucide-react';

// Instrument configurations
const INSTRUMENTS = {
  grand_piano: { name: 'Grand Piano', icon: '🎹', color: '#8B4513' },
  steel_drum: { name: 'Steel Drum', icon: '🥁', color: '#FFD700' },
  electric_keys: { name: 'Electric Keys', icon: '🎹', color: '#00FF00' },
  retro: { name: '8-Bit Retro', icon: '🎮', color: '#FF00FF' },
};

// MIDI note mapping (C3 = 48, B5 = 83)
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const KEYBOARD_MAP = {
  // White keys: Z-M
  'z': 48, 'x': 50, 'c': 52, 'v': 53, 'b': 55, 'n': 57, 'm': 59,
  // Black keys: Q-I
  'q': 49, 'w': 51, 'e': 53, 'r': 54, 't': 56, 'y': 58, 'u': 60, 'i': 61,
};

const SynthJam = () => {
  // State
  const [showEntryModal, setShowEntryModal] = useState(true);
  const [userName, setUserName] = useState('');
  const [userVote, setUserVote] = useState('grand_piano');
  const [members, setMembers] = useState(new Map());
  const [voteCounts, setVoteCounts] = useState({
    grand_piano: 0,
    steel_drum: 0,
    electric_keys: 0,
    retro: 0,
  });
  const [activeInstrument, setActiveInstrument] = useState('grand_piano');
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [memberCount, setMemberCount] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [lastChatTime, setLastChatTime] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Refs
  const pusherRef = useRef(null);
  const channelRef = useRef(null);
  const userIdRef = useRef(null);
  const voteMapRef = useRef(new Map()); // userId -> vote
  const synthRef = useRef(null);
  const reverbRef = useRef(null);
  const limiterRef = useRef(null);
  const pressedKeysRef = useRef(new Set());

  // Initialize Tone.js audio engine
  const initializeAudio = useCallback(() => {
    if (synthRef.current) return; // Already initialized

    try {
      // Create effects chain
      reverbRef.current = new Tone.Reverb({
        roomSize: 0.7,
        dampening: 3000,
      }).toDestination();

      limiterRef.current = new Tone.Limiter(-6).connect(reverbRef.current);

      // Create initial synth (Grand Piano)
      createSynth('grand_piano');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      alert('Audio initialization failed. Please refresh the page.');
    }
  }, []);

  // Create synth with specific instrument preset
  const createSynth = useCallback((instrument) => {
    try {
      // Dispose old synth if exists
      if (synthRef.current) {
        try {
          synthRef.current.dispose();
        } catch (e) {
          // Ignore disposal errors
        }
      }

      let synthConfig;
    switch (instrument) {
      case 'grand_piano':
        synthConfig = {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.5 },
        };
        break;
      case 'steel_drum':
        synthConfig = {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.4 },
          filter: { Q: 2, frequency: 2000 },
        };
        break;
      case 'electric_keys':
        synthConfig = {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
          filter: { Q: 1, frequency: 3000 },
        };
        break;
      case 'retro':
        synthConfig = {
          oscillator: { type: 'square' },
          envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 },
        };
        break;
      default:
        synthConfig = {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.5 },
        };
    }

      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 32,
        ...synthConfig,
      }).connect(limiterRef.current);
    } catch (error) {
      console.error('Failed to create synth:', error);
      // Fallback to default synth
      try {
        synthRef.current = new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 32,
        }).connect(limiterRef.current);
      } catch (fallbackError) {
        console.error('Fallback synth creation failed:', fallbackError);
      }
    }
  }, []);

  // Calculate vote counts from members and vote map
  const calculateVoteCounts = useCallback((membersMap, voteMap) => {
    const counts = {
      grand_piano: 0,
      steel_drum: 0,
      electric_keys: 0,
      retro: 0,
    };

    membersMap.forEach((member, userId) => {
      const vote = voteMap.get(userId) || member.user_info?.vote || 'grand_piano';
      if (counts.hasOwnProperty(vote)) {
        counts[vote]++;
      }
    });

    return counts;
  }, []);

  // Get winner from vote counts (with tie-breaking)
  const getWinner = useCallback((counts, previousWinner) => {
    const maxVotes = Math.max(...Object.values(counts));
    const winners = Object.entries(counts)
      .filter(([_, votes]) => votes === maxVotes)
      .map(([instrument]) => instrument);

    // Tie-breaking: prefer previous winner, else first in list
    if (winners.includes(previousWinner)) {
      return previousWinner;
    }
    return winners[0] || 'grand_piano';
  }, []);

  // Update vote counts and active instrument
  const updateVotes = useCallback((membersMap = null) => {
    // Use provided members map or current state
    const currentMembers = membersMap || members;
    const counts = calculateVoteCounts(currentMembers, voteMapRef.current);
    setVoteCounts(counts);

    setActiveInstrument((prevWinner) => {
      const winner = getWinner(counts, prevWinner);
      if (winner !== prevWinner) {
        // Hot-swap synth
        createSynth(winner);
      }
      return winner;
    });
  }, [members, calculateVoteCounts, getWinner, createSynth]);

  // Play note
  const playNote = useCallback((note, duration = '8n', isLocal = true) => {
    if (!synthRef.current) return;

    try {
      const noteName = Tone.Frequency(note, 'midi').toNote();
      synthRef.current.triggerAttackRelease(noteName, duration);

      // Broadcast if local and subscribed
      if (isLocal && channelRef.current && isSubscribed) {
        try {
          channelRef.current.trigger('client-note-played', {
            note,
            duration,
            userId: userIdRef.current,
          });
        } catch (error) {
          console.error('Failed to broadcast note:', error);
        }
      }
    } catch (error) {
      console.error('Failed to play note:', error);
    }
  }, [isSubscribed]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showEntryModal || connectionStatus !== 'connected') return;
      const key = e.key.toLowerCase();
      if (KEYBOARD_MAP[key] && !pressedKeysRef.current.has(key)) {
        pressedKeysRef.current.add(key);
        playNote(KEYBOARD_MAP[key]);
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      pressedKeysRef.current.delete(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [showEntryModal, connectionStatus, playNote]);

  // Join lobby
  const joinLobby = useCallback(async (name) => {
    if (!name || name.trim().length === 0) return;
    if (filter.check(name)) {
      alert('Please choose a different name');
      return;
    }

    try {
      // Initialize audio
      await Tone.start();
      initializeAudio();
    } catch (error) {
      console.error('Audio context start failed:', error);
      // Continue anyway - user interaction may be needed
    }

    // Initialize Pusher
    const pusherKey = import.meta.env.PUBLIC_PUSHER_KEY || import.meta.env.PUSHER_KEY;
    const pusherCluster = import.meta.env.PUBLIC_PUSHER_CLUSTER || import.meta.env.PUSHER_CLUSTER || 'us2';

    if (!pusherKey) {
      alert('Pusher not configured.\n\nTo test locally:\n1. Sign up at https://pusher.com (free tier available)\n2. Create a Channels app\n3. Enable Presence channels\n4. Add credentials to .env file:\n   PUBLIC_PUSHER_KEY=your_key\n   PUBLIC_PUSHER_CLUSTER=your_cluster\n   PUSHER_APP_ID=your_app_id\n   PUSHER_SECRET=your_secret\n5. Restart the dev server');
      setShowEntryModal(true); // Keep modal open
      return;
    }

    pusherRef.current = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: '/api/pusher-auth',
      auth: {
        params: { user_name: name },
      },
    });

    pusherRef.current.connection.bind('connected', () => {
      setConnectionStatus('connected');
    });

    pusherRef.current.connection.bind('disconnected', () => {
      setConnectionStatus('disconnected');
      // Attempt reconnection after delay
      setTimeout(() => {
        if (pusherRef.current && pusherRef.current.connection.state === 'disconnected') {
          pusherRef.current.connect();
        }
      }, 3000);
    });

    pusherRef.current.connection.bind('error', (error) => {
      console.error('Pusher connection error:', error);
      setConnectionStatus('disconnected');
    });

    pusherRef.current.connection.bind('connecting', () => {
      setConnectionStatus('connecting');
    });

    // Subscribe to presence channel
    const channel = pusherRef.current.subscribe('presence-piano-lobby');
    channelRef.current = channel;

    channel.bind('pusher:subscription_succeeded', async (members) => {
      setIsSubscribed(true); // Mark subscription as ready
      const membersMap = new Map();
      Object.keys(members.members).forEach((userId) => {
        membersMap.set(userId, members.members[userId]);
        // Initialize vote from user_info or default
        const vote = members.members[userId].user_info?.vote || 'grand_piano';
        voteMapRef.current.set(userId, vote);
        if (userId === members.myID) {
          userIdRef.current = userId;
          setUserName(name);
          setUserVote(vote);
        }
      });
      setMembers(membersMap);
      setMemberCount(membersMap.size);
      updateVotes(membersMap);

      // Load chat history from Redis
      try {
        const response = await fetch('/api/synthjam-chat');
        if (response.ok) {
          const data = await response.json();
          if (data.messages && Array.isArray(data.messages)) {
            setChatMessages((prev) => [
              ...data.messages.map((msg) => ({
                type: 'user',
                userId: msg.userId,
                name: msg.name,
                message: msg.message,
                timestamp: msg.timestamp,
              })),
              ...prev,
            ]);
          }
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    });

    channel.bind('pusher:subscription_error', (error) => {
      console.error('Subscription error:', error);
      setIsSubscribed(false);
      setConnectionStatus('disconnected');
      
      // Show user-friendly error
      if (error.error && error.error.includes('client events')) {
        alert('Client events not enabled. Please enable "Client events" in your Pusher app settings.');
      }
    });

    channel.bind('pusher:member_added', (member) => {
      const membersMap = new Map(members);
      membersMap.set(member.id, member.info);
      const vote = member.info.user_info?.vote || 'grand_piano';
      voteMapRef.current.set(member.id, vote);
      setMembers(membersMap);
      setMemberCount(membersMap.size);
      updateVotes(membersMap);

      // System message
      setChatMessages((prev) => [
        ...prev,
        {
          type: 'system',
          message: `${member.info.user_info?.name || 'Someone'} joined the band`,
        },
      ]);
    });

    channel.bind('pusher:member_removed', (member) => {
      const membersMap = new Map(members);
      membersMap.delete(member.id);
      voteMapRef.current.delete(member.id);
      setMembers(membersMap);
      setMemberCount(membersMap.size);
      updateVotes(membersMap);

      // System message
      const memberName = members.get(member.id)?.user_info?.name || 'Someone';
      setChatMessages((prev) => [
        ...prev,
        {
          type: 'system',
          message: `${memberName} left the band`,
        },
      ]);
    });

    channel.bind('client-note-played', (data) => {
      if (data.userId !== userIdRef.current) {
        playNote(data.note, data.duration, false);
      }
    });

    channel.bind('client-chat-message', (data) => {
      setChatMessages((prev) => [
        ...prev,
        {
          type: 'user',
          userId: data.userId,
          name: data.name,
          message: data.message,
          timestamp: Date.now(),
        },
      ]);
    });

    channel.bind('client-vote-cast', (data) => {
      if (!data.userId || !data.vote) return;
      if (!INSTRUMENTS[data.vote]) {
        console.warn('Invalid vote:', data.vote);
        return;
      }
      
      voteMapRef.current.set(data.userId, data.vote);
      updateVotes();

      // System message
      const memberName = members.get(data.userId)?.user_info?.name || 'Someone';
      const instrumentName = INSTRUMENTS[data.vote]?.name || data.vote;
      setChatMessages((prev) => [
        ...prev,
        {
          type: 'system',
          message: `${memberName} voted for ${instrumentName}`,
        },
      ]);
    });

    setShowEntryModal(false);
  }, [members, initializeAudio, updateVotes, playNote]);

  // Cast vote
  const castVote = useCallback((instrument) => {
    if (!channelRef.current || !userIdRef.current || !isSubscribed) {
      console.warn('Cannot cast vote: channel not ready', {
        hasChannel: !!channelRef.current,
        hasUserId: !!userIdRef.current,
        isSubscribed,
      });
      return;
    }
    if (!INSTRUMENTS[instrument]) {
      console.warn('Invalid instrument:', instrument);
      return;
    }

    try {
      setUserVote(instrument);
      voteMapRef.current.set(userIdRef.current, instrument);

      // Broadcast vote
      try {
        if (channelRef.current && channelRef.current.trigger) {
          const result = channelRef.current.trigger('client-vote-cast', {
            userId: userIdRef.current,
            vote: instrument,
          });
          if (result === false) {
            console.warn('Vote trigger returned false - client events may not be enabled');
          }
        } else {
          console.warn('Channel not ready for triggering events');
        }
      } catch (error) {
        console.error('Failed to broadcast vote:', error);
        if (error && error.message && error.message.includes('client events')) {
          alert('Client events not enabled. Please enable "Client events" in Pusher app settings.');
        }
        // Still update local state
        updateVotes();
        return;
      }

      updateVotes();
    } catch (error) {
      console.error('Failed to cast vote:', error);
    }
  }, [updateVotes, isSubscribed]);

  // Send chat message
  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || !channelRef.current || !userIdRef.current || !isSubscribed) return;

    // Rate limiting
    const now = Date.now();
    if (now - lastChatTime < 2000) {
      alert('Please wait before sending another message');
      return;
    }

    try {
      // Profanity filter
      let message = chatInput.trim();
      if (filter.check(message)) {
        message = filter.clean(message);
      }

      if (!message) {
        alert('Message cannot be empty');
        return;
      }

      const messageData = {
        userId: userIdRef.current,
        name: userName,
        message,
        timestamp: now,
      };

      // Save to Redis
      try {
        await fetch('/api/synthjam-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageData),
        });
      } catch (error) {
        console.error('Failed to save chat to Redis:', error);
        // Continue anyway - still broadcast via Pusher
      }

      // Broadcast via Pusher
      try {
        if (channelRef.current && channelRef.current.trigger) {
          const result = channelRef.current.trigger('client-chat-message', messageData);
          if (result === false) {
            console.warn('Chat trigger returned false - client events may not be enabled');
            // Still add to local chat
            setChatMessages((prev) => [
              ...prev,
              {
                type: 'user',
                ...messageData,
              },
            ]);
          }
        } else {
          console.warn('Channel not ready for triggering chat');
          // Still add to local chat
          setChatMessages((prev) => [
            ...prev,
            {
              type: 'user',
              ...messageData,
            },
          ]);
        }
      } catch (error) {
        console.error('Failed to broadcast chat message:', error);
        if (error && error.message && error.message.includes('client events')) {
          alert('Client events not enabled. Please enable "Client events" in Pusher app settings.');
        }
        // Still add to local chat if broadcast fails
        setChatMessages((prev) => [
          ...prev,
          {
            type: 'user',
            ...messageData,
          },
        ]);
      }

      setChatInput('');
      setLastChatTime(now);
    } catch (error) {
      console.error('Failed to send chat message:', error);
      alert('Failed to send message. Please try again.');
    }
  }, [chatInput, lastChatTime, userName, isSubscribed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.dispose();
      }
      if (reverbRef.current) {
        reverbRef.current.dispose();
      }
      if (limiterRef.current) {
        limiterRef.current.dispose();
      }
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, []);

  // Update votes when members change
  useEffect(() => {
    if (members.size > 0) {
      updateVotes();
    }
  }, [members, updateVotes]);

  // Render piano key
  const renderPianoKey = (midiNote) => {
    const noteName = Tone.Frequency(midiNote, 'midi').toNote();
    const isBlack = noteName.includes('#');
    const octave = Math.floor(midiNote / 12) - 1;
    const note = NOTE_NAMES[midiNote % 12];

    return (
      <button
        key={midiNote}
        className={`piano-key ${isBlack ? 'black-key' : 'white-key'}`}
        onMouseDown={() => playNote(midiNote)}
        onTouchStart={(e) => {
          e.preventDefault();
          playNote(midiNote);
        }}
        style={{
          backgroundColor: isBlack ? '#1a1a1a' : '#ffffff',
          color: isBlack ? '#fff' : '#000',
          border: `1px solid ${isBlack ? '#000' : '#ccc'}`,
        }}
      >
        {!isBlack && (
          <span className="key-label">
            {note}
            <sub>{octave}</sub>
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="synthjam-container">
      {/* Entry Modal */}
      {showEntryModal && (
        <div className="entry-modal">
          <div className="modal-content">
            <h2>Enter your Stage Name</h2>
            <input
              type="text"
              maxLength={12}
              placeholder="Max 12 characters"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  joinLobby(e.target.value);
                }
              }}
            />
            <button onClick={() => joinLobby(userName)}>Join Lobby</button>
          </div>
        </div>
      )}

      {/* Main Interface */}
      {!showEntryModal && (
        <>
          {/* Header */}
          <header className="synthjam-header">
            <div className="header-left">
              <h1>SynthJam</h1>
              <div className="connection-status">
                {connectionStatus === 'connected' ? (
                  <Wifi className="status-icon connected" />
                ) : connectionStatus === 'connecting' ? (
                  <Radio className="status-icon connecting" />
                ) : (
                  <WifiOff className="status-icon disconnected" />
                )}
                <span>{memberCount} online</span>
              </div>
            </div>

            {/* Voting Panel */}
            <div className="voting-panel">
              {Object.entries(INSTRUMENTS).map(([id, instrument]) => (
                <button
                  key={id}
                  className={`vote-button ${activeInstrument === id ? 'active' : ''} ${userVote === id ? 'user-vote' : ''}`}
                  onClick={() => castVote(id)}
                  title={instrument.name}
                >
                  <span className="instrument-icon">{instrument.icon}</span>
                  <span className="vote-count">{voteCounts[id] || 0}</span>
                  {activeInstrument === id && <span className="winner-badge">✓</span>}
                </button>
              ))}
            </div>
          </header>

          {/* Piano Roll */}
          <div className="piano-roll-container">
            <div className="piano-roll">
              {Array.from({ length: 36 }, (_, i) => 48 + i).map((note) => renderPianoKey(note))}
            </div>
          </div>

          {/* Chat Widget */}
          <div className={`chat-widget ${isChatOpen ? 'open' : ''}`}>
            <button
              className="chat-toggle"
              onClick={() => setIsChatOpen(!isChatOpen)}
            >
              <MessageSquare />
            </button>
            {isChatOpen && (
              <div className="chat-panel">
                <div className="chat-header">
                  <h3>Chat</h3>
                  <button onClick={() => setIsChatOpen(false)}>
                    <X />
                  </button>
                </div>
                <div className="chat-messages">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.type}`}>
                      {msg.type === 'user' ? (
                        <>
                          <strong>{msg.name}:</strong> {msg.message}
                        </>
                      ) : (
                        <em>{msg.message}</em>
                      )}
                    </div>
                  ))}
                </div>
                <div className="chat-input-container">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        sendChatMessage();
                      }
                    }}
                    placeholder="Type a message..."
                  />
                  <button onClick={sendChatMessage}>Send</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .synthjam-container {
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          overflow: hidden;
        }

        .entry-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          color: #333;
          padding: 2rem;
          border-radius: 12px;
          text-align: center;
          min-width: 300px;
        }

        .modal-content h2 {
          margin: 0 0 1.5rem 0;
        }

        .modal-content input {
          width: 100%;
          padding: 0.75rem;
          margin-bottom: 1rem;
          border: 2px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
        }

        .modal-content button {
          width: 100%;
          padding: 0.75rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
        }

        .synthjam-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background: rgba(0, 0, 0, 0.3);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .header-left h1 {
          margin: 0;
          font-size: 1.5rem;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-icon {
          width: 20px;
          height: 20px;
        }

        .status-icon.connected {
          color: #10b981;
        }

        .status-icon.connecting {
          color: #f59e0b;
        }

        .status-icon.disconnected {
          color: #ef4444;
        }

        .voting-panel {
          display: flex;
          gap: 1rem;
        }

        .vote-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid transparent;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .vote-button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .vote-button.active {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.2);
        }

        .vote-button.user-vote {
          border-color: #3b82f6;
        }

        .instrument-icon {
          font-size: 1.5rem;
        }

        .vote-count {
          font-size: 0.875rem;
          font-weight: bold;
        }

        .winner-badge {
          color: #10b981;
          font-weight: bold;
        }

        .piano-roll-container {
          flex: 1;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 2rem;
        }

        .piano-roll {
          display: flex;
          gap: 0;
          height: 100%;
          min-width: max-content;
        }

        .piano-key {
          position: relative;
          border: none;
          cursor: pointer;
          user-select: none;
          transition: transform 0.1s;
        }

        .piano-key:active {
          transform: scale(0.95);
        }

        .white-key {
          width: 60px;
          height: 200px;
        }

        .black-key {
          width: 40px;
          height: 120px;
          margin-left: -20px;
          margin-right: -20px;
          z-index: 1;
        }

        .key-label {
          position: absolute;
          bottom: 0.5rem;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.75rem;
        }

        .chat-widget {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          z-index: 100;
        }

        .chat-toggle {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #667eea;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .chat-panel {
          position: absolute;
          bottom: 70px;
          right: 0;
          width: 320px;
          height: 400px;
          background: white;
          color: #333;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #eee;
        }

        .chat-header h3 {
          margin: 0;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .chat-message {
          margin-bottom: 0.5rem;
        }

        .chat-message.system {
          color: #666;
          font-style: italic;
        }

        .chat-input-container {
          display: flex;
          gap: 0.5rem;
          padding: 1rem;
          border-top: 1px solid #eee;
        }

        .chat-input-container input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 6px;
        }

        .chat-input-container button {
          padding: 0.5rem 1rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .synthjam-header {
            flex-direction: column;
            gap: 1rem;
          }

          .voting-panel {
            flex-wrap: wrap;
            justify-content: center;
          }

          .piano-key.white-key {
            width: 40px;
            height: 150px;
          }

          .piano-key.black-key {
            width: 30px;
            height: 90px;
          }

          .chat-panel {
            width: calc(100vw - 2rem);
            right: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default SynthJam;

