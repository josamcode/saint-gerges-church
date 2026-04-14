import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { authApi, settingsApi } from '../../../api/endpoints';
import { mapFieldErrors, normalizeApiError } from '../../../api/errors';
import { useAuth } from '../../../auth/auth.hooks';
import UserFormSectionTabs from '../../../components/users/UserFormSectionTabs';
import Button from '../../../components/ui/Button';
import CreatableComboboxInput from '../../../components/ui/CreatableComboboxInput';
import CreatableTagComboboxInput from '../../../components/ui/CreatableTagComboboxInput';
import Input from '../../../components/ui/Input';
import PhoneInput from '../../../components/ui/PhoneInput';
import Select from '../../../components/ui/Select';
import TextArea from '../../../components/ui/TextArea';
import { getEducationStageOptions } from '../../../constants/education';
import {
  getEmploymentStatusOptions,
  getGenderOptions,
  getPresenceStatusOptions,
} from '../../../constants/householdProfiles';
import { useI18n } from '../../../i18n/i18n';
import { extractBirthDateFromNationalId } from '../../../utils/egyptianNationalId';

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{children}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

function QuestionLabel({ text, required, language }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>{text}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${required ? 'bg-danger/10 text-danger' : 'bg-surface-alt text-muted'}`}>
        {required ? (language === 'ar' ? 'مطلوب' : 'Required') : language === 'ar' ? 'اختياري' : 'Optional'}
      </span>
    </span>
  );
}

function normalizeOptionValues(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function guessGrandfatherName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 3) return parts[2];
  if (parts.length >= 2) return parts[parts.length - 1];
  return '';
}

const EASY_PASSWORD_WORDS = ['Grace', 'Olive', 'Peace', 'Light', 'Cedar', 'River', 'Hope', 'Amen'];
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_SPECIAL_CHARACTERS = '!@#$%^&*';
const PASSWORD_EXTRA_LOWERCASE = 'abcdefghjkmnpqrstuvwxyz';

function pickRandomCharacter(characters) {
  return characters[Math.floor(Math.random() * characters.length)];
}

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(String(password || ''));
}

function generateEasyPassword(fullName, nationalId) {
  const firstToken = String(fullName || '').trim().split(/\s+/).filter(Boolean)[0] || '';
  const latinFirstToken = firstToken.replace(/[^A-Za-z]/g, '');
  const fallbackWord = EASY_PASSWORD_WORDS[Math.floor(Math.random() * EASY_PASSWORD_WORDS.length)];
  const rawBase = latinFirstToken.length >= 3 ? latinFirstToken : fallbackWord;
  const normalizedBase = `${rawBase.charAt(0).toUpperCase()}${rawBase.slice(1).toLowerCase()}`;
  const base =
    normalizedBase.length >= 4
      ? normalizedBase.slice(0, 5)
      : `${normalizedBase}${fallbackWord.toLowerCase()}`.slice(0, 4);
  const digitSource = String(nationalId || '').replace(/\D/g, '');
  const suffix = (digitSource.slice(-3) || String(100 + Math.floor(Math.random() * 900))).padStart(3, '0');
  const specialSymbol = pickRandomCharacter(PASSWORD_SPECIAL_CHARACTERS);
  const trailingLowercase = pickRandomCharacter(PASSWORD_EXTRA_LOWERCASE);
  const password = `${base}${suffix}${specialSymbol}${trailingLowercase}`;

  if (password.length >= PASSWORD_MIN_LENGTH && isStrongPassword(password)) return password;
  return `Grace123!a`;
}

function normalizeRegisterErrors(details = []) {
  const raw = mapFieldErrors(details);
  const normalized = { ...raw };

  Object.entries(raw).forEach(([field, message]) => {
    const leaf = field.split('.').pop();
    if (leaf && !normalized[leaf]) normalized[leaf] = message;
  });

  return normalized;
}

function NameCombobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  hint,
  error,
}) {
  const [open, setOpen] = useState(false);
  const filtered = normalizeOptionValues(options)
    .filter((name) => !value || name.toLowerCase().includes(String(value).toLowerCase().trim()))
    .slice(0, 20);

  return (
    <div className="relative">
      {label ? <label className="mb-1.5 block text-sm font-medium text-base">{label}</label> : null}
      <input
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={`input-base w-full ${error ? 'border-danger focus:border-danger focus:ring-danger' : ''}`}
      />
      {open && filtered.length > 0 ? (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          {filtered.map((name) => (
            <li
              key={name}
              role="option"
              aria-selected={value === name}
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(name);
                setOpen(false);
              }}
              className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                value === name
                  ? 'bg-primary/8 font-semibold text-primary'
                  : 'text-heading hover:bg-primary/8 hover:text-primary'
              }`}
            >
              {name}
            </li>
          ))}
        </ul>
      ) : null}
      {hint && !error ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function getCopy(isArabic) {
  return isArabic
    ? {
        eyebrow: 'طلب مستخدم جديد',
        title: 'لننشئ طلب حسابك خطوة بخطوة',
        subtitle: 'أجب عن الأسئلة السريعة التالية. بعد الإرسال سيتم حفظ بياناتك كطلب قيد المراجعة، ولن تتمكن من تسجيل الدخول قبل الموافقة على الحساب.',
        disabledTitle: 'هل تريد إنشاء حساب الآن؟',
        disabledBody: 'التسجيل متوقف حاليًا من إعدادات النظام. يمكنك تسجيل الدخول إذا كان لديك حساب بالفعل، أو تصفح النظام أولًا.',
        successTitle: 'تم استلام طلبك',
        successBody: 'تم حفظ بياناتك كطلب مستخدم جديد قيد المراجعة. احتفظ بكلمة المرور جيدًا، وستتمكن من تسجيل الدخول بعد اعتماد الحساب.',
        loginNotice: 'طلب حسابك ما زال قيد المراجعة. ستتمكن من تسجيل الدخول بعد الموافقة عليه.',
        remember: 'احفظ كلمة المرور جيدًا لأنك ستستخدمها لاحقًا بمجرد الموافقة على الحساب.',
        generatedPassword: 'تم إنشاء كلمة مرور آمنة تستوفي الشروط وإضافتها في الحقلين.',
        back: 'السابق',
        next: 'التالي',
        submit: 'إرسال الطلب',
        login: 'هل لديك حساب بالفعل؟',
        browse: 'هل تريد تصفح النظام أولًا؟',
        toLogin: 'الذهاب إلى صفحة الدخول',
        toHome: 'العودة إلى الرئيسية',
        generatePassword: 'أنشئ كلمة مرور آمنة لي',
        submitHint: 'زر الإرسال يظل معطلًا حتى تصل إلى الخطوة الأخيرة وتكمل كل الحقول المطلوبة.',
        steps: [
          { id: 'identity', label: 'من أنت؟' },
          { id: 'contact', label: 'كيف يمكننا الوصول إليك؟' },
          { id: 'profile', label: 'ما وضعك الحالي؟' },
          { id: 'security', label: 'كيف نحمي حسابك؟' },
        ],
        q: {
          fullName: 'ما اسمك الكامل؟',
          nationalId: 'ما الرقم القومي الخاص بك؟',
          birthDate: 'ما تاريخ ميلادك؟',
          gender: 'ما نوعك؟',
          familyName: 'ما اسم العائلة؟',
          houseName: 'ما اسم البيت أو الأسرة؟',
          phonePrimary: 'ما رقم الهاتف الأساسي الخاص بك؟',
          governorate: 'في أي محافظة تسكن؟',
          city: 'في أي مدينة أو قرية تسكن؟',
          whatsappNumber: 'ما رقم الواتساب الخاص بك؟',
          phoneSecondary: 'هل لديك رقم هاتف إضافي؟',
          email: 'ما بريدك الإلكتروني؟',
          street: 'ما الشارع أو المنطقة التي تسكن فيها؟',
          details: 'هل تريد إضافة تفاصيل أخرى للعنوان؟',
          educationStage: 'ما المرحلة التعليمية التي أنت فيها؟',
          employmentStatus: 'ما حالتك الحالية من جهة العمل؟',
          presenceStatus: 'هل أنت موجود حاليًا أم مسافر؟',
          travelDestination: 'إلى أين تسافر الآن؟',
          travelReason: 'ما سبب السفر؟',
          healthConditions: 'هل لديك أي حالات صحية أو أمراض نحتاج أن نعرفها؟',
          notes: 'هل تريد إضافة أي ملاحظات أخرى؟',
          password: 'ما كلمة المرور التي تريد استخدامها؟',
          confirmPassword: 'هل يمكنك كتابة كلمة المرور مرة أخرى؟',
        },
        hints: {
          nationalId: 'إذا كتبت الرقم القومي سنحاول تعبئة تاريخ الميلاد تلقائيًا.',
          familyName: 'يمكنك الاختيار من أسماء العائلات الموجودة أو كتابة اسم جديد.',
          houseName: 'سنبدأ باسم الجد تلقائيًا، ويمكنك تغييره بالاختيار من النظام أو بالكتابة.',
          whatsappNumber: 'سننسخ رقم الهاتف الأساسي هنا تلقائيًا حتى تغيّره بنفسك.',
          travelDestination: 'يمكنك الاختيار من الوجهات المسجلة أو كتابة وجهة جديدة.',
          travelReason: 'يمكنك الاختيار من الأسباب المسجلة أو كتابة سبب جديد.',
          healthConditions: 'اختر من الحالات الصحية الموجودة أو اكتب حالة جديدة ثم أضفها.',
          password: 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل، وتتضمن حرفًا كبيرًا وحرفًا صغيرًا ورقمًا ورمزًا خاصًا.',
        },
      }
    : {
        eyebrow: 'New User Request',
        title: 'Let us build your account request step by step',
        subtitle: 'Answer these quick questions. After submission, your information will be saved as a pending request, and you will not be able to sign in before approval.',
        disabledTitle: 'Would you like to create an account now?',
        disabledBody: 'Registration is currently disabled from the system settings. You can sign in if you already have an account, or browse the system first.',
        successTitle: 'Your request was received',
        successBody: 'Your information was saved as a pending user request. Please remember your password carefully. You will be able to sign in after your account is approved.',
        loginNotice: 'Your account request is still pending review. Please sign in after approval.',
        remember: 'Please remember this password carefully because you will use it later once your account is approved.',
        generatedPassword: 'A secure password that meets the rules was generated and added to both fields.',
        back: 'Back',
        next: 'Next',
        submit: 'Submit Request',
        login: 'Do you already have an account?',
        browse: 'Do you want to browse the system first?',
        toLogin: 'Go to the sign-in page',
        toHome: 'Return to the home page',
        generatePassword: 'Generate a secure password for me',
        submitHint: 'The submit button stays disabled until you reach the last step and complete every required field.',
        steps: [
          { id: 'identity', label: 'Who are you?' },
          { id: 'contact', label: 'How can we reach you?' },
          { id: 'profile', label: 'What is your current situation?' },
          { id: 'security', label: 'How should we protect your account?' },
        ],
        q: {
          fullName: 'What is your full name?',
          nationalId: 'What is your national ID number?',
          birthDate: 'What is your date of birth?',
          gender: 'What is your gender?',
          familyName: 'What is your family name?',
          houseName: 'What is your household name?',
          phonePrimary: 'What is your primary phone number?',
          governorate: 'Which governorate do you live in?',
          city: 'Which city or village do you live in?',
          whatsappNumber: 'What is your WhatsApp number?',
          phoneSecondary: 'Do you have another phone number?',
          email: 'What is your email address?',
          street: 'What street or area do you live in?',
          details: 'Would you like to add extra address details?',
          educationStage: 'What stage of education are you in?',
          employmentStatus: 'What is your current employment status?',
          presenceStatus: 'Are you currently present or traveling?',
          travelDestination: 'Where are you traveling now?',
          travelReason: 'Why are you traveling?',
          healthConditions: 'Do you have any health conditions we should know about?',
          notes: 'Would you like to add any other notes?',
          password: 'What password would you like to use?',
          confirmPassword: 'Can you type your password again?',
        },
        hints: {
          nationalId: 'If you enter your national ID, we will try to fill your birth date automatically.',
          familyName: 'You can choose an existing family name from the system or type a new one.',
          houseName: 'We start with your grandfather name automatically, and you can change it by choosing from the system or typing.',
          whatsappNumber: 'We copy your primary phone here until you change it yourself.',
          travelDestination: 'Choose a saved destination or type a new one.',
          travelReason: 'Choose a saved reason or type a new one.',
          healthConditions: 'Choose saved health conditions or type a new one, then add it.',
          password: 'Use at least 8 characters with an uppercase letter, a lowercase letter, a number, and a special symbol.',
        },
      };
}

function stepComplete(stepId, form) {
  if (stepId === 'identity') return Boolean(form.fullName.trim() && form.birthDate && form.gender);
  if (stepId === 'contact') return Boolean(form.phonePrimary.trim() && form.governorate.trim() && form.city.trim());
  if (stepId === 'profile') return true;
  if (stepId === 'security') return Boolean(isStrongPassword(form.password) && form.confirmPassword && form.password === form.confirmPassword);
  return false;
}

export default function UserRegisterPage() {
  const { language } = useI18n();
  const isArabic = language === 'ar';
  const copy = useMemo(() => getCopy(isArabic), [isArabic]);
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    nationalId: '',
    birthDate: '',
    gender: 'male',
    familyName: '',
    houseName: '',
    phonePrimary: '',
    governorate: 'المنيا',
    city: 'القطوشة',
    whatsappNumber: '',
    phoneSecondary: '',
    email: '',
    street: '',
    details: '',
    educationStage: '',
    employmentStatus: '',
    presenceStatus: '',
    travelDestination: '',
    travelReason: '',
    healthConditions: [],
    notes: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [activeStep, setActiveStep] = useState(copy.steps[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [whatsappNumberTouched, setWhatsappNumberTouched] = useState(false);
  const [houseNameTouched, setHouseNameTouched] = useState(false);

  useEffect(() => {
    if (!copy.steps.some((step) => step.id === activeStep)) {
      setActiveStep(copy.steps[0].id);
    }
  }, [activeStep, copy.steps]);

  const settingsQuery = useQuery({
    queryKey: ['settings', 'public-site'],
    queryFn: async () => (await settingsApi.getPublicSite()).data?.data || null,
    staleTime: 60000,
  });
  const registrationEnabled = settingsQuery.data?.registrationEnabled !== false;

  const registrationOptionsQuery = useQuery({
    queryKey: ['auth', 'register-options'],
    queryFn: async () => (await authApi.getRegistrationOptions()).data?.data || {},
    staleTime: 60000,
    enabled: registrationEnabled,
  });

  const familyNames = useMemo(
    () => normalizeOptionValues(registrationOptionsQuery.data?.familyNames),
    [registrationOptionsQuery.data?.familyNames],
  );
  const houseNames = useMemo(
    () => normalizeOptionValues(registrationOptionsQuery.data?.houseNames),
    [registrationOptionsQuery.data?.houseNames],
  );
  const profileOptionValues = useMemo(
    () => ({
      travelDestinations: normalizeOptionValues(registrationOptionsQuery.data?.profileOptionValues?.travelDestinations),
      travelReasons: normalizeOptionValues(registrationOptionsQuery.data?.profileOptionValues?.travelReasons),
      healthConditions: normalizeOptionValues(registrationOptionsQuery.data?.profileOptionValues?.healthConditions),
    }),
    [registrationOptionsQuery.data?.profileOptionValues],
  );

  const activeIndex = copy.steps.findIndex((step) => step.id === activeStep);
  const previousStep = activeIndex > 0 ? copy.steps[activeIndex - 1] : null;
  const nextStep = activeIndex < copy.steps.length - 1 ? copy.steps[activeIndex + 1] : null;
  const highestUnlocked = useMemo(() => {
    let index = 0;
    while (index < copy.steps.length - 1 && stepComplete(copy.steps[index].id, form)) index += 1;
    return index;
  }, [copy.steps, form]);
  const canSubmit = activeStep === copy.steps[copy.steps.length - 1].id && copy.steps.every((step) => stepComplete(step.id, form));

  const genderOptions = useMemo(() => getGenderOptions(language), [language]);
  const educationOptions = useMemo(() => getEducationStageOptions(language), [language]);
  const employmentOptions = useMemo(() => getEmploymentStatusOptions(language), [language]);
  const presenceOptions = useMemo(() => getPresenceStatusOptions(language), [language]);

  const update = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'phonePrimary' && !whatsappNumberTouched) {
        next.whatsappNumber = value;
      }

      if (field === 'nationalId') {
        const previousBirthDateFromId = extractBirthDateFromNationalId(prev.nationalId);
        const nextBirthDateFromId = extractBirthDateFromNationalId(value);
        if (nextBirthDateFromId && (!prev.birthDate || prev.birthDate === previousBirthDateFromId)) {
          next.birthDate = nextBirthDateFromId;
        }
      }

      if (field === 'fullName' && !houseNameTouched) {
        const previousAutoHouseName = guessGrandfatherName(prev.fullName);
        const nextAutoHouseName = guessGrandfatherName(value);
        if (!prev.houseName || prev.houseName === previousAutoHouseName) {
          next.houseName = nextAutoHouseName;
        }
      }

      if (field === 'presenceStatus' && value !== 'traveling') {
        next.travelDestination = '';
        next.travelReason = '';
      }

      return next;
    });

    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
      ...(field === 'nationalId' ? { birthDate: undefined } : {}),
      ...(field === 'presenceStatus' ? { travelDestination: undefined, travelReason: undefined } : {}),
    }));

    if (field === 'whatsappNumber') setWhatsappNumberTouched(true);
    if (field === 'houseName') setHouseNameTouched(true);
  };

  const validateStep = (stepId) => {
    const nextErrors = {};

    if (stepId === 'identity') {
      if (!form.fullName.trim()) nextErrors.fullName = copy.q.fullName;
      if (!form.birthDate) nextErrors.birthDate = copy.q.birthDate;
      if (!form.gender) nextErrors.gender = copy.q.gender;
    }

    if (stepId === 'contact') {
      if (!form.phonePrimary.trim()) nextErrors.phonePrimary = copy.q.phonePrimary;
      if (!form.governorate.trim()) nextErrors.governorate = copy.q.governorate;
      if (!form.city.trim()) nextErrors.city = copy.q.city;
    }

    if (stepId === 'security') {
      if (!form.password) nextErrors.password = copy.q.password;
      if (form.password && !isStrongPassword(form.password)) nextErrors.password = copy.hints.password;
      if (!form.confirmPassword) nextErrors.confirmPassword = copy.q.confirmPassword;
      if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
        nextErrors.confirmPassword = isArabic ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match';
      }
    }

    return nextErrors;
  };

  const validateAll = () => ({
    ...validateStep('identity'),
    ...validateStep('contact'),
    ...validateStep('security'),
  });

  const buildPayload = () => {
    const payload = {
      fullName: form.fullName.trim(),
      birthDate: form.birthDate,
      gender: form.gender,
      phonePrimary: form.phonePrimary.trim(),
      password: form.password,
    };

    ['nationalId', 'familyName', 'houseName', 'whatsappNumber', 'phoneSecondary', 'email', 'notes'].forEach((field) => {
      const value = String(form[field] || '').trim();
      if (value) payload[field] = value;
    });

    if (form.governorate.trim() || form.city.trim() || form.street.trim() || form.details.trim()) {
      payload.address = {};
      ['governorate', 'city', 'street', 'details'].forEach((field) => {
        const value = String(form[field] || '').trim();
        if (value) payload.address[field] = value;
      });
    }

    if (form.educationStage) payload.education = { stage: form.educationStage };
    if (form.employmentStatus) payload.employment = { status: form.employmentStatus };

    if (form.presenceStatus || form.travelDestination.trim() || form.travelReason.trim()) {
      payload.presence = {
        status: form.presenceStatus === 'traveling' ? 'traveling' : 'present',
      };
      if (form.presenceStatus === 'traveling' && form.travelDestination.trim()) {
        payload.presence.travelDestination = form.travelDestination.trim();
      }
      if (form.presenceStatus === 'traveling' && form.travelReason.trim()) {
        payload.presence.travelReason = form.travelReason.trim();
      }
    }

    const healthConditions = [...new Set((form.healthConditions || []).map((entry) => String(entry || '').trim()).filter(Boolean))];
    if (healthConditions.length > 0) {
      payload.health = {
        conditions: healthConditions.map((name) => ({ name })),
      };
    }

    return payload;
  };

  const goNext = () => {
    if (!nextStep) return;
    const nextErrors = validateStep(activeStep);
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    if (Object.keys(nextErrors).length > 0) return;
    setActiveStep(nextStep.id);
  };

  const handleGeneratePassword = () => {
    const password = generateEasyPassword(form.fullName, form.nationalId);
    setForm((prev) => ({ ...prev, password, confirmPassword: password }));
    setErrors((prev) => ({ ...prev, password: undefined, confirmPassword: undefined }));
    toast.success(copy.generatedPassword);
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validateAll();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !registrationEnabled || !canSubmit) return;

    setSubmitting(true);
    try {
      await register(buildPayload());
      setSubmitted(true);
    } catch (error) {
      const normalized = normalizeApiError(error);
      if (normalized.code === 'VALIDATION_ERROR') {
        setErrors(normalizeRegisterErrors(normalized.details));
      }
      toast.error(normalized.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (settingsQuery.isLoading) {
    return <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-border bg-surface text-muted">{isArabic ? 'جارٍ تجهيز النموذج...' : 'Preparing the form...'}</div>;
  }

  if (!registrationEnabled) {
    return (
      <div className="mx-auto max-w-3xl rounded-[28px] border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><AlertCircle className="h-6 w-6" /></div>
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-heading">{copy.disabledTitle}</h1>
            <p className="text-sm leading-7 text-muted">{copy.disabledBody}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/auth/login"><Button>{copy.login}</Button></Link>
              <Link to="/"><Button variant="outline">{copy.browse}</Button></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-3xl rounded-[28px] border border-success/20 bg-success-light/40 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success text-white"><CheckCircle2 className="h-6 w-6" /></div>
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-heading">{copy.successTitle}</h1>
            <p className="text-sm leading-7 text-muted">{copy.successBody}</p>
            <div className="rounded-2xl border border-success/20 bg-surface px-4 py-4 text-sm text-heading">
              <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-success" /><p>{copy.remember}</p></div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => navigate('/auth/login', { state: { notice: copy.loginNotice } })}>{copy.toLogin}</Button>
              <Link to="/"><Button variant="outline">{copy.toHome}</Button></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-[28px] border border-border bg-surface px-5 py-6 shadow-card sm:px-7 sm:py-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">{copy.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-heading sm:text-4xl">{copy.title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">{copy.subtitle}</p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <UserFormSectionTabs
          sections={copy.steps.map((step, index) => ({ ...step, step: index + 1 }))}
          activeSection={activeStep}
          onChange={(stepId) => copy.steps.findIndex((step) => step.id === stepId) <= highestUnlocked && setActiveStep(stepId)}
        />

        <section className="space-y-4">
          <SectionLabel>{copy.steps[activeIndex].label}</SectionLabel>
          <div className="rounded-[28px] border border-border bg-surface p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {activeStep === 'identity' ? (
                <>
                  <Input
                    label={<QuestionLabel text={copy.q.fullName} required language={language} />}
                    value={form.fullName}
                    onChange={(event) => update('fullName', event.target.value)}
                    error={errors.fullName}
                    autoFocus
                  />
                  <Input
                    label={<QuestionLabel text={copy.q.nationalId} language={language} />}
                    value={form.nationalId}
                    onChange={(event) => update('nationalId', event.target.value)}
                    error={errors.nationalId}
                    hint={copy.hints.nationalId}
                    dir="ltr"
                    className="text-left"
                  />
                  <Input
                    label={<QuestionLabel text={copy.q.birthDate} required language={language} />}
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => update('birthDate', event.target.value)}
                    error={errors.birthDate}
                    dir="ltr"
                    className="text-left"
                  />
                  <Select
                    label={<QuestionLabel text={copy.q.gender} required language={language} />}
                    options={genderOptions}
                    value={form.gender}
                    onChange={(event) => update('gender', event.target.value)}
                    error={errors.gender}
                    placeholder={copy.q.gender}
                    containerClassName="!mb-0"
                  />
                  <div className="md:col-span-2">
                    <NameCombobox
                      label={<QuestionLabel text={copy.q.familyName} language={language} />}
                      value={form.familyName}
                      onChange={(value) => update('familyName', value)}
                      options={familyNames}
                      placeholder={copy.q.familyName}
                      hint={copy.hints.familyName}
                      error={errors.familyName}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <NameCombobox
                      label={<QuestionLabel text={copy.q.houseName} language={language} />}
                      value={form.houseName}
                      onChange={(value) => update('houseName', value)}
                      options={houseNames}
                      placeholder={copy.q.houseName}
                      hint={copy.hints.houseName}
                      error={errors.houseName}
                    />
                  </div>
                </>
              ) : null}

              {activeStep === 'contact' ? (
                <>
                  <PhoneInput
                    label={<QuestionLabel text={copy.q.phonePrimary} required language={language} />}
                    value={form.phonePrimary}
                    onChange={(event) => update('phonePrimary', event.target.value)}
                    error={errors.phonePrimary}
                  />
                  <Input
                    label={<QuestionLabel text={copy.q.governorate} required language={language} />}
                    value={form.governorate}
                    onChange={(event) => update('governorate', event.target.value)}
                    error={errors.governorate}
                  />
                  <Input
                    label={<QuestionLabel text={copy.q.city} required language={language} />}
                    value={form.city}
                    onChange={(event) => update('city', event.target.value)}
                    error={errors.city}
                  />
                  <PhoneInput
                    label={<QuestionLabel text={copy.q.whatsappNumber} language={language} />}
                    value={form.whatsappNumber}
                    onChange={(event) => update('whatsappNumber', event.target.value)}
                    hint={copy.hints.whatsappNumber}
                  />
                  <PhoneInput
                    label={<QuestionLabel text={copy.q.phoneSecondary} language={language} />}
                    value={form.phoneSecondary}
                    onChange={(event) => update('phoneSecondary', event.target.value)}
                  />
                  <Input
                    label={<QuestionLabel text={copy.q.email} language={language} />}
                    type="email"
                    value={form.email}
                    onChange={(event) => update('email', event.target.value)}
                    error={errors.email}
                    dir="ltr"
                    className="text-left"
                  />
                  <Input
                    label={<QuestionLabel text={copy.q.street} language={language} />}
                    value={form.street}
                    onChange={(event) => update('street', event.target.value)}
                  />
                  <Input
                    label={<QuestionLabel text={copy.q.details} language={language} />}
                    value={form.details}
                    onChange={(event) => update('details', event.target.value)}
                  />
                </>
              ) : null}
              {activeStep === 'profile' ? (
                <>
                  <Select
                    label={<QuestionLabel text={copy.q.educationStage} language={language} />}
                    options={educationOptions}
                    value={form.educationStage}
                    onChange={(event) => update('educationStage', event.target.value)}
                    placeholder={copy.q.educationStage}
                    containerClassName="!mb-0 md:col-span-2"
                  />
                  <Select
                    label={<QuestionLabel text={copy.q.employmentStatus} language={language} />}
                    options={employmentOptions}
                    value={form.employmentStatus}
                    onChange={(event) => update('employmentStatus', event.target.value)}
                    placeholder={copy.q.employmentStatus}
                    containerClassName="!mb-0"
                  />
                  <Select
                    label={<QuestionLabel text={copy.q.presenceStatus} language={language} />}
                    options={presenceOptions}
                    value={form.presenceStatus}
                    onChange={(event) => update('presenceStatus', event.target.value)}
                    placeholder={copy.q.presenceStatus}
                    containerClassName="!mb-0"
                  />
                  {form.presenceStatus === 'traveling' ? (
                    <>
                      <CreatableComboboxInput
                        label={<QuestionLabel text={copy.q.travelDestination} language={language} />}
                        options={profileOptionValues.travelDestinations}
                        value={form.travelDestination}
                        onChange={(value) => update('travelDestination', value)}
                        error={errors.travelDestination}
                        hint={copy.hints.travelDestination}
                        placeholder={copy.q.travelDestination}
                        containerClassName="!mb-0"
                      />
                      <CreatableComboboxInput
                        label={<QuestionLabel text={copy.q.travelReason} language={language} />}
                        options={profileOptionValues.travelReasons}
                        value={form.travelReason}
                        onChange={(value) => update('travelReason', value)}
                        error={errors.travelReason}
                        hint={copy.hints.travelReason}
                        placeholder={copy.q.travelReason}
                        containerClassName="!mb-0"
                      />
                    </>
                  ) : null}
                  <div className="md:col-span-2">
                    <CreatableTagComboboxInput
                      label={<QuestionLabel text={copy.q.healthConditions} language={language} />}
                      values={form.healthConditions}
                      onChange={(next) => update('healthConditions', next)}
                      error={errors.healthConditions}
                      hint={copy.hints.healthConditions}
                      suggestions={profileOptionValues.healthConditions}
                      placeholder={copy.q.healthConditions}
                      containerClassName="!mb-0"
                    />
                  </div>
                  <TextArea
                    label={<QuestionLabel text={copy.q.notes} language={language} />}
                    value={form.notes}
                    onChange={(event) => update('notes', event.target.value)}
                    containerClassName="!mb-0 md:col-span-2"
                  />
                </>
              ) : null}

              {activeStep === 'security' ? (
                <>
                  <div className="md:col-span-2 flex flex-col gap-3 rounded-2xl border border-primary/15 bg-primary/6 px-4 py-4 text-sm text-heading sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <p>{copy.remember}</p>
                        <p className="mt-1 text-xs text-muted">{copy.hints.password}</p>
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleGeneratePassword}>
                      {copy.generatePassword}
                    </Button>
                  </div>
                  <Input
                    label={<QuestionLabel text={copy.q.password} required language={language} />}
                    type="password"
                    value={form.password}
                    onChange={(event) => update('password', event.target.value)}
                    error={errors.password}
                    dir="ltr"
                    className="text-left"
                  />
                  <Input
                    label={<QuestionLabel text={copy.q.confirmPassword} required language={language} />}
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) => update('confirmPassword', event.target.value)}
                    error={errors.confirmPassword}
                    dir="ltr"
                    className="text-left"
                  />
                </>
              ) : null}
            </div>
          </div>
        </section>

        <div className="rounded-[28px] border border-border bg-surface px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 gap-2">
              <Button type="button" variant="ghost" onClick={() => previousStep && setActiveStep(previousStep.id)} disabled={!previousStep}>{copy.back}</Button>
              <Button type="button" variant="outline" onClick={goNext} disabled={!nextStep}>{copy.next}</Button>
            </div>
            <div className="flex flex-col items-start gap-2 lg:items-end">
              <Button type="submit" loading={submitting} disabled={!canSubmit}>{copy.submit}</Button>
              <p className="text-xs text-muted">{copy.submitHint}</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
