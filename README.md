# نظام إدارة الكنيسة - الواجهة الأمامية

## نظرة عامة

الواجهة الأمامية لنظام إدارة كنيسة مار جرجس بسيلة الغربية - قرية القطوشة - التابعة لإيبارشية مطاى.

مبنية باستخدام:

- **React 19** — المكتبة الأساسية
- **React Router 7** — التوجيه
- **TanStack Query** — إدارة حالة الخادم والتخزين المؤقت
- **Tailwind CSS** — التنسيق
- **Axios** — طلبات HTTP
- **Lucide React** — الأيقونات

جميع النصوص والرسائل **بالعربية** مع دعم كامل لـ **RTL**.

---

## المتطلبات

- Node.js 18+
- الخادم الخلفي يعمل على `http://localhost:5000`

---

## التثبيت والتشغيل

### 1. تثبيت المكتبات

```bash
cd frontend
npm install
```

### 2. إعداد متغيرات البيئة

```bash
cp .env.example .env
```

عدّل `REACT_APP_API_URL` إذا كان الخادم على عنوان مختلف.

### 3. تشغيل التطوير

```bash
npm start
```

التطبيق يعمل على `http://localhost:3000`

### 4. بناء الإنتاج

```bash
npm run build
```

---

## هيكل المشروع

```
src/
├── app/
│   ├── App.js          # المكون الجذري
│   ├── router.js       # خريطة المسارات
│   └── providers.js    # مزودو السياق (Query, Auth, Theme, Toast)
├── api/
│   ├── client.js       # عميل Axios مع interceptors
│   ├── endpoints.js    # دوال الاتصال بالخادم
│   └── errors.js       # تطبيع الأخطاء
├── auth/
│   ├── auth.store.js   # تخزين الرموز والصلاحيات
│   ├── auth.hooks.js   # AuthProvider + useAuth
│   └── guards.js       # AuthGuard, PermissionGuard, GuestGuard
├── components/
│   ├── ui/             # مكونات واجهة قابلة لإعادة الاستخدام
│   └── layout/         # التخطيطات (عام، مصادقة، لوحة التحكم)
├── pages/
│   ├── public/         # الصفحات العامة (الصفحة الرئيسية)
│   ├── auth/           # صفحات المصادقة (تسجيل الدخول)
│   ├── dashboard/      # صفحات لوحة التحكم
│   └── shared/         # صفحات مشتركة (404، قيد التطوير)
├── styles/
│   ├── tokens.css      # متغيرات CSS للألوان والسمات
│   └── globals.css     # الأنماط العامة
└── utils/
    └── formatters.js   # تنسيق التواريخ والهاتف والثوابت
```

---

## نظام السمات (Theming)

### تغيير الألوان

عدّل ملف `src/styles/tokens.css` لتغيير أي لون:

```css
:root {
  --color-primary: #1e3a5f; /* اللون الأساسي */
  --color-secondary: #b8860b; /* اللون الثانوي */
  --color-danger: #dc2626; /* لون الخطر */
  /* ... */
}
```

### الوضع الداكن

يعمل بنظام `class` على عنصر `html`:

- يحفظ التفضيل في `localStorage`
- يمكن تبديله من القائمة الجانبية في لوحة التحكم

---

## المسارات

### عامة (بدون مصادقة)

| المسار        | الصفحة          |
| ------------- | --------------- |
| `/`           | الصفحة الرئيسية |
| `/auth/login` | تسجيل الدخول    |
| `/404`        | صفحة غير موجودة |

### محمية (تتطلب مصادقة)

| المسار                         | الصلاحية المطلوبة | الصفحة           |
| ------------------------------ | ----------------- | ---------------- |
| `/dashboard`                   | -                 | لوحة التحكم      |
| `/dashboard/profile`           | `AUTH_VIEW_SELF`  | الملف الشخصي     |
| `/dashboard/users`             | `USERS_VIEW`      | قائمة المستخدمين |
| `/dashboard/users/new`         | `USERS_CREATE`    | إضافة مستخدم     |
| `/dashboard/users/:id`         | `USERS_VIEW`      | تفاصيل المستخدم  |
| `/dashboard/users/:id/edit`    | `USERS_UPDATE`    | تعديل المستخدم   |
| `/dashboard/under-development` | -                 | قيد التطوير      |

---

## التكامل مع الخادم

### عميل API

ملف `src/api/client.js` يحتوي على:

- إضافة رمز المصادقة تلقائياً لكل طلب
- تحديث الرمز تلقائياً عند الانتهاء (Silent Refresh)
- معالجة الطلبات المعلقة أثناء التحديث (Queue)

### معالجة الأخطاء

- أخطاء التحقق تُعرض على مستوى الحقول
- أخطاء الصلاحيات تعرض رسالة واضحة
- أخطاء الشبكة تعرض إشعار مناسب
- كل خطأ يحتوي على `requestId` للتتبع

---

## المكونات القابلة لإعادة الاستخدام

| المكون          | الموقع             | الوصف                                 |
| --------------- | ------------------ | ------------------------------------- |
| `Button`        | `ui/Button`        | أزرار بأنواع ومقاسات متعددة           |
| `Input`         | `ui/Input`         | حقل إدخال مع تسمية وأيقونة ورسالة خطأ |
| `Select`        | `ui/Select`        | قائمة منسدلة                          |
| `TextArea`      | `ui/TextArea`      | حقل نص متعدد الأسطر                   |
| `Table`         | `ui/Table`         | جدول مع ترتيب وحالة فارغة وهيكل تحميل |
| `Modal`         | `ui/Modal`         | نافذة منبثقة                          |
| `Card`          | `ui/Card`          | بطاقة محتوى                           |
| `Badge`         | `ui/Badge`         | شارة/وسم                              |
| `Tabs`          | `ui/Tabs`          | تبويبات                               |
| `Breadcrumbs`   | `ui/Breadcrumbs`   | مسار التنقل                           |
| `Pagination`    | `ui/Pagination`    | ترقيم المؤشر                          |
| `SearchInput`   | `ui/SearchInput`   | بحث مع تأخير                          |
| `Skeleton`      | `ui/Skeleton`      | هياكل تحميل                           |
| `EmptyState`    | `ui/EmptyState`    | حالة فارغة                            |
| `Tooltip`       | `ui/Tooltip`       | تلميح                                 |
| `Switch`        | `ui/Switch`        | مفتاح تبديل                           |
| `ErrorBoundary` | `ui/ErrorBoundary` | معالج الأخطاء العام                   |

---

## الترخيص

ISC
