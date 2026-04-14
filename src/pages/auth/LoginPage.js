import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, Lock } from 'lucide-react';
import { useAuth } from '../../auth/auth.hooks';
import { normalizeApiError, mapFieldErrors } from '../../api/errors';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { useI18n } from '../../i18n/i18n';

export default function LoginPage() {
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(null);
  const [accountNotice, setAccountNotice] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (location.state?.notice) {
      setAccountNotice(location.state.notice);
    }
  }, [location.state]);

  const validate = () => {
    const errs = {};
    if (!identifier.trim()) errs.identifier = t('auth.identifierRequired');
    if (!password) errs.password = t('auth.passwordRequired');
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLocked(null);
    setAccountNotice(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await login(identifier, password);
      toast.success(t('auth.loginSuccess'));
      navigate(from, { replace: true });
    } catch (err) {
      const normalized = normalizeApiError(err);

      if (normalized.code === 'VALIDATION_ERROR') {
        setErrors(mapFieldErrors(normalized.details));
      } else if (normalized.code === 'AUTH_ACCOUNT_LOCKED') {
        setLocked(normalized.message);
      } else if (
        normalized.code === 'AUTH_ACCOUNT_PENDING' ||
        normalized.code === 'AUTH_ACCOUNT_REJECTED' ||
        normalized.code === 'AUTH_REGISTRATION_DISABLED'
      ) {
        setAccountNotice(normalized.message);
      } else {
        toast.error(normalized.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-heading">{t('auth.title')}</h2>
        <p className="text-sm text-muted mt-1">{t('auth.subtitle')}</p>
      </div>

      {locked && (
        <div className="bg-danger-light border border-danger/20 rounded-lg p-4 mb-4 text-sm text-danger">
          <p className="font-semibold mb-1">{t('auth.lockedTitle')}</p>
          <p>{locked}</p>
          <p className="mt-2 text-xs">{t('auth.lockedHint')}</p>
        </div>
      )}

      {accountNotice && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4 text-sm text-primary">
          <p className="font-semibold mb-1">حالة الحساب</p>
          <p>{accountNotice}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label={t('auth.identifierLabel')}
          placeholder="01xxxxxxxxx"
          icon={Phone}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={errors.identifier}
          required
          autoFocus
          dir="ltr"
          className="text-left"
        />

        <Input
          label={t('auth.passwordLabel')}
          type="password"
          placeholder={t('auth.passwordLabel')}
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
          dir="ltr"
          className="text-left"
        />

        <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
          {t('auth.submit')}
        </Button>
      </form>
    </div>
  );
}
