import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
    useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { auth, database } from '../../../../firebaseConfig';
import { ref, push, query, orderByChild, limitToLast, onValue } from 'firebase/database';
import { router } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';

export default function Chat() {
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
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now() 
    };

    try {
      await push(messagesRef, newMessageData);
      setChatMessage('');
    } catch (error) {
      //TODO(Show error)
    }
  };

  const renderMessageBubble = ({ item }) => (
    <View style={[styles.messageWrapper, item.isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
      {!item.isMe && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.sender.charAt(0)}</Text>
        </View>
      )}
      <View style={[styles.messageBubble, item.isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
        <View style={styles.messageMeta}>
          <Text style={[styles.messageSender, item.isMe && styles.messageSenderMe]}>{item.sender}</Text>
          <Text style={styles.messageTime}>{item.time}</Text>
        </View>
        <Text style={[styles.messageText, item.isMe && styles.messageTextMe]}>{item.text}</Text>
      </View>
    </View>
  );

    return (
      <KeyboardAvoidingView 
        style={styles.screen} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.mainLayout}>
          
          <View style={styles.headerBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Chat</Text>
              <Text style={styles.headerSubtitle}>Title</Text>
            </View>
          </View>
  
          <FlatList
            style={{ flex: 1, backgroundColor: '#F9FAFB' }}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageBubble}
            inverted={true} 
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreHistory}
            onEndReachedThreshold={0.2}
            
            ListEmptyComponent={
              <View style={styles.emptyChatContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyChatText}>No messages yet.</Text>
              </View>
            }
            
            ListFooterComponent={
              loadingHistory ? <ActivityIndicator size="small" color="#0F766E" style={{ marginVertical: 12 }} /> : null
            }
          />
  
          <View style={styles.chatInputContainer}>
            <TouchableOpacity style={styles.attachBtn}>
              <Ionicons name="location-outline" size={22} color="#6B7280" />
            </TouchableOpacity>
            <TextInput 
              style={styles.chatInput}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={chatMessage}
              onChangeText={setChatMessage}
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, chatMessage.trim().length > 0 && styles.sendBtnActive]} 
              onPress={handleSendMessage}
            >
              <Ionicons name="send" size={16} color={chatMessage.trim().length > 0 ? "#FFFFFF" : "#9CA3AF"} />
            </TouchableOpacity>
          </View>
  
        </View>
      </KeyboardAvoidingView>
    );
  }
  
  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F3F4F6' },
    mainLayout: { flex: 1, alignSelf: 'center', width: '100%', backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 10 },
    
    headerBar: { backgroundColor: '#0F766E', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 16, paddingBottom: 16 },
    backButton: { marginRight: 16 },
    headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    headerSubtitle: { color: '#CCFBF1', fontSize: 12, marginTop: 2 },
  
    emptyChatContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, transform: [{ scaleY: -1 }] },
    emptyChatText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600', marginTop: 12 },
  
    messageWrapper: { flexDirection: 'row', marginBottom: 16, maxWidth: '85%' },
    messageWrapperMe: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
    messageWrapperOther: { alignSelf: 'flex-start' },
    avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#94A3B8', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginLeft: 8 },
    avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    messageBubble: { padding: 12, borderRadius: 16 },
    messageBubbleOther: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderTopLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    messageBubbleMe: { backgroundColor: '#0D9488', borderTopRightRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
    messageMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
    messageSender: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
    messageSenderMe: { color: '#CCFBF1' },
    messageTime: { fontSize: 10, color: '#9CA3AF' },
    messageText: { fontSize: 14, color: '#1F2937', lineHeight: 20 },
    messageTextMe: { color: '#FFFFFF' },
  
    chatInputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingBottom: Platform.OS === 'ios' ? 24 : 12 },
    attachBtn: { padding: 8 },
    chatInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#111827', maxHeight: 100 },
    sendBtn: { marginLeft: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
    sendBtnActive: { backgroundColor: '#059669' },
  });