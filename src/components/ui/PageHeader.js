function joinClasses(...classes) {
  return classes.filter(Boolean).join(' ');
}

function HeaderContent({
  eyebrow,
  title,
  subtitle,
  titleTag,
  contentClassName,
  eyebrowClassName,
  titleClassName,
  subtitleClassName,
  children,
  childrenClassName,
}) {
  const TitleTag = titleTag || 'h1';

  return (
    <div className={contentClassName}>
      {eyebrow ? (
        <p className={joinClasses('text-[11px] font-semibold uppercase tracking-widest text-muted', eyebrowClassName)}>
          {eyebrow}
        </p>
      ) : null}
      {title ? (
        <TitleTag className={joinClasses('mt-1.5 text-3xl font-bold tracking-tight text-heading', titleClassName)}>
          {title}
        </TitleTag>
      ) : null}
      {subtitle ? (
        <p className={joinClasses('mt-1 text-sm text-muted', subtitleClassName)}>
          {subtitle}
        </p>
      ) : null}
      {children ? <div className={childrenClassName}>{children}</div> : null}
    </div>
  );
}

export default function PageHeader({
  eyebrow = '',
  title = '',
  subtitle = '',
  titleTag = 'h1',
  actions = null,
  className = '',
  contentClassName = '',
  actionsClassName = '',
  eyebrowClassName = '',
  titleClassName = '',
  subtitleClassName = '',
  children = null,
  childrenClassName = '',
  contentOnly = false,
}) {
  if (contentOnly) {
    return (
      <HeaderContent
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        titleTag={titleTag}
        contentClassName={contentClassName}
        eyebrowClassName={eyebrowClassName}
        titleClassName={titleClassName}
        subtitleClassName={subtitleClassName}
        children={children}
        childrenClassName={childrenClassName}
      />
    );
  }

  return (
    <div className={joinClasses('flex flex-wrap items-end justify-between gap-4', className)}>
      <HeaderContent
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        titleTag={titleTag}
        contentClassName={contentClassName}
        eyebrowClassName={eyebrowClassName}
        titleClassName={titleClassName}
        subtitleClassName={subtitleClassName}
        children={children}
        childrenClassName={childrenClassName}
      />
      {actions ? <div className={actionsClassName}>{actions}</div> : null}
    </div>
  );
}
