import { useId, useMemo } from 'react';
import Input from './Input';

function normalizeOptions(options = []) {
  return [...new Set((Array.isArray(options) ? options : [])
    .map((option) => String(option || '').trim())
    .filter(Boolean))];
}

export default function CreatableDatalistInput({ options = [], ...props }) {
  const listId = useId();
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const shouldRenderList = normalizedOptions.length > 0;

  return (
    <>
      <Input {...props} list={shouldRenderList ? listId : undefined} />
      {shouldRenderList ? (
        <datalist id={listId}>
          {normalizedOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ) : null}
    </>
  );
}
