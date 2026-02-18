import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../firebase'; // Adjust the import path as necessary
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  where,
  arrayUnion
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  MessageCircle, 
  Users, 
  Image as ImageIcon, 
  Send, 
  UserPlus, 
  UserMinus, 
  Key,
  Plus,
  Copy,
  X,
  Edit
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto: string;
  timestamp: any;
  roomId: string;
}

interface User {
  id: string;
  name: string;
  photo: string;
  isAdmin: boolean;
  isOnline: boolean;
}

interface Room {
  id: string;
  name: string;
  roomKey: string;
  adminId: string;
  members: string[];
  createdAt: any;
  maxMembers: number;
}

interface Member {
  name: string;
  photo: string;
}

const ChatRoom: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  
  // UI States
  const [showRoomSelection, setShowRoomSelection] = useState(true);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  
  // Form States
  const [userName, setUserName] = useState('');
  const [userPhoto, setUserPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [roomKey, setRoomKey] = useState('');
  const [roomName, setRoomName] = useState('');
  const [maxMembers, setMaxMembers] = useState(5);
  const [members, setMembers] = useState<Member[]>([{ name: '', photo: '' }]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Test Firebase connection on component mount
  useEffect(() => {
    console.log('Component mounted, testing Firebase connection...');
    
    // Test Firestore connection
    const testFirestore = async () => {
      try {
        const testCollection = collection(db, 'test');
        console.log('Firestore connection successful');
        
        // Test if we can query rooms collection
        const roomsQuery = query(collection(db, 'rooms'));
        const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
          console.log('Rooms collection accessible, found', snapshot.docs.length, 'rooms');
          unsubscribe();
        }, (error) => {
          console.error('Error accessing rooms collection:', error);
        });
      } catch (error) {
        console.error('Firestore connection failed:', error);
      }
    };
    
    testFirestore();
  }, []);

  // Generate random room key
  const generateRoomKey = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  // Copy room key to clipboard
  const copyRoomKey = (key: string) => {
    navigator.clipboard.writeText(key);
    alert('Room key copied to clipboard!');
  };

  useEffect(() => {
    if (currentRoom && currentUser) {
      // Subscribe to messages for current room
      const q = query(
        collection(db, 'messages'), 
        where('roomId', '==', currentRoom.id),
        orderBy('timestamp', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
        setMessages(newMessages);
        scrollToBottom();
      });

      // Subscribe to room users
      const usersQuery = query(
        collection(db, 'users'),
        where('roomId', '==', currentRoom.id)
      );
      const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const newUsers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        setUsers(newUsers);
      });

      return () => {
        unsubscribe();
        unsubscribeUsers();
      };
    }
  }, [currentRoom, currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCreateRoom = async () => {
    console.log('Create room clicked', { roomName, userName }); // Debug log
    
    if (!roomName.trim()) {
      alert('Please enter a room name');
      return;
    }
    
    if (!userName.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      console.log('Creating room...'); // Debug log
      const newRoomKey = generateRoomKey();
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Upload user photo if provided
      let photoURL = '';
      if (userPhoto) {
        console.log('Uploading photo...'); // Debug log
        const storageRef = ref(storage, `profile-photos/${userId}`);
        const snapshot = await uploadBytes(storageRef, userPhoto);
        photoURL = await getDownloadURL(snapshot.ref);
        console.log('Photo uploaded:', photoURL); // Debug log
      }

      // Create room document
      const roomRef = doc(collection(db, 'rooms'));
      const newRoom: Room = {
        id: roomRef.id,
        name: roomName,
        roomKey: newRoomKey,
        adminId: userId,
        members: [userId],
        createdAt: serverTimestamp(),
        maxMembers: maxMembers
      };

      console.log('Creating room document...', newRoom); // Debug log
      await setDoc(roomRef, newRoom);

      // Create admin user document
      const userRef = doc(db, 'users', userId);
      const newUser: User = {
        id: userId,
        name: userName,
        photo: photoURL,
        isAdmin: true,
        isOnline: true
      };

      console.log('Creating user document...', newUser); // Debug log
      await setDoc(userRef, {
        ...newUser,
        roomId: roomRef.id
      });

      // Add predefined members to the room
      const memberIds = [userId];
      for (const member of members) {
        if (member.name.trim()) {
          const memberId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const memberRef = doc(db, 'users', memberId);
          
          await setDoc(memberRef, {
            id: memberId,
            name: member.name,
            photo: member.photo || '',
            isAdmin: false,
            isOnline: false,
            roomId: roomRef.id
          });
          
          memberIds.push(memberId);
        }
      }

      // Update room with all member IDs
      await updateDoc(roomRef, {
        members: memberIds
      });

      console.log('Room created successfully!'); // Debug log
      setCurrentRoom(newRoom);
      setCurrentUser(newUser);
      setShowCreateRoom(false);
      setShowRoomSelection(false);
      
      alert(`Room created successfully! Room Key: ${newRoomKey}\n\nShare this key with others to let them join your room.`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert(`Error creating room: ${error.message}`);
    }
  };

  const handleJoinRoom = async () => {
    console.log('Join room clicked', { roomKey, userName }); // Debug log
    
    if (!roomKey.trim()) {
      alert('Please enter a room key');
      return;
    }
    
    if (!userName.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      console.log('Searching for room with key:', roomKey.toUpperCase()); // Debug log
      
      // Find room with this key
      const roomsQuery = query(collection(db, 'rooms'), where('roomKey', '==', roomKey.toUpperCase()));
      
      return new Promise((resolve, reject) => {
        const unsubscribe = onSnapshot(roomsQuery, async (snapshot) => {
          unsubscribe();
          
          try {
            console.log('Room query result:', snapshot.docs.length); // Debug log
            
            if (snapshot.empty) {
              alert('Invalid room key! Please check and try again.');
              resolve(null);
              return;
            }

            const roomDoc = snapshot.docs[0];
            const room = { id: roomDoc.id, ...roomDoc.data() } as Room;
            console.log('Found room:', room); // Debug log

            // Check if room is full
            if (room.members && room.members.length >= room.maxMembers) {
              alert('Room is full! Cannot join.');
              resolve(null);
              return;
            }

            const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Upload user photo if provided
            let photoURL = '';
            if (userPhoto) {
              console.log('Uploading photo...'); // Debug log
              const storageRef = ref(storage, `profile-photos/${userId}`);
              const snapshot = await uploadBytes(storageRef, userPhoto);
              photoURL = await getDownloadURL(snapshot.ref);
              console.log('Photo uploaded:', photoURL); // Debug log
            }

            // Create user document
            const userRef = doc(db, 'users', userId);
            const newUser: User = {
              id: userId,
              name: userName,
              photo: photoURL,
              isAdmin: false,
              isOnline: true
            };

            console.log('Creating user document...', newUser); // Debug log
            await setDoc(userRef, {
              ...newUser,
              roomId: room.id
            });

            // Add user to room members
            const updatedMembers = [...(room.members || []), userId];
            await updateDoc(doc(db, 'rooms', room.id), {
              members: updatedMembers
            });

            console.log('Successfully joined room!'); // Debug log
            setCurrentRoom(room);
            setCurrentUser(newUser);
            setShowJoinRoom(false);
            setShowRoomSelection(false);
            
            alert(`Successfully joined "${room.name}"!`);
            resolve(room);
          } catch (error) {
            console.error('Error in join room process:', error);
            alert(`Error joining room: ${error.message}`);
            reject(error);
          }
        }, (error) => {
          console.error('Error querying rooms:', error);
          alert(`Error searching for room: ${error.message}`);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error joining room:', error);
      alert(`Error joining room: ${error.message}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !currentRoom) return;

    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        userId: currentUser.id,
        userName: currentUser.name,
        userPhoto: currentUser.photo,
        roomId: currentRoom.id,
        timestamp: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUserPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addMember = () => {
    setMembers([...members, { name: '', photo: '' }]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: 'name' | 'photo', value: string) => {
    const updatedMembers = [...members];
    updatedMembers[index][field] = value;
    setMembers(updatedMembers);
  };

  // Room Selection Screen
  if (showRoomSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <MessageCircle className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Welcome to Chat Room</h1>
            <p className="text-gray-600 mt-2">Choose an option to get started</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => {
                console.log('Join room button clicked'); // Debug log
                setShowJoinRoom(true);
              }}
              className="w-full bg-indigo-600 text-white rounded-lg px-6 py-3 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Key className="w-5 h-5" />
              Join with Room Key
            </button>
            
            <button
              onClick={() => {
                console.log('Create room button clicked'); // Debug log
                setShowCreateRoom(true);
              }}
              className="w-full bg-green-600 text-white rounded-lg px-6 py-3 hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Join Room Modal
  if (showJoinRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Join Room</h2>
            <button
              onClick={() => setShowJoinRoom(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room Key
              </label>
              <input
                type="text"
                value={roomKey}
                onChange={(e) => setRoomKey(e.target.value.toUpperCase())}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="Enter room key"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profile Photo (Optional)
              </label>
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-200 transition-colors"
                >
                  Upload Photo
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={!roomKey.trim() || !userName.trim()}
              className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create Room Modal
  if (showCreateRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Create New Room</h2>
            <button
              onClick={() => setShowCreateRoom(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Room Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Enter room name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Members
                </label>
                <input
                  type="number"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(Math.max(2, parseInt(e.target.value) || 2))}
                  min="2"
                  max="50"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
            </div>

            {/* Admin Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Your Details (Admin)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Photo (Optional)
                  </label>
                  <div className="flex items-center gap-4">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gray-100 text-gray-700 rounded-lg px-3 py-1 hover:bg-gray-200 transition-colors text-sm"
                    >
                      Upload
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Members */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Members (Optional)</h3>
                <button
                  onClick={addMember}
                  className="bg-indigo-600 text-white rounded-lg px-3 py-1 hover:bg-indigo-700 transition-colors text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Member
                </button>
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {members.map((member, index) => (
                  <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => updateMember(index, 'name', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-3 py-1"
                      placeholder="Member name"
                    />
                    {members.length > 1 && (
                      <button
                        onClick={() => removeMember(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={!roomName.trim() || !userName.trim()}
              className="w-full bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Chat Interface
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - User List */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Room Members
            </h2>
          </div>
          {currentRoom && (
            <div className="bg-gray-50 p-2 rounded text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">Room: {currentRoom.name}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-600">Key: {currentRoom.roomKey}</span>
                <button
                  onClick={() => copyRoomKey(currentRoom.roomKey)}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {users.map(user => (
            <div key={user.id} className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={user.photo || 'https://via.placeholder.com/40'}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">{user.isAdmin ? 'Admin' : 'Member'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-semibold">{currentRoom?.name || 'Chat Room'}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowRoomSelection(true)}
                className="p-2 text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <Key className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.userId === currentUser?.id ? 'flex-row-reverse' : ''
              }`}
            >
              <img
                src={message.userPhoto || 'https://via.placeholder.com/40'}
                alt={message.userName}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div
                className={`max-w-[70%] ${
                  message.userId === currentUser?.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-900'
                } rounded-lg p-3 shadow-sm`}
              >
                <p className="text-sm font-medium mb-1">{message.userName}</p>
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;