import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { Text, useTheme, Card, Avatar, TextInput, IconButton, ActivityIndicator, Divider, Menu, Portal, Modal, RadioButton, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api, Match, Message } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useSocket } from '@/hooks/useSocket';

const REPORT_REASONS = [
  { value: 'inappropriate', label: 'Ongepast gedrag' },
  { value: 'spam', label: 'Spam of reclame' },
  { value: 'fake', label: 'Nep profiel' },
  { value: 'harassment', label: 'Intimidatie of pesten' },
  { value: 'other', label: 'Anders' },
];

export default function ChatsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { 
    isConnected, 
    joinChat, 
    leaveChat, 
    sendMessage: socketSendMessage, 
    onNewMessage,
    onUserTyping,
    onUserStoppedTyping,
    startTyping,
    stopTyping
  } = useSocket();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // Block/Report state
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('inappropriate');
  const [reportDetails, setReportDetails] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getMatches();
      if (response.success) {
        setMatches(response.data);
      }
    } catch (error) {
      console.error('Load matches error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (matchId: string) => {
    try {
      setLoadingMessages(true);
      const response = await api.getMessages(matchId);
      if (response.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    if (selectedMatch) {
      loadMessages(selectedMatch.id);
      
      // Join the chat room for real-time messages
      if (isConnected) {
        joinChat(selectedMatch.id);
      }

      return () => {
        leaveChat();
      };
    }
  }, [selectedMatch, loadMessages, isConnected, joinChat, leaveChat]);

  // Listen for real-time messages
  useEffect(() => {
    if (selectedMatch && isConnected) {
      onNewMessage((message) => {
        if (message.matchId === selectedMatch.id) {
          setMessages((prev) => {
            // Prevent duplicates
            if (prev.find(m => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });
          flatListRef.current?.scrollToEnd();
        }
      });

      onUserTyping((data) => {
        if (data.matchId === selectedMatch.id && data.userId !== user?.id) {
          setIsTyping(true);
        }
      });

      onUserStoppedTyping((data) => {
        if (data.matchId === selectedMatch.id && data.userId !== user?.id) {
          setIsTyping(false);
        }
      });
    }
  }, [selectedMatch, isConnected, onNewMessage, onUserTyping, onUserStoppedTyping, user?.id]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedMatch) return;

    const text = messageText.trim();
    setMessageText('');
    
    // Use WebSocket if connected, fallback to API
    if (isConnected) {
      socketSendMessage(selectedMatch.id, text);
      stopTyping(selectedMatch.id);
    } else {
      // Fallback to API
      setSending(true);
      try {
        const response = await api.sendMessage(selectedMatch.id, text);
        if (response.success) {
          setMessages((prev) => [...prev, response.data]);
          flatListRef.current?.scrollToEnd();
        }
      } catch (error) {
        console.error('Send message error:', error);
      } finally {
        setSending(false);
      }
    }
  };

  // Handle typing indicator
  const handleTextChange = (text: string) => {
    setMessageText(text);
    
    if (selectedMatch && isConnected && text.length > 0) {
      startTyping(selectedMatch.id);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedMatch.id);
      }, 2000);
    }
  };

  const handleBlockUser = () => {
    if (!selectedMatch) return;
    
    Alert.alert(
      'Gebruiker blokkeren',
      `Weet je zeker dat je ${selectedMatch.otherUser.name} wilt blokkeren? Deze persoon kan je niet meer bereiken en jullie match wordt verwijderd.`,
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Blokkeren',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.blockUser(selectedMatch.otherUser.id);
              Alert.alert('Geblokkeerd', 'De gebruiker is geblokkeerd.');
              setSelectedMatch(null);
              loadMatches(); // Refresh matches
            } catch (error) {
              console.error('Block error:', error);
              Alert.alert('Fout', 'Kon gebruiker niet blokkeren.');
            }
          },
        },
      ]
    );
  };

  const handleReportUser = async () => {
    if (!selectedMatch) return;
    
    setReportLoading(true);
    try {
      await api.reportUser(selectedMatch.otherUser.id, reportReason, reportDetails);
      Alert.alert('Bedankt', 'Je melding is verzonden. We nemen dit serieus.');
      setReportModalVisible(false);
      setReportReason('inappropriate');
      setReportDetails('');
    } catch (error) {
      console.error('Report error:', error);
      Alert.alert('Fout', 'Kon melding niet verzenden.');
    } finally {
      setReportLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Gisteren';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('nl-NL', { weekday: 'short' });
    }
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  };

  const renderMatchItem = ({ item }: { item: Match }) => (
    <Card
      style={styles.matchCard}
      onPress={() => setSelectedMatch(item)}
    >
      <Card.Content style={styles.matchContent}>
        {item.otherUser.avatarUrl ? (
          <Avatar.Image size={50} source={{ uri: item.otherUser.avatarUrl }} />
        ) : (
          <Avatar.Text
            size={50}
            label={item.otherUser.name.substring(0, 2).toUpperCase()}
            style={{ backgroundColor: theme.colors.primaryContainer }}
          />
        )}
        <View style={styles.matchInfo}>
          <Text variant="titleMedium" style={styles.matchName}>
            {item.otherUser.name}
          </Text>
          {item.lastMessage ? (
            <Text
              variant="bodyMedium"
              numberOfLines={1}
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {item.lastMessage.senderId === user?.id ? 'Jij: ' : ''}
              {item.lastMessage.text}
            </Text>
          ) : (
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.primary, fontStyle: 'italic' }}
            >
              Start een gesprek!
            </Text>
          )}
        </View>
        {item.lastMessage && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatTime(item.lastMessage.createdAt)}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === user?.id;

    return (
      <View
        style={[
          styles.messageBubble,
          isOwn ? styles.ownMessage : styles.otherMessage,
          { backgroundColor: isOwn ? theme.colors.primary : theme.colors.surfaceVariant },
        ]}
      >
        <Text
          variant="bodyMedium"
          style={{ color: isOwn ? theme.colors.onPrimary : theme.colors.onSurface }}
        >
          {item.text}
        </Text>
        <Text
          variant="bodySmall"
          style={{
            color: isOwn ? 'rgba(255,255,255,0.7)' : theme.colors.onSurfaceVariant,
            alignSelf: 'flex-end',
            marginTop: 4,
          }}
        >
          {formatTime(item.createdAt)}
        </Text>
      </View>
    );
  };

  // Chat view
  if (selectedMatch) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.chatHeader}>
          <IconButton icon="arrow-left" onPress={() => setSelectedMatch(null)} />
          {selectedMatch.otherUser.avatarUrl ? (
            <Avatar.Image size={40} source={{ uri: selectedMatch.otherUser.avatarUrl }} />
          ) : (
            <Avatar.Text
              size={40}
              label={selectedMatch.otherUser.name.substring(0, 2).toUpperCase()}
              style={{ backgroundColor: theme.colors.primaryContainer }}
            />
          )}
          <View style={styles.chatHeaderInfo}>
            <Text variant="titleMedium">{selectedMatch.otherUser.name}</Text>
            <View style={styles.connectionStatus}>
              <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#FF9800' }]} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {isConnected ? 'Live' : 'Offline mode'}
              </Text>
            </View>
          </View>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton icon="dots-vertical" onPress={() => setMenuVisible(true)} />
            }
          >
            <Menu.Item
              leadingIcon="flag"
              onPress={() => { setMenuVisible(false); setReportModalVisible(true); }}
              title="Melden"
            />
            <Divider />
            <Menu.Item
              leadingIcon="block-helper"
              onPress={() => { setMenuVisible(false); handleBlockUser(); }}
              title="Blokkeren"
              titleStyle={{ color: theme.colors.error }}
            />
          </Menu>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatContainer}
          keyboardVerticalOffset={90}
        >
          {loadingMessages && messages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <MaterialCommunityIcons
                    name="chat-outline"
                    size={60}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text variant="titleMedium" style={{ marginTop: 16 }}>
                    Start het gesprek!
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}
                  >
                    Stuur een bericht om een training te plannen
                  </Text>
                </View>
              }
            />
          )}

          {isTyping && (
            <View style={styles.typingIndicator}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                {selectedMatch?.otherUser.name} is aan het typen...
              </Text>
            </View>
          )}
          <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
            <TextInput
              value={messageText}
              onChangeText={handleTextChange}
              placeholder="Typ een bericht..."
              mode="outlined"
              style={styles.messageInput}
              right={
                <TextInput.Icon
                  icon="send"
                  onPress={handleSendMessage}
                  disabled={!messageText.trim() || sending}
                />
              }
              onSubmitEditing={handleSendMessage}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Matches list view
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text variant="bodyLarge" style={{ marginTop: 16 }}>
            Chats laden...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Chats
        </Text>
      </View>

      <FlatList
        data={matches}
        renderItem={renderMatchItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.matchesList}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="chat-outline"
              size={80}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="titleLarge" style={{ marginTop: 16 }}>
              Nog geen matches
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}
            >
              Like mensen in de Feed om te matchen en te chatten!
            </Text>
          </View>
        }
      />

      {/* Report Modal */}
      <Portal>
        <Modal
          visible={reportModalVisible}
          onDismiss={() => setReportModalVisible(false)}
          contentContainerStyle={[styles.reportModal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginBottom: 16 }}>
            Gebruiker melden
          </Text>
          
          <Text variant="titleSmall" style={{ marginBottom: 8 }}>
            Selecteer een reden:
          </Text>
          
          <RadioButton.Group onValueChange={setReportReason} value={reportReason}>
            {REPORT_REASONS.map((reason) => (
              <RadioButton.Item
                key={reason.value}
                label={reason.label}
                value={reason.value}
                style={{ paddingVertical: 4 }}
              />
            ))}
          </RadioButton.Group>

          <TextInput
            label="Extra details (optioneel)"
            value={reportDetails}
            onChangeText={setReportDetails}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="Beschrijf wat er is gebeurd..."
            style={{ marginTop: 12, marginBottom: 16 }}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              mode="outlined"
              onPress={() => setReportModalVisible(false)}
              style={{ flex: 1 }}
            >
              Annuleren
            </Button>
            <Button
              mode="contained"
              onPress={handleReportUser}
              loading={reportLoading}
              disabled={reportLoading}
              style={{ flex: 1 }}
            >
              Melden
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchesList: {
    flexGrow: 1,
  },
  matchCard: {
    borderRadius: 0,
    elevation: 0,
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  chatHeaderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  inputContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  messageInput: {
    backgroundColor: 'transparent',
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  reportModal: {
    margin: 24,
    padding: 24,
    borderRadius: 16,
  },
});



