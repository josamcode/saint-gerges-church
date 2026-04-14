export const DAY_VALUES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getDayLabel(day, t) {
  if (!day) return '';
  const key = `meetings.days.${day}`;
  const translated = t(key);
  return translated === key ? day : translated;
}

export function getDayOptions(t) {
  return DAY_VALUES.map((day) => ({
    value: day,
    label: getDayLabel(day, t),
  }));
}

export const ACTIVITY_VALUES = ['trip', 'conference', 'activity', 'other'];

export function getActivityTypeLabel(type, t) {
  if (!type) return '';
  const key = `meetings.activityTypes.${type}`;
  const translated = t(key);
  return translated === key ? type : translated;
}

export function getActivityOptions(t) {
  return ACTIVITY_VALUES.map((type) => ({
    value: type,
    label: getActivityTypeLabel(type, t),
  }));
}

export function toLocalDateTimeInput(isoValue) {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function toIsoDateTime(localValue) {
  if (!localValue) return null;
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function uniqueCsv(value) {
  return [...new Set(String(value || '').split(',').map((entry) => entry.trim()).filter(Boolean))];
}

export function uniqueStringList(values = []) {
  return [...new Set((values || []).map((entry) => String(entry || '').trim()).filter(Boolean))];
}

export function toSelectUser(userLike, fallbackName = '') {
  if (!userLike) return null;
  const id = userLike.id || userLike._id;
  if (!id) return null;
  return {
    _id: id,
    fullName: userLike.fullName || fallbackName || '---',
    phonePrimary: userLike.phonePrimary || '',
  };
}

export function toPersonPayload(selectedUser, manualName) {
  const name = String(manualName || '').trim();
  if (selectedUser?._id) {
    return {
      userId: selectedUser._id,
      name: name || selectedUser.fullName,
    };
  }
  if (!name) return null;
  return { name };
}

function uniqueSelectUsersById(users = []) {
  const seen = new Set();
  return (users || []).filter((user) => {
    const id = user?._id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function mapSectorToForm(sector) {
  return {
    name: sector?.name || '',
    avatar: sector?.avatar?.url
      ? {
          url: sector.avatar.url,
          publicId: sector?.avatar?.publicId || '',
        }
      : null,
    avatarRemoved: false,
    notes: sector?.notes || '',
    officials: (sector?.officials || []).map((official) => ({
      user: toSelectUser(official.user, official.name),
      name: official.name || '',
      title: official.title || '',
      notes: official.notes || '',
    })),
  };
}

export function buildSectorPayload(form) {
  const avatarUrl = String(form?.avatar?.url || form?.avatarUrl || '').trim();
  const avatarPublicId = String(form?.avatar?.publicId || form?.avatarPublicId || '').trim();

  return {
    name: String(form.name || '').trim(),
    ...(form.avatarRemoved ? { avatar: null } : {}),
    ...(avatarUrl && {
      avatar: {
        url: avatarUrl,
        ...(avatarPublicId && {
          publicId: avatarPublicId,
        }),
      },
    }),
    ...(String(form.notes || '').trim() && { notes: String(form.notes || '').trim() }),
    officials: (form.officials || [])
      .map((official) => {
        const person = toPersonPayload(official.user, official.name);
        if (!person) return null;
        return {
          ...person,
          ...(String(official.title || '').trim() && { title: String(official.title || '').trim() }),
          ...(String(official.notes || '').trim() && { notes: String(official.notes || '').trim() }),
        };
      })
      .filter(Boolean),
  };
}

export function mapMeetingToForm(meeting) {
  const groupServedUsersByGroup = (meeting?.groupAssignments || []).reduce((acc, entry) => {
    const groupName = String(entry?.group || '').trim();
    if (!groupName) return acc;
    acc[groupName] = uniqueSelectUsersById(
      (entry?.servedUsers || []).map((user) => toSelectUser(user)).filter(Boolean)
    );
    return acc;
  }, {});

  return {
    sectorId: meeting?.sector?.id || '',
    name: meeting?.name || '',
    day: meeting?.day || 'Sunday',
    time: meeting?.time || '18:00',
    avatar: meeting?.avatar?.url
      ? {
          url: meeting.avatar.url,
          publicId: meeting?.avatar?.publicId || '',
        }
      : null,
    avatarRemoved: false,
    serviceSecretaryUser: toSelectUser(meeting?.serviceSecretary?.user, meeting?.serviceSecretary?.name),
    serviceSecretaryName: meeting?.serviceSecretary?.name || '',
    assistantSecretaries: (meeting?.assistantSecretaries || []).map((assistant) => ({
      user: toSelectUser(assistant?.user, assistant?.name),
      name: assistant?.name || '',
    })),
    servedUsers: uniqueSelectUsersById(
      (meeting?.servedUsers || []).map((user) => toSelectUser(user)).filter(Boolean)
    ),
    groups: uniqueStringList(meeting?.groups || []),
    groupServedUsersByGroup,
    pendingGroupServedUserByGroup: {},
    servants: (meeting?.servants || []).map((servant) => ({
      user: toSelectUser(servant?.user, servant?.name),
      name: servant?.name || '',
      responsibility: servant?.responsibility || '',
      groupsManaged: uniqueStringList(servant?.groupsManaged || []),
      servedUsers: uniqueSelectUsersById(
        (servant?.servedUsers || []).map((user) => toSelectUser(user)).filter(Boolean)
      ),
      notes: servant?.notes || '',
    })),
    committees: (meeting?.committees || []).map((committee) => ({
      name: committee?.name || '',
      members: uniqueSelectUsersById(
        (committee?.members || []).map((user) => toSelectUser(user)).filter(Boolean)
      ),
      memberUserIdsCsv: (committee?.members || []).map((user) => user.id).join(', '),
      memberNamesCsv: (committee?.memberNames || []).join(', '),
      detailsText:
        committee?.details && typeof committee.details === 'object'
          ? JSON.stringify(committee.details)
          : String(committee?.details || ''),
      notes: committee?.notes || '',
    })),
    activities: (meeting?.activities || []).map((activity) => ({
      name: activity?.name || '',
      type: activity?.type || 'activity',
      scheduledAt: toLocalDateTimeInput(activity?.scheduledAt),
      notes: activity?.notes || '',
    })),
    notes: meeting?.notes || '',
  };
}

export function buildMeetingPayload(form, options = {}) {
  const includeServants = options.includeServants !== false;
  const includeCommittees = options.includeCommittees !== false;
  const includeActivities = options.includeActivities !== false;

  const serviceSecretary = toPersonPayload(form.serviceSecretaryUser, form.serviceSecretaryName);
  const avatarUrl = String(form?.avatar?.url || form?.avatarUrl || '').trim();
  const avatarPublicId = String(form?.avatar?.publicId || form?.avatarPublicId || '').trim();
  const groups = uniqueStringList(form.groups || []);
  const groupAssignments = groups.map((groupName) => ({
    group: groupName,
    servedUserIds: (form?.groupServedUsersByGroup?.[groupName] || []).map((user) => user?._id).filter(Boolean),
  }));
  const groupedServedUserIds = [...new Set(groupAssignments.flatMap((entry) => entry.servedUserIds || []))];

  const payload = {
    sectorId: form.sectorId,
    name: String(form.name || '').trim(),
    day: form.day,
    time: form.time,
    ...(form.avatarRemoved ? { avatar: null } : {}),
    ...(avatarUrl && {
      avatar: {
        url: avatarUrl,
        ...(avatarPublicId && {
          publicId: avatarPublicId,
        }),
      },
    }),
    ...(serviceSecretary && { serviceSecretary }),
    assistantSecretaries: (form.assistantSecretaries || [])
      .map((assistant) => toPersonPayload(assistant.user, assistant.name))
      .filter(Boolean),
    servedUserIds: [
      ...new Set([...(form.servedUsers || []).map((user) => user?._id).filter(Boolean), ...groupedServedUserIds]),
    ],
    groups,
    groupAssignments,
    ...(String(form.notes || '').trim() && { notes: String(form.notes || '').trim() }),
  };

  if (includeServants) {
    payload.servants = (form.servants || [])
      .map((servant) => {
        const person = toPersonPayload(servant.user, servant.name);
        if (!person) return null;

        const groupsManaged = uniqueStringList(servant.groupsManaged || []);
        const servantServedUserIdsFromGroups = [
          ...new Set(
            groupsManaged.flatMap((groupName) =>
              (form?.groupServedUsersByGroup?.[groupName] || []).map((user) => user?._id).filter(Boolean)
            )
          ),
        ];
        const pickedServedUserIds = (servant.servedUsers || []).map((user) => user?._id).filter(Boolean);
        const servedUserIds = [...new Set([...servantServedUserIdsFromGroups, ...pickedServedUserIds])];

        return {
          ...person,
          ...(String(servant.responsibility || '').trim() && {
            responsibility: String(servant.responsibility || '').trim(),
          }),
          groupsManaged,
          servedUserIds,
          ...(String(servant.notes || '').trim() && { notes: String(servant.notes || '').trim() }),
        };
      })
      .filter(Boolean);
  }

  if (includeCommittees) {
    payload.committees = (form.committees || [])
      .filter((committee) => String(committee.name || '').trim())
      .map((committee) => {
        const selectedMemberIds = (committee.members || []).map((user) => user?._id).filter(Boolean);
        const selectedMemberNames = (committee.members || [])
          .map((user) => String(user?.fullName || '').trim())
          .filter(Boolean);

        let details = {};
        if (String(committee.detailsText || '').trim()) {
          try {
            details = JSON.parse(String(committee.detailsText || '').trim());
          } catch {
            details = { text: String(committee.detailsText || '').trim() };
          }
        }

        return {
          name: String(committee.name || '').trim(),
          memberUserIds: selectedMemberIds.length > 0 ? selectedMemberIds : uniqueCsv(committee.memberUserIdsCsv),
          memberNames: uniqueStringList([...selectedMemberNames, ...uniqueCsv(committee.memberNamesCsv)]),
          details,
          ...(String(committee.notes || '').trim() && { notes: String(committee.notes || '').trim() }),
        };
      });
  }

  if (includeActivities) {
    payload.activities = (form.activities || [])
      .filter((activity) => String(activity.name || '').trim())
      .map((activity) => ({
        name: String(activity.name || '').trim(),
        type: activity.type || 'other',
        ...(toIsoDateTime(activity.scheduledAt) && { scheduledAt: toIsoDateTime(activity.scheduledAt) }),
        ...(String(activity.notes || '').trim() && { notes: String(activity.notes || '').trim() }),
      }));
  }

  return payload;
}
