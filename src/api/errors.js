export const ERROR_MESSAGES = {
  AUTH_INVALID_CREDENTIALS: 'بيانات تسجيل الدخول غير صحيحة',
  AUTH_ACCOUNT_LOCKED: 'الحساب مغلق. يرجى التواصل مع المسؤول',
  AUTH_ACCOUNT_PENDING: 'تم استلام طلب حسابك وهو الآن بانتظار المراجعة والموافقة',
  AUTH_ACCOUNT_REJECTED: 'تم رفض طلب الحساب حاليًا. يمكنك التواصل مع الإدارة لمعرفة التفاصيل',
  AUTH_NO_LOGIN_ACCESS: 'هذا الحساب لا يملك صلاحية تسجيل الدخول',
  AUTH_REGISTRATION_DISABLED: 'إنشاء حسابات جديدة متوقف حاليًا. يرجى المحاولة لاحقًا أو التواصل مع الإدارة',
  AUTH_TOKEN_EXPIRED: 'انتهت صلاحية الجلسة',
  AUTH_UNAUTHORIZED: 'يجب تسجيل الدخول أولًا',
  PERMISSION_DENIED: 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
  RESOURCE_NOT_FOUND: 'المورد المطلوب غير موجود',
  USER_NOT_FOUND: 'المستخدم غير موجود',
  VALIDATION_ERROR: 'خطأ في البيانات المدخلة',
  DUPLICATE_PHONE: 'رقم الهاتف مسجل مسبقًا',
  DUPLICATE_EMAIL: 'البريد الإلكتروني مسجل مسبقًا',
  DUPLICATE_NATIONAL_ID: 'الرقم القومي مسجل مسبقًا',
  RATE_LIMITED: 'تم تجاوز الحد المسموح من الطلبات. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى',
  UPLOAD_FAILED: 'فشل رفع الملف',
  UPLOAD_FILE_TOO_LARGE: 'حجم الملف يتجاوز الحد المسموح',
  UPLOAD_INVALID_TYPE: 'نوع الملف غير مسموح به',
  INTERNAL_ERROR: 'حدث خطأ داخلي في الخادم',
  NETWORK_ERROR: 'حدث خطأ في الاتصال بالخادم',
};

export function normalizeApiError(error) {
  if (!error.response) {
    return {
      message: ERROR_MESSAGES.NETWORK_ERROR,
      code: 'NETWORK_ERROR',
      statusCode: 0,
      details: null,
      requestId: null,
    };
  }

  const data = error.response.data;
  const code = data?.error?.code || 'UNKNOWN_ERROR';

  return {
    message: ERROR_MESSAGES[code] || data?.message || 'حدث خطأ غير متوقع',
    code,
    statusCode: error.response.status,
    details: data?.error?.details || null,
    requestId: data?.requestId || null,
  };
}

export function mapFieldErrors(details) {
  if (!details || !Array.isArray(details)) return {};
  const errors = {};
  details.forEach((d) => {
    const field = d.field?.replace('body.', '').replace('query.', '').replace('params.', '');
    if (field) {
      errors[field] = d.message;
    }
  });
  return errors;
}
