import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  CheckCheck,
  Megaphone,
  MessageSquare,
  Plus,
  Save,
  Search,
  Send,
  Settings2,
  Shield,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

import { chatApi, userNotificationsApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import { useAuth } from '../../../auth/auth.hooks';
import {
  markThreadNotificationsReadInCollection,
  NOTIFICATION_UNREAD_COUNT_QUERY_KEY,
  USER_NOTIFICATIONS_LIST_ROOT_KEY,
} from '../../../components/notifications/notificationCenter.shared';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import PageHeader from '../../../components/ui/PageHeader';
import Switch from '../../../components/ui/Switch';
import TextArea from '../../../components/ui/TextArea';
import useChatSocket from '../../../hooks/chat/useChatSocket';
import { getEducationStageOptions } from '../../../constants/education';
import { useI18n } from '../../../i18n/i18n';
import {
  appendUniqueMessage,
  Avatar,
  EMPTY_BROADCAST_FORM,
  EMPTY_GROUP_FORM,
  formatThreadTimestamp,
  MultiSelectField,
  SelectedUsersChips,
  UserSelectionList,
} from './chatPage.shared';

const BROADCAST_TEMPLATE_PLACEHOLDERS = [
  { token: '{user.firstName}', labelKey: 'firstName', fallback: 'First name' },
  { token: '{user.name}', labelKey: 'name', fallback: 'Full name' },
  { token: '{user.familyName}', labelKey: 'familyName', fallback: 'Family name' },
  { token: '{user.houseName}', labelKey: 'houseName', fallback: 'House name' },
  { token: '{user.diseases}', labelKey: 'diseases', fallback: 'Diseases' },
];
const CHAT_LIST_QUERY_KEY = ['chats', 'list'];
const getChatThreadQueryKey = (chatId) => ['chats', 'thread', chatId];
const MESSAGE_REFRESH_SUPPRESSION_MS = 1500;
const TYPING_IDLE_MS = 3000;
const TYPING_INDICATOR_TTL_MS = 3000;

const getThreadActivityTimestamp = (thread) => {
  const candidate = thread?.lastMessageAt || thread?.updatedAt || thread?.createdAt;
  if (!candidate) return 0;
  const timestamp = new Date(candidate).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const sortThreadsByActivity = (threads = []) =>
  [...threads].sort((left, right) => getThreadActivityTimestamp(right) - getThreadActivityTimestamp(left));

export default function ChatsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language } = useI18n();
  const { user, isAuthenticated, hasPermission } = useAuth();
  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const tfp = (key, fallback, params) => {
    const value = t(key, params);
    return value === key ? fallback : value;
  };

  const canStartChats = hasPermission('CHATS_START');
  const canManageGroups = hasPermission('CHATS_GROUPS_MANAGE');
  const canBroadcast = hasPermission('CHATS_BROADCAST');
  const currentUserId = user?._id || user?.id || null;

  const [selectedChatId, setSelectedChatId] = useState(null);
  const [threadFilter, setThreadFilter] = useState('');
  const [composerText, setComposerText] = useState('');
  const [typingUsersByThread, setTypingUsersByThread] = useState({});

  const [isDirectModalOpen, setDirectModalOpen] = useState(false);
  const [directSearch, setDirectSearch] = useState('');
  const [isGroupModalOpen, setGroupModalOpen] = useState(false);
  const [groupForm, setGroupForm] = useState(EMPTY_GROUP_FORM);
  const [groupSearch, setGroupSearch] = useState('');
  const [isGroupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [groupSettingsForm, setGroupSettingsForm] = useState(EMPTY_GROUP_FORM);
  const [groupSettingsSearch, setGroupSettingsSearch] = useState('');
  const [isBroadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState(EMPTY_BROADCAST_FORM);
  const [broadcastUserSearch, setBroadcastUserSearch] = useState('');
  const broadcastAudience = broadcastForm.audience;
  const lastAutoReadRef = useRef('');
  const lastReadNotificationThreadRef = useRef('');
  const messagesScrollRef = useRef(null);
  const broadcastTemplateRef = useRef(null);
  const composerTypingTimeoutRef = useRef(null);
  const remoteTypingTimeoutsRef = useRef(new Map());
  const recentMessageSyncRef = useRef(new Map());
  const typingStateRef = useRef({
    threadId: null,
    isTyping: false,
  });
  const shouldStickToBottomRef = useRef(true);
  const forceScrollToBottomRef = useRef(false);
  const previousThreadIdRef = useRef(null);
  const previousMessageCountRef = useRef(0);
  const appliedRequestedChatIdRef = useRef('');
  const requestedChatId = searchParams.get('threadId');

  const chatsQuery = useQuery({
    queryKey: CHAT_LIST_QUERY_KEY,
    queryFn: async () => {
      const { data } = await chatApi.list();
      return data.data || [];
    },
  });

  const activeChatQuery = useQuery({
    queryKey: getChatThreadQueryKey(selectedChatId),
    enabled: Boolean(selectedChatId),
    queryFn: async () => {
      const { data } = await chatApi.getById(selectedChatId);
      return data.data;
    },
  });

  const directSearchQuery = useQuery({
    queryKey: ['chats', 'search', 'direct', directSearch],
    enabled: isDirectModalOpen,
    queryFn: async () => {
      const { data } = await chatApi.searchUsers({ q: directSearch, limit: 20 });
      return data.data || [];
    },
  });

  const groupSearchQuery = useQuery({
    queryKey: ['chats', 'search', 'group-members', groupSearch],
    enabled: isGroupModalOpen,
    queryFn: async () => {
      const { data } = await chatApi.searchUsers({ q: groupSearch, limit: 20 });
      return data.data || [];
    },
  });

  const groupSettingsSearchQuery = useQuery({
    queryKey: ['chats', 'search', 'group-settings-members', groupSettingsSearch],
    enabled: isGroupSettingsOpen,
    queryFn: async () => {
      const { data } = await chatApi.searchUsers({ q: groupSettingsSearch, limit: 20 });
      return data.data || [];
    },
  });

  const audienceOptionsQuery = useQuery({
    queryKey: ['chats', 'audience-options'],
    enabled: isBroadcastModalOpen,
    queryFn: async () => {
      const { data } = await chatApi.getAudienceOptions();
      return data.data;
    },
  });

  const broadcastUserSearchQuery = useQuery({
    queryKey: [
      'chats',
      'search',
      'broadcast-users',
      broadcastUserSearch,
      broadcastAudience.ageGroups,
      broadcastAudience.educationStages,
      broadcastAudience.tags,
      broadcastAudience.diseases,
      broadcastAudience.genders,
      broadcastAudience.familyNames,
      broadcastAudience.houseNames,
      broadcastAudience.includeSelf,
      broadcastAudience.includeLocked,
      broadcastAudience.includeUsersWithoutLogin,
    ],
    enabled: isBroadcastModalOpen,
    queryFn: async () => {
      const { data } = await chatApi.searchUsers({
        q: broadcastUserSearch,
        limit: 20,
        forBroadcast: true,
        ageGroups: broadcastAudience.ageGroups,
        educationStages: broadcastAudience.educationStages,
        tags: broadcastAudience.tags,
        diseases: broadcastAudience.diseases,
        genders: broadcastAudience.genders,
        familyNames: broadcastAudience.familyNames,
        houseNames: broadcastAudience.houseNames,
        includeSelf: broadcastAudience.includeSelf,
        includeLocked: broadcastAudience.includeLocked,
        includeUsersWithoutLogin: broadcastAudience.includeUsersWithoutLogin,
      });
      return data.data || [];
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ chatId, text }) => chatApi.sendMessage(chatId, { text }),
    onSuccess: (response, variables) => {
      const message = response?.data?.data;
      setComposerText('');

      if (message?.threadId) {
        applyMessageToCaches(message.threadId, message);
      } else if (variables?.chatId) {
        noteRecentMessageSync(variables.chatId);
      }
    },
    onError: (error) => {
      forceScrollToBottomRef.current = false;
      toast.error(normalizeApiError(error).message);
    },
  });

  const createDirectMutation = useMutation({
    mutationFn: (targetUserId) => chatApi.createDirect({ targetUserId }),
    onSuccess: async (response) => {
      const thread = response.data.data;
      setSelectedChatId(thread.id);
      setDirectModalOpen(false);
      setDirectSearch('');
      await queryClient.invalidateQueries({ queryKey: CHAT_LIST_QUERY_KEY, exact: true });
      queryClient.invalidateQueries({ queryKey: getChatThreadQueryKey(thread.id), exact: true });
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });

  const createGroupMutation = useMutation({
    mutationFn: (payload) => chatApi.createGroup(payload),
    onSuccess: async (response) => {
      const thread = response.data.data;
      setSelectedChatId(thread.id);
      setGroupModalOpen(false);
      setGroupForm(EMPTY_GROUP_FORM);
      setGroupSearch('');
      toast.success(t('chatPage.messages.groupCreated'));
      await queryClient.invalidateQueries({ queryKey: CHAT_LIST_QUERY_KEY, exact: true });
      queryClient.invalidateQueries({ queryKey: getChatThreadQueryKey(thread.id), exact: true });
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ chatId, payload }) => chatApi.updateGroup(chatId, payload),
    onSuccess: async (response) => {
      const thread = response.data.data;
      setGroupSettingsOpen(false);
      toast.success(t('chatPage.messages.groupUpdated'));
      await queryClient.invalidateQueries({ queryKey: CHAT_LIST_QUERY_KEY, exact: true });
      queryClient.invalidateQueries({ queryKey: getChatThreadQueryKey(thread.id), exact: true });
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });

  const broadcastMutation = useMutation({
    mutationFn: (payload) => chatApi.broadcast(payload),
    onSuccess: async (response) => {
      const result = response.data.data;
      setBroadcastModalOpen(false);
      setBroadcastForm(EMPTY_BROADCAST_FORM);
      setBroadcastUserSearch('');
      toast.success(t('chatPage.messages.broadcastSent', { count: result.recipientCount }));
      await queryClient.invalidateQueries({ queryKey: CHAT_LIST_QUERY_KEY, exact: true });
      if (selectedChatId) {
        queryClient.invalidateQueries({ queryKey: getChatThreadQueryKey(selectedChatId), exact: true });
      }
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });

  const markReadMutation = useMutation({
    mutationFn: ({ chatId }) => chatApi.markRead(chatId),
  });

  const { mutate: markThreadNotificationsRead } = useMutation({
    mutationFn: (threadId) => userNotificationsApi.markThreadRead(threadId),
    onSuccess: (response, threadId) => {
      const nextUnreadCount = Number(response?.data?.data?.unreadCount ?? 0);
      queryClient.setQueryData(NOTIFICATION_UNREAD_COUNT_QUERY_KEY, nextUnreadCount);
      queryClient.setQueriesData(
        { queryKey: USER_NOTIFICATIONS_LIST_ROOT_KEY },
        (current) => markThreadNotificationsReadInCollection(current, threadId)
      );
    },
  });

  const chats = useMemo(() => chatsQuery.data || [], [chatsQuery.data]);
  const activeChatPayload = activeChatQuery.data;
  const activeThread = activeChatPayload?.thread || null;
  const activeMessages = useMemo(
    () => activeChatPayload?.messages || [],
    [activeChatPayload?.messages]
  );
  const activeTypingUsers = useMemo(
    () => Object.values(typingUsersByThread[selectedChatId] || {}),
    [selectedChatId, typingUsersByThread]
  );
  const activeTypingLabel = useMemo(() => {
    if (!activeTypingUsers.length) return '';
    if (activeTypingUsers.length === 1) {
      return t('chatPage.shared.typingOne', {
        name: activeTypingUsers[0].fullName || t('chatPage.shared.unknownUser'),
      });
    }
    return t('chatPage.shared.typingMany', {
      count: activeTypingUsers.length,
    });
  }, [activeTypingUsers, t]);

  const noteRecentMessageSync = (threadId) => {
    if (!threadId) return;
    recentMessageSyncRef.current.set(threadId, Date.now());
  };

  const shouldSuppressThreadRefresh = (threadId) => {
    if (!threadId) return false;

    const lastSyncAt = recentMessageSyncRef.current.get(threadId);
    if (!lastSyncAt) {
      return false;
    }

    if (Date.now() - lastSyncAt > MESSAGE_REFRESH_SUPPRESSION_MS) {
      recentMessageSyncRef.current.delete(threadId);
      return false;
    }

    recentMessageSyncRef.current.delete(threadId);
    return true;
  };

  const buildUpdatedThreadSummary = (thread, message, { markAsRead = false, incrementUnread = false } = {}) => {
    if (!thread) return thread;

    const previousUnreadCount = Number(thread.unreadCount || 0);
    const unreadCount = markAsRead
      ? 0
      : incrementUnread
        ? previousUnreadCount + 1
        : previousUnreadCount;

    return {
      ...thread,
      lastMessageId: message.id || thread.lastMessageId,
      lastMessagePreview: message.text || thread.lastMessagePreview,
      lastMessageAt: message.createdAt || thread.lastMessageAt,
      lastMessageSender: message.sender || thread.lastMessageSender,
      hasUnread: unreadCount > 0,
      unreadCount,
      viewerLastReadAt: markAsRead ? (message.createdAt || thread.viewerLastReadAt) : thread.viewerLastReadAt,
    };
  };

  const applyMessageToCaches = (threadId, message) => {
    if (!threadId || !message) return false;

    const isOwnMessage = Boolean(currentUserId && message.sender?.id === currentUserId);
    let listUpdated = false;

    queryClient.setQueryData(getChatThreadQueryKey(threadId), (current) => {
      if (!current) return current;

      return {
        ...current,
        thread: buildUpdatedThreadSummary(current.thread, message, {
          markAsRead: isOwnMessage,
          incrementUnread: !isOwnMessage,
        }),
        messages: appendUniqueMessage(current.messages || [], message),
      };
    });

    queryClient.setQueryData(CHAT_LIST_QUERY_KEY, (current) => {
      if (!Array.isArray(current)) return current;

      const nextThreads = current.map((thread) => {
        if (thread.id !== threadId) {
          return thread;
        }

        listUpdated = true;
        return buildUpdatedThreadSummary(thread, message, {
          markAsRead: isOwnMessage,
          incrementUnread: !isOwnMessage,
        });
      });

      return listUpdated ? sortThreadsByActivity(nextThreads) : current;
    });

    if (listUpdated) {
      noteRecentMessageSync(threadId);
    }

    return listUpdated;
  };

  const removeTypingUser = (threadId, userId) => {
    setTypingUsersByThread((current) => {
      const threadTyping = current[threadId];
      if (!threadTyping?.[userId]) return current;

      const nextThreadTyping = { ...threadTyping };
      delete nextThreadTyping[userId];

      if (!Object.keys(nextThreadTyping).length) {
        const nextState = { ...current };
        delete nextState[threadId];
        return nextState;
      }

      return {
        ...current,
        [threadId]: nextThreadTyping,
      };
    });
  };

  const filteredChats = useMemo(() => {
    const normalized = String(threadFilter || '').trim().toLowerCase();
    if (!normalized) return chats;

    return chats.filter((thread) => {
      const haystack = [
        thread.title,
        thread.description,
        thread.lastMessagePreview,
        thread.directUser?.fullName,
        ...thread.participants.map((participant) => participant.fullName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [chats, threadFilter]);

  useEffect(() => {
    if (!selectedChatId && chats.length > 0 && !requestedChatId) {
      setSelectedChatId(chats[0].id);
    }
  }, [chats, requestedChatId, selectedChatId]);

  useEffect(() => {
    if (!requestedChatId || !chats.length) {
      return;
    }

    if (requestedChatId === appliedRequestedChatIdRef.current) {
      return;
    }

    if (chats.some((thread) => thread.id === requestedChatId)) {
      appliedRequestedChatIdRef.current = requestedChatId;
      setSelectedChatId(requestedChatId);
      return;
    }

    if (!selectedChatId && chats.length > 0) {
      appliedRequestedChatIdRef.current = requestedChatId;
      setSelectedChatId(chats[0].id);
    }
  }, [chats, requestedChatId, selectedChatId]);

  useEffect(() => {
    if (selectedChatId && chats.length > 0 && !chats.some((thread) => thread.id === selectedChatId)) {
      setSelectedChatId(chats[0]?.id || null);
    }
  }, [chats, selectedChatId]);

  useEffect(() => {
    const currentThreadId = searchParams.get('threadId');

    if (selectedChatId) {
      if (currentThreadId === selectedChatId) {
        return;
      }

      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('threadId', selectedChatId);
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [searchParams, selectedChatId, setSearchParams]);

  useEffect(() => {
    if (!isGroupSettingsOpen || !activeThread) return;
    setGroupSettingsForm({
      title: activeThread.title || '',
      description: activeThread.description || '',
      allowMemberMessages: activeThread.settings?.allowMemberMessages !== false,
      memberIds: (activeThread.participants || []).map((participant) => participant.id),
    });
  }, [isGroupSettingsOpen, activeThread]);

  useEffect(() => {
    const dedupeKey =
      activeThread?.id && activeThread?.lastMessageId
        ? `${activeThread.id}:${activeThread.lastMessageId}`
        : '';

    if (!dedupeKey || !activeThread?.hasUnread || lastAutoReadRef.current === dedupeKey) {
      return;
    }

    lastAutoReadRef.current = dedupeKey;
    markReadMutation.mutate({ chatId: activeThread.id });
  }, [activeThread?.id, activeThread?.hasUnread, activeThread?.lastMessageId, markReadMutation]);

  useEffect(() => {
    if (!activeThread?.id) {
      lastReadNotificationThreadRef.current = '';
      return;
    }

    if (lastReadNotificationThreadRef.current === activeThread.id) {
      return;
    }

    lastReadNotificationThreadRef.current = activeThread.id;
    markThreadNotificationsRead(activeThread.id);
  }, [activeThread?.id, markThreadNotificationsRead]);

  useEffect(() => {
    const container = messagesScrollRef.current;
    if (!container) return undefined;

    const handleScroll = () => {
      shouldStickToBottomRef.current = isNearMessagesBottom();
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [activeThread?.id]);

  useEffect(() => {
    if (!activeThread?.id) {
      previousThreadIdRef.current = null;
      previousMessageCountRef.current = 0;
      forceScrollToBottomRef.current = false;
      return;
    }

    const threadChanged = previousThreadIdRef.current !== activeThread.id;
    const previousCount = previousMessageCountRef.current;
    const currentCount = activeMessages.length;
    const lastMessage = currentCount > 0 ? activeMessages[currentCount - 1] : null;
    const isOwnLatestMessage = Boolean(
      currentUserId && lastMessage?.sender?.id === currentUserId
    );

    previousThreadIdRef.current = activeThread.id;
    previousMessageCountRef.current = currentCount;

    if (threadChanged) {
      shouldStickToBottomRef.current = true;
      requestAnimationFrame(() => scrollMessagesToBottom('auto'));
      return;
    }

    if (currentCount <= previousCount) {
      return;
    }

    if (
      forceScrollToBottomRef.current ||
      shouldStickToBottomRef.current ||
      isOwnLatestMessage
    ) {
      requestAnimationFrame(() => scrollMessagesToBottom('smooth'));
    }

    forceScrollToBottomRef.current = false;
  }, [activeMessages, activeThread?.id, currentUserId]);

  const { emit: emitChatEvent } = useChatSocket({
    enabled: isAuthenticated,
    onMessage: ({ threadId, message }) => {
      if (!threadId || !message) return;
      if (message.sender?.id) {
        removeTypingUser(threadId, message.sender.id);
      }
      applyMessageToCaches(threadId, message);
    },
    onThreadRefresh: ({ threadId }) => {
      if (shouldSuppressThreadRefresh(threadId)) {
        return;
      }

      queryClient.invalidateQueries({ queryKey: CHAT_LIST_QUERY_KEY, exact: true });
      if (threadId) {
        queryClient.invalidateQueries({ queryKey: getChatThreadQueryKey(threadId), exact: true });
      }
    },
    onThreadRemoved: ({ threadId }) => {
      queryClient.invalidateQueries({ queryKey: CHAT_LIST_QUERY_KEY, exact: true });
      if (threadId) {
        setTypingUsersByThread((current) => {
          if (!current[threadId]) return current;
          const nextState = { ...current };
          delete nextState[threadId];
          return nextState;
        });
        queryClient.removeQueries({ queryKey: getChatThreadQueryKey(threadId), exact: true });
        if (selectedChatId === threadId) {
          setSelectedChatId(null);
        }
      }
    },
    onTyping: ({ threadId, user, isTyping }) => {
      if (!threadId || !user?.id || user.id === currentUserId) return;

      const timeoutKey = `${threadId}:${user.id}`;
      const existingTimeout = remoteTypingTimeoutsRef.current.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        remoteTypingTimeoutsRef.current.delete(timeoutKey);
      }

      if (!isTyping) {
        removeTypingUser(threadId, user.id);
        return;
      }

      setTypingUsersByThread((current) => ({
        ...current,
        [threadId]: {
          ...(current[threadId] || {}),
          [user.id]: user,
        },
      }));

      const timeoutId = setTimeout(() => {
        remoteTypingTimeoutsRef.current.delete(timeoutKey);
        removeTypingUser(threadId, user.id);
      }, TYPING_INDICATOR_TTL_MS);

      remoteTypingTimeoutsRef.current.set(timeoutKey, timeoutId);
    },
  });

  const emitTypingState = (threadId, isTyping, { force = false } = {}) => {
    if (!threadId) return;

    if (
      !force &&
      typingStateRef.current.threadId === threadId &&
      typingStateRef.current.isTyping === isTyping
    ) {
      return;
    }

    typingStateRef.current = {
      threadId,
      isTyping,
    };

    emitChatEvent('chat:typing', {
      threadId,
      isTyping,
    });
  };

  const stopLocalTyping = (threadId = typingStateRef.current.threadId) => {
    if (composerTypingTimeoutRef.current) {
      clearTimeout(composerTypingTimeoutRef.current);
      composerTypingTimeoutRef.current = null;
    }

    if (threadId && typingStateRef.current.isTyping) {
      emitTypingState(threadId, false);
    } else if (!threadId) {
      typingStateRef.current = {
        threadId: null,
        isTyping: false,
      };
    }
  };

  const handleComposerChange = (event) => {
    const nextValue = event.target.value;
    setComposerText(nextValue);

    if (!selectedChatId || !activeThread?.canCurrentUserSendMessages) {
      return;
    }

    if (!nextValue.trim()) {
      stopLocalTyping(selectedChatId);
      return;
    }

    emitTypingState(selectedChatId, true, { force: true });

    if (composerTypingTimeoutRef.current) {
      clearTimeout(composerTypingTimeoutRef.current);
    }

    composerTypingTimeoutRef.current = setTimeout(() => {
      stopLocalTyping(selectedChatId);
    }, TYPING_IDLE_MS);
  };

  useEffect(() => {
    const activeRemoteTypingTimeouts = remoteTypingTimeoutsRef.current;

    return () => {
      if (composerTypingTimeoutRef.current) {
        clearTimeout(composerTypingTimeoutRef.current);
        composerTypingTimeoutRef.current = null;
      }

      if (typingStateRef.current.threadId && typingStateRef.current.isTyping) {
        emitChatEvent('chat:typing', {
          threadId: typingStateRef.current.threadId,
          isTyping: false,
        });
      }

      typingStateRef.current = {
        threadId: null,
        isTyping: false,
      };
      activeRemoteTypingTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      activeRemoteTypingTimeouts.clear();
    };
  }, [emitChatEvent]);

  useEffect(() => {
    const typingThreadId = typingStateRef.current.threadId;
    if (typingThreadId && typingThreadId !== selectedChatId) {
      if (composerTypingTimeoutRef.current) {
        clearTimeout(composerTypingTimeoutRef.current);
        composerTypingTimeoutRef.current = null;
      }

      if (typingStateRef.current.isTyping) {
        emitChatEvent('chat:typing', {
          threadId: typingThreadId,
          isTyping: false,
        });
      }

      typingStateRef.current = {
        threadId: null,
        isTyping: false,
      };
    }
  }, [emitChatEvent, selectedChatId]);

  useEffect(() => {
    if (!activeThread?.canCurrentUserSendMessages) {
      if (composerTypingTimeoutRef.current) {
        clearTimeout(composerTypingTimeoutRef.current);
        composerTypingTimeoutRef.current = null;
      }

      if (selectedChatId && typingStateRef.current.isTyping) {
        emitChatEvent('chat:typing', {
          threadId: selectedChatId,
          isTyping: false,
        });
      }

      typingStateRef.current = {
        threadId: null,
        isTyping: false,
      };
    }
  }, [activeThread?.canCurrentUserSendMessages, emitChatEvent, selectedChatId]);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    emitChatEvent('chat:thread:view', {
      threadId: selectedChatId || null,
    });

    return () => {
      emitChatEvent('chat:thread:view', {
        threadId: null,
      });
    };
  }, [emitChatEvent, isAuthenticated, selectedChatId]);

  const activeParticipantIds = activeThread?.participants?.map((participant) => participant.id) || [];
  const activeThreadOtherUser = activeThread?.directUser || null;
  const broadcastAudienceOptions = audienceOptionsQuery.data || {
    ageGroups: [],
    educationStages: [],
    genders: [],
    tags: [],
    diseases: [],
    familyNames: [],
    houseNames: [],
  };
  const educationStageOptions = useMemo(
    () => getEducationStageOptions(language).filter((option) => !option.disabled),
    [language]
  );
  const activeBroadcastFilterCount =
    broadcastAudience.userIds.length +
    broadcastAudience.ageGroups.length +
    broadcastAudience.educationStages.length +
    broadcastAudience.tags.length +
    broadcastAudience.diseases.length +
    broadcastAudience.genders.length +
    broadcastAudience.familyNames.length +
    broadcastAudience.houseNames.length;
  const hasBroadcastAudienceFilters = activeBroadcastFilterCount > 0;

  const groupSearchResults = (groupSearchQuery.data || []).filter(
    (userItem) => !groupForm.memberIds.includes(userItem.id)
  );
  const groupSettingsSearchResults = (groupSettingsSearchQuery.data || []).filter(
    (userItem) => !groupSettingsForm.memberIds.includes(userItem.id)
  );
  const broadcastSearchResults = (broadcastUserSearchQuery.data || []).filter(
    (userItem) => !(broadcastAudience.userIds || []).includes(userItem.id)
  );

  const groupSelectedUsers = useMemo(() => {
    const resultMap = new Map((groupSearchQuery.data || []).map((userItem) => [userItem.id, userItem]));
    return groupForm.memberIds.map((userId) => resultMap.get(userId) || { id: userId, fullName: userId });
  }, [groupForm.memberIds, groupSearchQuery.data]);

  const groupSettingsUsers = useMemo(() => {
    const baseParticipants = activeThread?.participants || [];
    const fromSearch = new Map((groupSettingsSearchQuery.data || []).map((userItem) => [userItem.id, userItem]));
    return groupSettingsForm.memberIds.map((userId) => {
      const existing = baseParticipants.find((participant) => participant.id === userId);
      return fromSearch.get(userId) || existing || { id: userId, fullName: userId };
    });
  }, [groupSettingsForm.memberIds, groupSettingsSearchQuery.data, activeThread]);

  const broadcastSelectedUsers = useMemo(() => {
    const fromSearch = new Map((broadcastUserSearchQuery.data || []).map((userItem) => [userItem.id, userItem]));
    return (broadcastAudience.userIds || []).map(
      (userId) => fromSearch.get(userId) || { id: userId, fullName: userId }
    );
  }, [broadcastAudience.userIds, broadcastUserSearchQuery.data]);

  const handleSubmitMessage = () => {
    const trimmed = composerText.trim();
    if (!trimmed || !selectedChatId) return;
    stopLocalTyping(selectedChatId);
    forceScrollToBottomRef.current = true;
    sendMessageMutation.mutate({ chatId: selectedChatId, text: trimmed });
  };

  const isNearMessagesBottom = () => {
    const container = messagesScrollRef.current;
    if (!container) return true;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceFromBottom <= 150;
  };

  const scrollMessagesToBottom = (behavior = 'smooth') => {
    const container = messagesScrollRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  const handleToggleGroupMember = (selectedUser) => {
    setGroupForm((current) => ({
      ...current,
      memberIds: current.memberIds.includes(selectedUser.id)
        ? current.memberIds.filter((userId) => userId !== selectedUser.id)
        : [...current.memberIds, selectedUser.id],
    }));
  };

  const handleToggleGroupSettingsMember = (selectedUser) => {
    setGroupSettingsForm((current) => ({
      ...current,
      memberIds: current.memberIds.includes(selectedUser.id)
        ? current.memberIds.filter((userId) => userId !== selectedUser.id)
        : [...current.memberIds, selectedUser.id],
    }));
  };

  const handleToggleBroadcastUser = (selectedUser) => {
    setBroadcastForm((current) => ({
      ...current,
      audience: {
        ...current.audience,
        userIds: current.audience.userIds.includes(selectedUser.id)
          ? current.audience.userIds.filter((userId) => userId !== selectedUser.id)
          : [...current.audience.userIds, selectedUser.id],
      },
    }));
  };

  const handleInsertBroadcastPlaceholder = (token) => {
    const textarea = broadcastTemplateRef.current;
    const currentValue = String(broadcastForm.template || '');

    if (!textarea) {
      setBroadcastForm((current) => ({
        ...current,
        template: current.template ? `${current.template} ${token}` : token,
      }));
      return;
    }

    const selectionStart = textarea.selectionStart ?? currentValue.length;
    const selectionEnd = textarea.selectionEnd ?? currentValue.length;
    const previousChar = currentValue[selectionStart - 1] || '';
    const nextChar = currentValue[selectionEnd] || '';
    const needsLeadingSpace = Boolean(previousChar) && !/\s/.test(previousChar);
    const needsTrailingSpace = Boolean(nextChar) && !/\s/.test(nextChar);
    const insertion = `${needsLeadingSpace ? ' ' : ''}${token}${needsTrailingSpace ? ' ' : ''}`;
    const nextValue =
      currentValue.slice(0, selectionStart) + insertion + currentValue.slice(selectionEnd);

    setBroadcastForm((current) => ({
      ...current,
      template: nextValue,
    }));

    requestAnimationFrame(() => {
      const cursorPosition = selectionStart + insertion.length;
      textarea.focus();
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  const clearBroadcastAudienceFilters = () => {
    setBroadcastForm((current) => ({
      ...current,
      audience: {
        ...current.audience,
        userIds: [],
        ageGroups: [],
        educationStages: [],
        tags: [],
        diseases: [],
        genders: [],
        familyNames: [],
        houseNames: [],
      },
    }));
  };

  const submitGroupCreation = () => {
    if (!groupForm.title.trim()) return toast.error(t('chatPage.messages.groupTitleRequired'));
    if (!groupForm.memberIds.length) return toast.error(t('chatPage.messages.groupMembersRequired'));

    createGroupMutation.mutate({
      title: groupForm.title.trim(),
      description: groupForm.description.trim(),
      memberIds: groupForm.memberIds,
      allowMemberMessages: groupForm.allowMemberMessages,
    });
  };

  const submitGroupSettings = () => {
    if (!activeThread) return;

    updateGroupMutation.mutate({
      chatId: activeThread.id,
      payload: {
        title: groupSettingsForm.title.trim(),
        description: groupSettingsForm.description.trim(),
        allowMemberMessages: groupSettingsForm.allowMemberMessages,
        memberIdsToAdd: groupSettingsForm.memberIds.filter((userId) => !activeParticipantIds.includes(userId)),
        memberIdsToRemove: activeParticipantIds.filter((userId) => !groupSettingsForm.memberIds.includes(userId)),
      },
    });
  };

  const submitBroadcast = () => {
    if (!broadcastForm.template.trim()) return toast.error(t('chatPage.messages.broadcastRequired'));

    broadcastMutation.mutate({
      template: broadcastForm.template.trim(),
      audience: broadcastAudience,
    });
  };

  const renderThreadList = () => {
    if (chatsQuery.isLoading) {
      return (
        <div className="rounded-2xl border border-dashed border-border bg-surface-alt/40 p-4 text-sm text-muted">
          {t('common.loading')}
        </div>
      );
    }

    if (!filteredChats.length) {
      return (
        <div className="rounded-2xl border border-dashed border-border bg-surface-alt/40 p-4 text-sm text-muted">
          {tf('chatPage.states.emptyThreads', 'No chats found yet. Start a new conversation to begin.')}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredChats.map((thread) => {
          const isActive = thread.id === selectedChatId;
          const unreadCount = Number(thread.unreadCount || 0);
          const unreadCountLabel = unreadCount > 99 ? '99+' : String(unreadCount);

          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedChatId(thread.id)}
              className={`w-full rounded-2xl border p-3 text-start transition-colors ${isActive
                ? 'border-primary/40 bg-primary/10'
                : 'border-border bg-surface-alt/20 hover:bg-surface-alt/40'
                }`}
            >
              <div className="flex items-start gap-3">
                <Avatar
                  name={thread.directUser?.fullName || thread.title}
                  avatarUrl={thread.directUser?.avatar?.url || ''}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-heading">{thread.title}</p>
                      <p className="truncate text-xs text-muted">
                        {thread.type === 'group'
                          ? t('chatPage.shared.membersCount', { count: thread.participantCount })
                          : thread.directUser?.phonePrimary || ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted">{formatThreadTimestamp(thread.lastMessageAt)}</p>
                      {unreadCount > 0 ? (
                        <span className="mt-1 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                          {unreadCountLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 truncate text-sm text-muted">
                    {thread.lastMessagePreview || tf('chatPage.states.noMessagesYet', 'No messages yet')}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderMessages = () => {
    if (activeChatQuery.isLoading) {
      return (
        <div className="rounded-2xl border border-dashed border-border bg-surface-alt/40 p-4 text-sm text-muted">
          {t('common.loading')}
        </div>
      );
    }

    if (!activeMessages.length) {
      return (
        <div className="rounded-2xl border border-dashed border-border bg-surface-alt/40 p-4 text-sm text-muted">
          {tf('chatPage.states.emptyMessages', 'No messages in this chat yet.')}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {activeMessages.map((message) => {
          const isOwn = currentUserId && message.sender?.id === currentUserId;
          const receiptState = message.deliveryStatus?.state || null;
          const receiptLabel = receiptState
            ? tf(
              `chatPage.shared.messageStatus.${receiptState}`,
              receiptState === 'seen' ? 'Seen' : 'Delivered'
            )
            : null;

          return (
            <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-3xl px-4 py-3 shadow-sm ${isOwn ? 'bg-primary text-white' : 'border border-border bg-surface text-base'
                  }`}
              >
                {!isOwn ? (
                  <p className="mb-1 text-xs font-semibold text-primary">
                    {message.sender?.fullName || t('chatPage.shared.unknownUser')}
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p>
                <div
                  className={`mt-2 flex items-center justify-end gap-2 text-[11px] ${isOwn ? 'text-white/80' : 'text-muted'
                    }`}
                >
                  {isOwn && receiptLabel ? (
                    <span className="inline-flex items-center gap-1">
                      {receiptState === 'seen' ? (
                        <CheckCheck className="h-3.5 w-3.5" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      {/* <span>{receiptLabel}</span> */}
                    </span>
                  ) : null}
                  <span>{formatThreadTimestamp(message.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-8 pb-8">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: tf('dashboardLayout.menu.chats', 'Chats') },
        ]}
      />

      <PageHeader
        eyebrow={tf('dashboardLayout.section.communication', 'Communication')}
        title={tf('dashboardLayout.menu.chats', 'Chats')}
        subtitle={tf(
          'chatPage.subtitle',
          'Live direct chats, managed group conversations, and permission-based broadcast messaging.'
        )}
        actions={(
          <div className="flex flex-wrap gap-2">
            {canStartChats ? (
              <Button type="button" variant="outline" size="sm" icon={Plus} onClick={() => setDirectModalOpen(true)}>
                {tf('chatPage.actions.newChat', 'New chat')}
              </Button>
            ) : null}
            {canManageGroups ? (
              <Button type="button" variant="outline" size="sm" icon={Users} onClick={() => setGroupModalOpen(true)}>
                {tf('chatPage.actions.newGroup', 'New group')}
              </Button>
            ) : null}
            {canBroadcast ? (
              <Button type="button" size="sm" icon={Megaphone} onClick={() => setBroadcastModalOpen(true)}>
                {tf('chatPage.actions.broadcast', 'Broadcast')}
              </Button>
            ) : null}
          </div>
        )}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-[72vh] overflow-hidden" padding={false}>
          <div className="border-b border-border p-4">
            <Input
              label={tf('chatPage.filters.search', 'Search chats')}
              value={threadFilter}
              onChange={(event) => setThreadFilter(event.target.value)}
              icon={Search}
              containerClassName="!mb-0"
              placeholder={tf('chatPage.filters.placeholder', 'Search by name, group, or message preview')}
            />
          </div>
          <div className="h-[calc(72vh-86px)] overflow-y-auto p-3">{renderThreadList()}</div>
        </Card>

        <Card className="h-[72vh] overflow-hidden" padding={false}>
          {activeThread ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-border bg-surface px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={activeThreadOtherUser?.fullName || activeThread.title}
                      avatarUrl={activeThreadOtherUser?.avatar?.url || ''}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-heading">{activeThread.title}</p>
                      <p className="truncate text-sm text-muted">
                        {activeThread.type === 'group'
                          ? t('chatPage.shared.membersCount', { count: activeThread.participantCount })
                          : activeThreadOtherUser?.phonePrimary || ''}
                      </p>
                    </div>
                  </div>

                  {canManageGroups && activeThread.type === 'group' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={Settings2}
                      onClick={() => setGroupSettingsOpen(true)}
                    >
                      {tf('chatPage.actions.groupSettings', 'Group settings')}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div ref={messagesScrollRef} className="flex-1 overflow-y-auto bg-page/40 px-5 py-4">
                {renderMessages()}
              </div>

              <div className="border-t border-border bg-surface px-5 py-4">
                {!activeThread.canCurrentUserSendMessages ? (
                  <div className="mb-3 flex items-center gap-2 rounded-2xl border border-border bg-surface-alt/40 px-3 py-2 text-sm text-muted">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>
                      {tf(
                        'chatPage.states.adminOnlyMessaging',
                        'Only group admins can send messages in this chat right now.'
                      )}
                    </span>
                  </div>
                ) : null}

                {activeTypingUsers.length ? (
                  <div className="mb-3 flex items-center gap-2 rounded-2xl border border-border bg-surface-alt/30 px-3 py-2 text-sm text-muted">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-primary/70 animate-pulse" />
                      <span className="h-2 w-2 rounded-full bg-primary/50 animate-pulse [animation-delay:200ms]" />
                      <span className="h-2 w-2 rounded-full bg-primary/40 animate-pulse [animation-delay:400ms]" />
                    </span>
                    <span>{activeTypingLabel}</span>
                  </div>
                ) : null}

                <form
                  className="flex flex-col gap-3 md:flex-row md:items-end"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSubmitMessage();
                  }}
                >
                  <Input
                    label={tf('chatPage.fields.message', 'Message')}
                    value={composerText}
                    onChange={handleComposerChange}
                    onBlur={() => stopLocalTyping(selectedChatId)}
                    containerClassName="!mb-0 flex-1"
                    className="h-12"
                    placeholder={tf('chatPage.fields.messagePlaceholder', 'Type your message...')}
                    disabled={!activeThread.canCurrentUserSendMessages}
                  />
                  <Button
                    type="submit"
                    icon={Send}
                    loading={sendMessageMutation.isPending}
                    disabled={!composerText.trim() || !activeThread.canCurrentUserSendMessages}
                  >
                    {tf('chatPage.actions.send', 'Send')}
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted">
              <div className="space-y-3">
                <MessageSquare className="mx-auto h-10 w-10 text-primary/70" />
                <p>{tf('chatPage.states.selectThread', 'Select a chat from the list to open it.')}</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Modal
        isOpen={isDirectModalOpen}
        onClose={() => {
          setDirectModalOpen(false);
          setDirectSearch('');
        }}
        title={tf('chatPage.actions.newChat', 'New chat')}
        size="lg"
        footer={(
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDirectModalOpen(false);
              setDirectSearch('');
            }}
          >
            {t('common.actions.cancel')}
          </Button>
        )}
      >
        <div className="space-y-4">
          <Input
            label={tf('chatPage.direct.searchLabel', 'Search users')}
            value={directSearch}
            onChange={(event) => setDirectSearch(event.target.value)}
            icon={Search}
            containerClassName="!mb-0"
            placeholder={tf('chatPage.direct.searchPlaceholder', 'Search by name, phone, or email')}
          />

          {directSearchQuery.isLoading ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-alt/40 p-4 text-sm text-muted">
              {t('common.loading')}
            </div>
          ) : (
            <div className="space-y-2">
              {(directSearchQuery.data || []).length ? (
                (directSearchQuery.data || []).map((userItem) => (
                  <div
                    key={userItem.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-alt/20 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={userItem.fullName} avatarUrl={userItem.avatar?.url} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-heading">{userItem.fullName}</p>
                        <p className="truncate text-xs text-muted">
                          {userItem.phonePrimary || userItem.role || ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      loading={createDirectMutation.isPending}
                      onClick={() => createDirectMutation.mutate(userItem.id)}
                    >
                      {tf('chatPage.actions.startChat', 'Start chat')}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-surface-alt/40 p-4 text-sm text-muted">
                  {tf('chatPage.states.noUsersFound', 'No matching users were found.')}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => {
          setGroupModalOpen(false);
          setGroupForm(EMPTY_GROUP_FORM);
          setGroupSearch('');
        }}
        title={tf('chatPage.actions.newGroup', 'New group')}
        size="xl"
        footer={(
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setGroupModalOpen(false);
                setGroupForm(EMPTY_GROUP_FORM);
                setGroupSearch('');
              }}
            >
              {t('common.actions.cancel')}
            </Button>
            <Button
              type="button"
              icon={Users}
              loading={createGroupMutation.isPending}
              onClick={submitGroupCreation}
            >
              {tf('chatPage.actions.createGroup', 'Create group')}
            </Button>
          </>
        )}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-4">
            <Input
              label={tf('chatPage.group.fields.title', 'Group title')}
              value={groupForm.title}
              onChange={(event) =>
                setGroupForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder={tf('chatPage.group.fields.titlePlaceholder', 'Example: Youth servants')}
            />
            <TextArea
              label={tf('chatPage.group.fields.description', 'Description')}
              value={groupForm.description}
              onChange={(event) =>
                setGroupForm((current) => ({ ...current, description: event.target.value }))
              }
              containerClassName="!mb-0"
              placeholder={tf(
                'chatPage.group.fields.descriptionPlaceholder',
                'Optional details about this group conversation.'
              )}
            />
            <div className="rounded-2xl border border-border bg-surface-alt/30 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-heading">
                    {tf('chatPage.group.fields.allowMemberMessages', 'Allow members to send messages')}
                  </p>
                  <p className="text-sm text-muted">
                    {tf(
                      'chatPage.group.fields.allowMemberMessagesHelp',
                      'Turn this off for announcement-only groups managed by admins.'
                    )}
                  </p>
                </div>
                <Switch
                  checked={groupForm.allowMemberMessages}
                  onChange={(checked) =>
                    setGroupForm((current) => ({ ...current, allowMemberMessages: checked }))
                  }
                  label={
                    groupForm.allowMemberMessages
                      ? tf('chatPage.states.membersCanChat', 'Members can chat')
                      : tf('chatPage.states.adminOnlyChat', 'Admins only')
                  }
                />
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-surface-alt/20 p-4 text-sm text-muted">
              {tf(
                'chatPage.group.creatorNote',
                'The group creator is added automatically as a group admin.'
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label={tf('chatPage.group.fields.members', 'Members')}
              value={groupSearch}
              onChange={(event) => setGroupSearch(event.target.value)}
              icon={Search}
              containerClassName="!mb-0"
              placeholder={tf('chatPage.group.fields.memberSearch', 'Search users to add')}
            />

            <SelectedUsersChips
              users={groupSelectedUsers}
              onRemove={handleToggleGroupMember}
            />

            {groupSearchQuery.isLoading ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface-alt/40 p-4 text-sm text-muted">
                {t('common.loading')}
              </div>
            ) : (
              <UserSelectionList
                users={groupSearchResults}
                selectedIds={groupForm.memberIds}
                onToggle={handleToggleGroupMember}
                actionLabel={tf('chatPage.actions.addToGroup', 'Add')}
              />
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isGroupSettingsOpen}
        onClose={() => {
          setGroupSettingsOpen(false);
          setGroupSettingsSearch('');
        }}
        title={tf('chatPage.actions.groupSettings', 'Group settings')}
        size="xl"
        footer={(
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setGroupSettingsOpen(false);
                setGroupSettingsSearch('');
              }}
            >
              {t('common.actions.cancel')}
            </Button>
            <Button
              type="button"
              icon={Save}
              loading={updateGroupMutation.isPending}
              onClick={submitGroupSettings}
            >
              {t('common.actions.save')}
            </Button>
          </>
        )}
      >
        {activeThread?.type === 'group' ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="space-y-4">
              <Input
                label={tf('chatPage.group.fields.title', 'Group title')}
                value={groupSettingsForm.title}
                onChange={(event) =>
                  setGroupSettingsForm((current) => ({ ...current, title: event.target.value }))
                }
              />
              <TextArea
                label={tf('chatPage.group.fields.description', 'Description')}
                value={groupSettingsForm.description}
                onChange={(event) =>
                  setGroupSettingsForm((current) => ({ ...current, description: event.target.value }))
                }
                containerClassName="!mb-0"
              />
              <div className="rounded-2xl border border-border bg-surface-alt/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-heading">
                      {tf('chatPage.group.fields.allowMemberMessages', 'Allow members to send messages')}
                    </p>
                    <p className="text-sm text-muted">
                      {tf(
                        'chatPage.group.fields.settingsHelp',
                        'Admins can switch this group between discussion mode and announcement mode.'
                      )}
                    </p>
                  </div>
                  <Switch
                    checked={groupSettingsForm.allowMemberMessages}
                    onChange={(checked) =>
                      setGroupSettingsForm((current) => ({
                        ...current,
                        allowMemberMessages: checked,
                      }))
                    }
                    label={
                      groupSettingsForm.allowMemberMessages
                        ? tf('chatPage.states.membersCanChat', 'Members can chat')
                        : tf('chatPage.states.adminOnlyChat', 'Admins only')
                    }
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-border bg-surface-alt/20 p-4 text-sm text-muted">
                {tf(
                  'chatPage.group.ownerNote',
                  'The group creator remains in the group and keeps admin control.'
                )}
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label={tf('chatPage.group.fields.manageMembers', 'Manage members')}
                value={groupSettingsSearch}
                onChange={(event) => setGroupSettingsSearch(event.target.value)}
                icon={Search}
                containerClassName="!mb-0"
                placeholder={tf('chatPage.group.fields.memberSearch', 'Search users to add')}
              />

              <SelectedUsersChips
                users={groupSettingsUsers}
                onRemove={handleToggleGroupSettingsMember}
                removableIds={groupSettingsForm.memberIds.filter(
                  (userId) => userId !== activeThread.createdBy?.id
                )}
              />

              {groupSettingsSearchQuery.isLoading ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface-alt/40 p-4 text-sm text-muted">
                  {t('common.loading')}
                </div>
              ) : (
                <UserSelectionList
                  users={groupSettingsSearchResults}
                  selectedIds={groupSettingsForm.memberIds}
                  onToggle={handleToggleGroupSettingsMember}
                  actionLabel={tf('chatPage.actions.addToGroup', 'Add')}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface-alt/40 p-4 text-sm text-muted">
            {tf('chatPage.states.groupOnlySettings', 'Group settings are only available for group chats.')}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isBroadcastModalOpen}
        onClose={() => {
          setBroadcastModalOpen(false);
          setBroadcastForm(EMPTY_BROADCAST_FORM);
          setBroadcastUserSearch('');
        }}
        title={tf('chatPage.actions.broadcast', 'Broadcast')}
        size="xl"
        footer={(
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setBroadcastModalOpen(false);
                setBroadcastForm(EMPTY_BROADCAST_FORM);
                setBroadcastUserSearch('');
              }}
              className="rounded-full px-5"
            >
              {t('common.actions.cancel')}
            </Button>
            <Button
              type="button"
              icon={Megaphone}
              loading={broadcastMutation.isPending}
              onClick={submitBroadcast}
              className="rounded-full px-5 shadow-sm"
            >
              {tf('chatPage.actions.sendBroadcast', 'Send broadcast')}
            </Button>
          </>
        )}
      >
        <div className="space-y-5">
          <TextArea
            ref={broadcastTemplateRef}
            label={tf('chatPage.broadcast.fields.template', 'Message template')}
            value={broadcastForm.template}
            onChange={(event) =>
              setBroadcastForm((current) => ({ ...current, template: event.target.value }))
            }
            className="min-h-[120px]"
            containerClassName="!mb-0"
            hint={tf(
              'chatPage.broadcast.fields.templateHelp',
              'Click a placeholder below to insert it into the message.'
            )}
            placeholder={'Happy feast day, {user.name}.'}
          />

          <div className="rounded-lg border border-border bg-surface-alt/25 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-heading">
                  {tf('chatPage.broadcast.fields.placeholdersTitle', 'Insert placeholders')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {BROADCAST_TEMPLATE_PLACEHOLDERS.map((placeholderItem) => (
                <Button
                  key={placeholderItem.token}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleInsertBroadcastPlaceholder(placeholderItem.token)}
                  title={placeholderItem.token}
                  className="rounded-full bg-white/80 px-3 text-xs font-medium"
                >
                  {tf(
                    `chatPage.broadcast.fields.placeholderLabels.${placeholderItem.labelKey}`,
                    placeholderItem.fallback
                  )}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-primary/15 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {hasBroadcastAudienceFilters
                    ? tf('chatPage.broadcast.fields.scopeFiltered', 'Filtered recipients')
                    : tf('chatPage.broadcast.fields.scopeAll', 'All eligible users')}
                </div>
                <div>
                  <p className="text-sm font-semibold text-heading">
                    {tf('chatPage.broadcast.fields.audienceTitle', 'Broadcast audience')}
                  </p>
                  <p className="text-sm text-muted">
                    {hasBroadcastAudienceFilters
                      ? tf(
                        'chatPage.broadcast.fields.audienceFilteredHelp',
                        'Send now will target only the users matching the filters and selected recipients below.'
                      )
                      : tf(
                        'chatPage.broadcast.fields.audienceAllHelp',
                        'If you do not choose any filter, the broadcast is sent to all eligible users in the system.'
                      )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border bg-white/80 px-3 py-1 text-xs font-medium text-heading">
                  {tfp(
                    'chatPage.broadcast.fields.filtersCount',
                    `${activeBroadcastFilterCount} active filters`,
                    { count: activeBroadcastFilterCount }
                  )}
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-white/80 px-3 py-1 text-xs font-medium text-heading">
                  {tfp(
                    'chatPage.broadcast.fields.selectedUsersCount',
                    `${broadcastAudience.userIds.length} selected users`,
                    { count: broadcastAudience.userIds.length }
                  )}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearBroadcastAudienceFilters}
                  disabled={!hasBroadcastAudienceFilters}
                  className="rounded-full bg-white/80 px-4"
                >
                  {tf('chatPage.broadcast.fields.clearFilters', 'Clear filters')}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <div className="space-y-4">
              <Input
                label={tf('chatPage.broadcast.fields.users', 'Specific users')}
                value={broadcastUserSearch}
                onChange={(event) => setBroadcastUserSearch(event.target.value)}
                icon={Search}
                containerClassName="!mb-0"
                placeholder={tf(
                  'chatPage.broadcast.fields.usersPlaceholder',
                  'Search and add specific users'
                )}
              />

              <SelectedUsersChips
                users={broadcastSelectedUsers}
                onRemove={handleToggleBroadcastUser}
              />

              <div className="rounded-3xl border border-border bg-surface-alt/25 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-heading">
                      {tf('chatPage.broadcast.fields.matchingUsers', 'Matching users')}
                    </p>
                    <p className="text-xs text-muted">
                      {hasBroadcastAudienceFilters
                        ? tf(
                          'chatPage.broadcast.fields.matchingUsersFilteredHelp',
                          'The list below is narrowed live by the selected filters.'
                        )
                        : tf(
                          'chatPage.broadcast.fields.matchingUsersAllHelp',
                          'No filter selected yet, so this list shows eligible users from the system.'
                        )}
                    </p>
                  </div>
                  {broadcastUserSearch ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setBroadcastUserSearch('')}
                      className="rounded-full px-3"
                    >
                      {tf('chatPage.broadcast.fields.clearSearch', 'Clear search')}
                    </Button>
                  ) : null}
                </div>

                {broadcastUserSearchQuery.isLoading ? (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-alt/40 p-4 text-sm text-muted">
                    {t('common.loading')}
                  </div>
                ) : (
                  <UserSelectionList
                    users={broadcastSearchResults}
                    selectedIds={broadcastAudience.userIds}
                    onToggle={handleToggleBroadcastUser}
                    actionLabel={tf('chatPage.actions.addRecipient', 'Add')}
                    emptyMessage={tf(
                      'chatPage.states.noUsersMatchingAudience',
                      'No users match the current audience filters.'
                    )}
                  />
                )}
              </div>
            </div>

            <div className="space-y-4">
              {audienceOptionsQuery.isLoading ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface-alt/40 p-4 text-sm text-muted">
                  {t('common.loading')}
                </div>
              ) : (
                <>
                  <MultiSelectField
                    label={tf('chatPage.broadcast.fields.ageGroups', 'Age groups')}
                    value={broadcastAudience.ageGroups}
                    options={broadcastAudienceOptions.ageGroups}
                    onChange={(value) =>
                      setBroadcastForm((current) => ({
                        ...current,
                        audience: { ...current.audience, ageGroups: value },
                      }))
                    }
                    placeholder={tf(
                      'chatPage.broadcast.fields.ageGroupsPlaceholder',
                      'Choose one or more age groups'
                    )}
                  />
                  <MultiSelectField
                    label={tf('chatPage.broadcast.fields.educationStages', 'Educational stages')}
                    value={broadcastAudience.educationStages}
                    options={educationStageOptions}
                    onChange={(value) =>
                      setBroadcastForm((current) => ({
                        ...current,
                        audience: { ...current.audience, educationStages: value },
                      }))
                    }
                    placeholder={tf(
                      'chatPage.broadcast.fields.educationStagesPlaceholder',
                      'Choose educational stages'
                    )}
                  />
                  <MultiSelectField
                    label={tf('chatPage.broadcast.fields.diseases', 'Diseases')}
                    value={broadcastAudience.diseases}
                    options={broadcastAudienceOptions.diseases}
                    onChange={(value) =>
                      setBroadcastForm((current) => ({
                        ...current,
                        audience: { ...current.audience, diseases: value },
                      }))
                    }
                    placeholder={tf(
                      'chatPage.broadcast.fields.diseasesPlaceholder',
                      'Choose diseases'
                    )}
                  />
                  <MultiSelectField
                    label={tf('chatPage.broadcast.fields.tags', 'Tags')}
                    value={broadcastAudience.tags}
                    options={broadcastAudienceOptions.tags}
                    onChange={(value) =>
                      setBroadcastForm((current) => ({
                        ...current,
                        audience: { ...current.audience, tags: value },
                      }))
                    }
                    placeholder={tf(
                      'chatPage.broadcast.fields.tagsPlaceholder',
                      'Choose tags'
                    )}
                  />
                  <MultiSelectField
                    label={tf('chatPage.broadcast.fields.genders', 'Gender')}
                    value={broadcastAudience.genders}
                    options={broadcastAudienceOptions.genders}
                    onChange={(value) =>
                      setBroadcastForm((current) => ({
                        ...current,
                        audience: { ...current.audience, genders: value },
                      }))
                    }
                    placeholder={tf(
                      'chatPage.broadcast.fields.gendersPlaceholder',
                      'Choose gender'
                    )}
                  />
                  <MultiSelectField
                    label={tf('chatPage.broadcast.fields.familyNames', 'Families')}
                    value={broadcastAudience.familyNames}
                    options={broadcastAudienceOptions.familyNames}
                    onChange={(value) =>
                      setBroadcastForm((current) => ({
                        ...current,
                        audience: { ...current.audience, familyNames: value },
                      }))
                    }
                    placeholder={tf(
                      'chatPage.broadcast.fields.familyNamesPlaceholder',
                      'Choose families'
                    )}
                  />
                  <MultiSelectField
                    label={tf('chatPage.broadcast.fields.houseNames', 'Houses')}
                    value={broadcastAudience.houseNames}
                    options={broadcastAudienceOptions.houseNames}
                    onChange={(value) =>
                      setBroadcastForm((current) => ({
                        ...current,
                        audience: { ...current.audience, houseNames: value },
                      }))
                    }
                    placeholder={tf(
                      'chatPage.broadcast.fields.houseNamesPlaceholder',
                      'Choose houses'
                    )}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
