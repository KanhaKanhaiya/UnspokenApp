import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';
import { limitToLast, onValue, orderByChild, push, query, ref, serverTimestamp } from 'firebase/database';
import { auth, database } from '../../../../../firebaseConfig';
import { useAuth } from "@/src/hooks/useAuth"

const KeyboardWrapper = Platform.OS === 'web' ? View : KeyboardAvoidingView;

export default function Chat() {
const { user } = useAuth()
  const { id } = useLocalSearchParams();
  //TODO(Add null check)

  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([]);

  const [messagesLimit, setMessagesLimit] = useState(20);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  useEffect(() => {
    const messagesRef = ref(database, `messages/${id}`);
    const paginatedQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(messagesLimit));

    const unsubscribe = onValue(paginatedQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const totalAvailable = Object.keys(data).length;
        if (totalAvailable < messagesLimit) setHasMoreHistory(false);

        const formattedMessages = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
          isMe: data[key].senderUid === auth.currentUser?.uid,
        }));

        setMessages(formattedMessages.reverse());
      } else {
        setMessages([]);
        setHasMoreHistory(false);
      }
      setLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [messagesLimit, id]);

  const loadMoreHistory = () => {
    if (loadingHistory || !hasMoreHistory) return;
    setLoadingHistory(true);
    setMessagesLimit((previousLimit) => previousLimit + 20);
  };

  const handleSendMessage = async () => {
    if (chatMessage.trim().length === 0) return;

    const messagesRef = ref(database, `messages/${id}`);
    const newMessageData = {
      sender: auth.currentUser.displayName,
      senderUid: auth.currentUser.uid,
      text: chatMessage.trim(),
      timestamp: serverTimestamp()
    };

    try {
      await push(messagesRef, newMessageData);
      setChatMessage('');
    } catch (error) {
      //TODO(Show error)
    }
  };

  const renderMessageBubble = ({ item }) => (
    <View className={`flex-row mb-4 max-w-[85%] ${item.isMe ? 'self-end flex-row-reverse' : 'self-start'}`}>
      {!item.isMe && (
        <View className="w-8 h-8 rounded-full bg-muted-foreground/30 items-center justify-center mr-2 ml-2">
          <Text className="text-white text-sm font-bold">{item.sender.charAt(0)}</Text>
        </View>
      )}
      <View className={`p-3 rounded-2xl shadow-sm ${item.isMe ? 'bg-primary rounded-tr-sm' : 'bg-card border border-border rounded-tl-sm'}`}>
        <View className="flex-row items-center mb-1 gap-1">
          <Text className={`text-[11px] font-bold ${item.isMe ? 'text-white/90' : 'text-muted-foreground'}`}>{item.sender}</Text>
          <Text className={`text-[10px] ${item.isMe ? 'text-white/70' : 'text-muted-foreground/70'}`}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <Text className={`text-sm leading-5 ${item.isMe ? 'text-white' : 'text-foreground'}`}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardWrapper
      style={{ flex: 1, backgroundColor: 'transparent' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 w-full mx-auto bg-background shadow-sm">

        <View className="bg-primary flex-row items-center px-4 pt-12 pb-4 shadow-sm z-10">
          <TouchableOpacity className="mr-4 p-1" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View className="flex-col">
            <Text className="text-white text-lg font-bold">Chat</Text>
            <Text className="text-white/80 text-xs mt-0.5">Title</Text>
          </View>
        </View>

        <View className="flex-1 bg-muted/30">
          <FlatList
            style={{ flex: 1 }}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageBubble}
            inverted={true}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreHistory}
            onEndReachedThreshold={0.2}

            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-10">
                <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
                <Text className="text-muted-foreground text-sm font-semibold mt-3">No messages yet.</Text>
              </View>
            }

            ListFooterComponent={
              loadingHistory ? <ActivityIndicator size="small" color="#0F766E" style={{ marginVertical: 12 }} /> : null
            }
          />
        </View>

{user ?        <View className={`flex-row items-center p-3 bg-background border-t border-border ${Platform.OS === 'ios' ? 'pb-6' : 'pb-3'}`}>
          <TouchableOpacity className="p-2">
            <Ionicons name="location-outline" size={22} color="#6B7280" />
          </TouchableOpacity>
          <TextInput
            className="flex-1 bg-muted rounded-2xl px-4 py-2.5 text-sm text-foreground max-h-25"
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={chatMessage}
            onChangeText={setChatMessage}
            onSubmitEditing={handleSendMessage}
            multiline
          />
          <TouchableOpacity
            className={`ml-2 w-10 h-10 rounded-full items-center justify-center transition-colors ${chatMessage.trim().length > 0 ? 'bg-primary' : 'bg-muted'}`}
            onPress={handleSendMessage}
          >
            <Ionicons name="send" size={16} color={chatMessage.trim().length > 0 ? "#FFFFFF" : "#9CA3AF"} />
          </TouchableOpacity>
        </View> : <Text>Login to send messages.</Text> }

      </View>
    </KeyboardWrapper>
  );
}
