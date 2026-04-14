import apiClient from './client';

/* ══════════ Auth ══════════ */

export const authApi = {
  register: (data) => apiClient.post('/auth/register', data),
  getRegistrationOptions: () => apiClient.get('/auth/register/options'),
  login: (data) => apiClient.post('/auth/login', data),
  refresh: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) => apiClient.post('/auth/logout', { refreshToken }),
  me: () => apiClient.get('/auth/me'),
  updateMySettings: (data) => apiClient.patch('/auth/me/settings', data),
  changePassword: (data) => apiClient.post('/auth/change-password', data),
};

/* ══════════ Users ══════════ */

export const usersApi = {
  list: (params) => apiClient.get('/users', { params }),
  getById: (id) => apiClient.get(`/users/${id}`),
  getCustomDetailKeys: () => apiClient.get('/users/custom-detail-keys'),
  getFamilyNames: () => apiClient.get('/users/family-names'),
  getHouseNames: () => apiClient.get('/users/house-names'),
  getProfileOptionValues: () => apiClient.get('/users/profile-option-values'),
  getRelationRoles: () => apiClient.get('/users/relation-roles'),
  createRelationRole: (label) => apiClient.post('/users/relation-roles', { label }),
  create: (data) => apiClient.post('/users', data),
  update: (id, data) => apiClient.patch(`/users/${id}`, data),
  remove: (id) => apiClient.delete(`/users/${id}`),
  /** Upload image only (for new user). Returns { url, publicId }. */
  uploadAvatarImage: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.post('/users/upload-avatar', formData);
  },
  /** Upload and set avatar for existing user. */
  uploadAvatar: (id, file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.post(`/users/${id}/avatar`, formData);
  },
  lock: (id, lockReason) => apiClient.post(`/users/${id}/lock`, { lockReason }),
  uploadMyAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.post('/users/me/avatar', formData);
  },
  unlock: (id) => apiClient.post(`/users/${id}/unlock`),
  manageTags: (id, data) => apiClient.post(`/users/${id}/tags`, data),
  linkFamily: (id, data) => apiClient.post(`/users/${id}/family/link`, data),
};

export const householdClassificationsApi = {
  listCategories: () => apiClient.get('/household-classifications/categories'),
  createCategory: (data) => apiClient.post('/household-classifications/categories', data),
  updateCategory: (id, data) =>
    apiClient.patch(`/household-classifications/categories/${id}`, data),
  deleteCategory: (id) => apiClient.delete(`/household-classifications/categories/${id}`),
  listHouseholds: (params) =>
    apiClient.get('/household-classifications/households', { params }),
  getHouseholdByName: (houseName) =>
    apiClient.get('/household-classifications/households/details', {
      params: { houseName },
    }),
  updateHousehold: (data) =>
    apiClient.patch('/household-classifications/households/details', data),
  searchHouseholds: (data) =>
    apiClient.post('/household-classifications/households/search', data),
};

/* â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ Confessions â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ */

export const confessionsApi = {
  listSessions: (params) => apiClient.get('/confessions/sessions', { params }),
  createSession: (data) => apiClient.post('/confessions/sessions', data),

  getSessionTypes: () => apiClient.get('/confessions/session-types'),
  createSessionType: (name) => apiClient.post('/confessions/session-types', { name }),

  searchUsers: (params) => apiClient.get('/confessions/users/search', { params }),

  getAlertConfig: () => apiClient.get('/confessions/config'),
  updateAlertConfig: (alertThresholdDays) =>
    apiClient.patch('/confessions/config', { alertThresholdDays }),
  getAlerts: (params) => apiClient.get('/confessions/alerts', { params }),

  getAnalytics: (params) => apiClient.get('/confessions/analytics', { params }),
};

export const visitationsApi = {
  list: (params) => apiClient.get('/visitations', { params }),
  create: (data) => apiClient.post('/visitations', data),
  getById: (id) => apiClient.get(`/visitations/${id}`),
  getAnalytics: (params) => apiClient.get('/visitations/analytics', { params }),
};

export const divineLiturgiesApi = {
  getOverview: () => apiClient.get('/divine-liturgies'),
  getAttendanceContext: (entryType, id) =>
    apiClient.get(`/divine-liturgies/attendance/${entryType}/${id}/context`),
  getAttendance: (entryType, id, attendanceDate) =>
    apiClient.get(`/divine-liturgies/attendance/${entryType}/${id}`, { params: { attendanceDate } }),
  updateAttendance: (entryType, id, attendanceDate, attendedUserIds) =>
    apiClient.put(`/divine-liturgies/attendance/${entryType}/${id}`, {
      attendanceDate,
      attendedUserIds,
    }),
  createRecurring: (data) => apiClient.post('/divine-liturgies/recurring', data),
  updateRecurring: (id, data) => apiClient.patch(`/divine-liturgies/recurring/${id}`, data),
  deleteRecurring: (id) => apiClient.delete(`/divine-liturgies/recurring/${id}`),
  createException: (data) => apiClient.post('/divine-liturgies/exceptions', data),
  updateException: (id, data) => apiClient.patch(`/divine-liturgies/exceptions/${id}`, data),
  deleteException: (id) => apiClient.delete(`/divine-liturgies/exceptions/${id}`),
  setChurchPriests: (priestUserIds) => apiClient.put('/divine-liturgies/priests', { priestUserIds }),
};

export const archiveApi = {
  getPublic: () => apiClient.get('/archive/public'),
  getManage: () => apiClient.get('/archive/manage'),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.post('/archive/upload-image', formData);
  },
  createCollection: (data) => apiClient.post('/archive/collections', data),
  updateCollection: (id, data) => apiClient.patch(`/archive/collections/${id}`, data),
  removeCollection: (id) => apiClient.delete(`/archive/collections/${id}`),
  createStory: (data) => apiClient.post('/archive/stories', data),
  updateStory: (id, data) => apiClient.patch(`/archive/stories/${id}`, data),
  removeStory: (id) => apiClient.delete(`/archive/stories/${id}`),
  createHonoree: (data) => apiClient.post('/archive/honorees', data),
  updateHonoree: (id, data) => apiClient.patch(`/archive/honorees/${id}`, data),
  removeHonoree: (id) => apiClient.delete(`/archive/honorees/${id}`),
};

export const landingContentApi = {
  getPublic: () => apiClient.get('/landing-content/public'),
  getManage: () => apiClient.get('/landing-content/manage'),
  update: (data) => apiClient.put('/landing-content/manage', data),
  uploadHeroImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.post('/landing-content/hero-image', formData);
  },
  deleteHeroImage: () => apiClient.delete('/landing-content/hero-image'),
};

export const notificationsApi = {
  list: (params) => apiClient.get('/notifications/content', { params }),
  getById: (id) => apiClient.get(`/notifications/content/${id}`),
  create: (data) => apiClient.post('/notifications/content', data),
  update: (id, data) => apiClient.patch(`/notifications/content/${id}`, data),
  listTypes: () => apiClient.get('/notifications/content/types'),
  createType: (name) => apiClient.post('/notifications/content/types', { name }),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.post('/notifications/content/upload-image', formData);
  },
};

export const platformSettingsApi = {
  getManage: () => apiClient.get('/settings/platform'),
  update: (data) => apiClient.patch('/settings/platform', data),
};

export const settingsApi = {
  getPublicSite: () => apiClient.get('/settings/public/site'),
};

export const userNotificationsApi = {
  list: (params) => apiClient.get('/notifications', { params }),
  unreadCount: () => apiClient.get('/notifications/unread-count'),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markThreadRead: (threadId) => apiClient.patch(`/notifications/threads/${threadId}/read`),
  readAll: () => apiClient.patch('/notifications/read-all'),
  sendSystem: (data) => apiClient.post('/notifications/system', data),
};

export const pushApi = {
  getPublicKey: () => apiClient.get('/push/public-key'),
  subscribe: (data) => apiClient.post('/push/subscribe', data),
  unsubscribe: (data) => apiClient.post('/push/unsubscribe', data),
};

export const chatApi = {
  list: (params) => apiClient.get('/chats', { params }),
  getById: (id) => apiClient.get(`/chats/${id}`),
  listMessages: (id, params) => apiClient.get(`/chats/${id}/messages`, { params }),
  searchUsers: (params) => apiClient.get('/chats/users/search', { params }),
  getAudienceOptions: () => apiClient.get('/chats/audience-options'),
  createDirect: (data) => apiClient.post('/chats/direct', data),
  createGroup: (data) => apiClient.post('/chats/groups', data),
  updateGroup: (id, data) => apiClient.patch(`/chats/${id}/group`, data),
  sendMessage: (id, data) => apiClient.post(`/chats/${id}/messages`, data),
  markRead: (id, data = {}) => apiClient.post(`/chats/${id}/read`, data),
  broadcast: (data) => apiClient.post('/chats/broadcasts', data),
};

export const bookingsApi = {
  public: {
    listTypes: () => apiClient.get('/bookings/public/types'),
    getSlots: (id, params) => apiClient.get(`/bookings/public/types/${id}/slots`, { params }),
    create: (data) => apiClient.post('/bookings/public', data),
    uploadImage: (file, { bookingTypeId, fieldKey } = {}) => {
      const formData = new FormData();
      formData.append('image', file);
      if (bookingTypeId) {
        formData.append('bookingTypeId', bookingTypeId);
      }
      if (fieldKey) {
        formData.append('fieldKey', fieldKey);
      }
      return apiClient.post('/bookings/public/upload-image', formData);
    },
  },
  self: {
    list: (params) => apiClient.get('/bookings/mine', { params }),
  },
  admin: {
    listTypes: () => apiClient.get('/bookings/types'),
    createType: (data) => apiClient.post('/bookings/types', data),
    updateType: (id, data) => apiClient.patch(`/bookings/types/${id}`, data),
    list: (params) => apiClient.get('/bookings', { params }),
    getById: (id) => apiClient.get(`/bookings/${id}`),
    update: (id, data) => apiClient.patch(`/bookings/${id}`, data),
  },
};

export const meetingsApi = {
  sectors: {
    list: (params) => apiClient.get('/meetings/sectors', { params }),
    create: (data) => apiClient.post('/meetings/sectors', data),
    uploadAvatarImage: (file) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return apiClient.post('/meetings/sectors/upload-avatar', formData);
    },
    getById: (id) => apiClient.get(`/meetings/sectors/${id}`),
    update: (id, data) => apiClient.patch(`/meetings/sectors/${id}`, data),
    remove: (id) => apiClient.delete(`/meetings/sectors/${id}`),
  },
    meetings: {
      list: (params) => apiClient.get('/meetings', { params }),
      listReminderSettings: () => apiClient.get('/meetings/reminder-settings'),
      create: (data) => apiClient.post('/meetings', data),
      uploadAvatarImage: (file) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return apiClient.post('/meetings/upload-avatar', formData);
    },
    getById: (id) => apiClient.get(`/meetings/${id}`),
    getMemberById: (meetingId, memberId) => apiClient.get(`/meetings/${meetingId}/members/${memberId}`),
    getAttendance: (meetingId, attendanceDate) =>
      apiClient.get(`/meetings/${meetingId}/attendance`, { params: { attendanceDate } }),
    updateAttendance: (meetingId, attendanceDate, attendedMemberUserIds) =>
      apiClient.put(`/meetings/${meetingId}/attendance`, { attendanceDate, attendedMemberUserIds }),
    getDocumentation: (meetingId, documentationDate) =>
      apiClient.get(`/meetings/${meetingId}/documentation`, { params: { documentationDate } }),
      updateDocumentation: (meetingId, payload) =>
        apiClient.put(`/meetings/${meetingId}/documentation`, payload),
      updateMemberNotes: (meetingId, memberId, note) =>
        apiClient.patch(`/meetings/${meetingId}/members/${memberId}/notes`, { note }),
      updateReminderSettings: (id, data) => apiClient.patch(`/meetings/${id}/reminder-settings`, data),
      updateBasic: (id, data) => apiClient.patch(`/meetings/${id}/basic`, data),
    updateServants: (id, servants) => apiClient.patch(`/meetings/${id}/servants`, { servants }),
    updateCommittees: (id, committees) => apiClient.patch(`/meetings/${id}/committees`, { committees }),
    updateActivities: (id, activities) => apiClient.patch(`/meetings/${id}/activities`, { activities }),
    remove: (id) => apiClient.delete(`/meetings/${id}`),
  },
  documentationSettings: {
    get: (meetingId, params) => apiClient.get(`/meetings/${meetingId}/documentation-settings`, { params }),
    update: (meetingId, fields) => apiClient.put(`/meetings/${meetingId}/documentation-settings`, { fields }),
    uploadAsset: (file, { meetingId, documentationDate } = {}) => {
      const formData = new FormData();
      formData.append('file', file);
      if (meetingId) {
        formData.append('meetingId', meetingId);
      }
      if (documentationDate) {
        formData.append('documentationDate', documentationDate);
      }
      return apiClient.post('/meetings/documentation/upload-asset', formData);
    },
  },
  responsibilities: {
    list: (params) => apiClient.get('/meetings/responsibilities', { params }),
  },
  servants: {
    history: (params) => apiClient.get('/meetings/servants/history', { params }),
  },
};

/* ══════════ Aids ══════════ */

export const aidsApi = {
  createBulk: (data) => apiClient.post('/aids/bulk', data),
  getOptions: () => apiClient.get('/aids/options'),
  getDisbursedAids: (params) => apiClient.get('/aids', { params }),
  getAidDetails: (params) => apiClient.get('/aids/details', { params }),
  searchHistory: (data) => apiClient.post('/aids/history/search', data),
  approveReminder: (id) => apiClient.post(`/aids/reminders/${id}/approve`),
  updateBulk: (data) => apiClient.put('/aids', data),
};

/* ══════════ Health ══════════ */

export const healthApi = {
  check: () => apiClient.get('/health'),
};

export const systemAnalyticsApi = {
  getOverview: (params) => apiClient.get('/system-analytics/overview', { params }),
};


