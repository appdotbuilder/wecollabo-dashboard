import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, ArrowLeft, MessageCircle, Clock } from 'lucide-react';
import { trpc } from '@/utils/trpc';

import type { DirectMessage, InfluencerProfile } from '../../../server/src/schema';
import type { UserProfileResponse } from '../../../server/src/handlers/get_user_profile';

interface MessagingSystemProps {
  currentUser: UserProfileResponse | null;
  selectedInfluencer?: InfluencerProfile | null;
  onBackToDiscover?: () => void;
}

interface ConversationPreview {
  otherUserId: number;
  otherUserName: string;
  otherUserAvatar?: string | null;
  otherUserType: 'brand' | 'influencer';
  lastMessage: DirectMessage;
  unreadCount: number;
}

export function MessagingSystem({ currentUser, selectedInfluencer, onBackToDiscover }: MessagingSystemProps) {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  const loadConversations = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      // Get all messages for current user to build conversation list
      const allMessages = await trpc.getMessages.query({ user_id: currentUser.user.id });
      
      // Group messages by conversation partner
      const conversationMap = new Map<number, ConversationPreview>();
      
      allMessages.forEach((message: DirectMessage) => {
        const otherUserId = message.sender_id === currentUser.user.id 
          ? message.recipient_id 
          : message.sender_id;
        
        const existing = conversationMap.get(otherUserId);
        if (!existing || message.created_at > existing.lastMessage.created_at) {
          // This is a stub - in real app, you'd fetch user profiles for names/avatars
          conversationMap.set(otherUserId, {
            otherUserId,
            otherUserName: `User ${otherUserId}`, // Stub name
            otherUserAvatar: null,
            otherUserType: otherUserId % 2 === 0 ? 'influencer' : 'brand', // Stub type
            lastMessage: message,
            unreadCount: allMessages.filter((m: DirectMessage) => 
              m.sender_id === otherUserId && 
              m.recipient_id === currentUser.user.id && 
              !m.is_read
            ).length
          });
        }
      });
      
      setConversations(Array.from(conversationMap.values()).sort((a, b) => 
        new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
      ));
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (otherUserId: number) => {
    if (!currentUser) return;
    
    try {
      const conversationMessages = await trpc.getMessages.query({
        user_id: currentUser.user.id,
        other_user_id: otherUserId
      });
      setMessages(conversationMessages);
      
      // Mark messages as read
      const unreadMessages = conversationMessages.filter((m: DirectMessage) => 
        m.recipient_id === currentUser.user.id && !m.is_read
      );
      
      for (const message of unreadMessages) {
        try {
          await trpc.markMessageAsRead.mutate({
            message_id: message.id,
            user_id: currentUser.user.id
          });
        } catch (error) {
          console.error('Failed to mark message as read:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [currentUser]);

  // Initialize with selected influencer if provided
  useEffect(() => {
    if (selectedInfluencer && currentUser) {
      setActiveConversation(selectedInfluencer.user_id);
      loadMessages(selectedInfluencer.user_id);
    }
  }, [selectedInfluencer, currentUser, loadMessages]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleConversationSelect = (otherUserId: number) => {
    setActiveConversation(otherUserId);
    loadMessages(otherUserId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || !currentUser || isSending) return;

    setIsSending(true);
    try {
      const sentMessage = await trpc.sendMessage.mutate({
        sender_id: currentUser.user.id,
        recipient_id: activeConversation,
        content: newMessage.trim()
      });
      
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
      
      // Refresh conversations to update last message
      loadConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word: string) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const activeConversationData = conversations.find(c => c.otherUserId === activeConversation);

  if (!currentUser) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">Please log in to access messages</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span>Conversations</span>
            </span>
            {conversations.length > 0 && (
              <Badge variant="secondary">{conversations.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center">
                <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No conversations yet</p>
                {currentUser.user.user_type === 'brand' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Start messaging influencers from the Discover tab
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conversation: ConversationPreview) => (
                  <button
                    key={conversation.otherUserId}
                    onClick={() => handleConversationSelect(conversation.otherUserId)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      activeConversation === conversation.otherUserId ? 'bg-purple-50 border-r-2 border-purple-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={conversation.otherUserAvatar || ''} />
                        <AvatarFallback className={`text-white font-medium ${
                          conversation.otherUserType === 'brand' 
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600' 
                            : 'bg-gradient-to-r from-purple-600 to-pink-600'
                        }`}>
                          {getInitials(conversation.otherUserName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conversation.otherUserName}
                          </p>
                          <div className="flex items-center space-x-1">
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-600 truncate mt-1">
                          {conversation.lastMessage.sender_id === currentUser.user.id ? 'You: ' : ''}
                          {conversation.lastMessage.content}
                        </p>
                        
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              conversation.otherUserType === 'brand' 
                                ? 'text-blue-600 border-blue-200' 
                                : 'text-purple-600 border-purple-200'
                            }`}
                          >
                            {conversation.otherUserType}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatMessageTime(conversation.lastMessage.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-2">
        {activeConversation && activeConversationData ? (
          <>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                {onBackToDiscover && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBackToDiscover}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                
                <Avatar className="h-8 w-8">
                  <AvatarImage src={activeConversationData.otherUserAvatar || ''} />
                  <AvatarFallback className={`text-white text-sm font-medium ${
                    activeConversationData.otherUserType === 'brand' 
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600' 
                      : 'bg-gradient-to-r from-purple-600 to-pink-600'
                  }`}>
                    {getInitials(activeConversationData.otherUserName)}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h3 className="font-medium text-gray-900">
                    {activeConversationData.otherUserName}
                  </h3>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      activeConversationData.otherUserType === 'brand' 
                        ? 'text-blue-600 border-blue-200' 
                        : 'text-purple-600 border-purple-200'
                    }`}
                  >
                    {activeConversationData.otherUserType}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <Separator />
            
            <CardContent className="p-0 flex flex-col h-[500px]">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message: DirectMessage) => {
                    const isFromCurrentUser = message.sender_id === currentUser.user.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isFromCurrentUser
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className={`flex items-center space-x-1 mt-1 text-xs ${
                            isFromCurrentUser ? 'text-purple-100' : 'text-gray-500'
                          }`}>
                            <Clock className="h-3 w-3" />
                            <span>{formatMessageTime(message.created_at)}</span>
                            {!message.is_read && isFromCurrentUser && (
                              <span className="ml-2">Delivered</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isSending}
                    className="flex-1"
                  />
                  <Button 
                    type="submit" 
                    disabled={!newMessage.trim() || isSending}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Select a conversation to start messaging</p>
              {currentUser.user.user_type === 'brand' && conversations.length === 0 && (
                <p className="text-sm text-gray-500">
                  Find influencers in the Discover tab to start conversations
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}