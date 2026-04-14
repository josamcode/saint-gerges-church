import { useEffect, useId, useMemo, useRef, useState } from 'react';

export default function Tabs({
  tabs = [],
  defaultIndex = 0,
  variant = 'default',
  framedPanel,
  className = '',
  bodyClassName = '',
  panelClassName = '',
}) {
  const baseId = useId();
  const tabRefs = useRef([]);

  const safeDefaultIndex = useMemo(() => {
    if (!tabs.length) return 0;
    return Math.min(Math.max(defaultIndex, 0), tabs.length - 1);
  }, [defaultIndex, tabs.length]);

  const [active, setActive] = useState(safeDefaultIndex);

  useEffect(() => {
    if (active >= tabs.length) {
      setActive(Math.max(tabs.length - 1, 0));
    }
  }, [active, tabs.length]);

  useEffect(() => {
    setActive(safeDefaultIndex);
  }, [safeDefaultIndex]);

  if (!tabs.length) return null;

  const isInline = variant === 'inline';
  const shouldFramePanel = typeof framedPanel === 'boolean' ? framedPanel : !isInline;
  const activeTab = tabs[active] || tabs[0];
  const shellClassName = [
    isInline
      ? 'min-w-0'
      : 'overflow-hidden rounded-[24px] border border-border/60 bg-gradient-to-br from-surface via-surface to-surface-alt/30 shadow-[0_10px_30px_rgba(0,0,0,0.08)]',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const bodyClasses = [
    isInline ? '' : 'p-4 sm:p-5',
    bodyClassName,
  ]
    .filter(Boolean)
    .join(' ');
  const framedPanelClasses = [
    'rounded-[20px] border border-border/50 bg-surface/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5',
    panelClassName,
  ]
    .filter(Boolean)
    .join(' ');
  const unframedPanelClasses = ['min-w-0', panelClassName].filter(Boolean).join(' ');

  const moveToTab = (index) => {
    setActive(index);
    requestAnimationFrame(() => {
      tabRefs.current[index]?.focus();
    });
  };

  const handleKeyDown = (event, index) => {
    if (!tabs.length) return;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        moveToTab((index + 1) % tabs.length);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        moveToTab((index - 1 + tabs.length) % tabs.length);
        break;
      case 'Home':
        event.preventDefault();
        moveToTab(0);
        break;
      case 'End':
        event.preventDefault();
        moveToTab(tabs.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <section className="w-full min-w-0">
      <div className={shellClassName}>
        <div className={isInline ? 'mb-4' : 'border-b border-border/50 px-3 pt-3'}>
          <div
            role="tablist"
            aria-orientation="horizontal"
            className="scrollbar-none overflow-x-auto overscroll-x-contain"
          >
            <div
              className={[
                'inline-flex min-w-max items-center gap-2 rounded-[18px] p-1.5',
                isInline
                  ? 'border border-border/60 bg-surface-alt/40'
                  : 'bg-surface-alt/40',
              ].join(' ')}
            >
              {tabs.map((tab, index) => {
                const isActive = index === active;
                const tabId = `${baseId}-tab-${index}`;
                const panelId = `${baseId}-panel-${index}`;

                return (
                  <button
                    key={index}
                    ref={(el) => {
                      tabRefs.current[index] = el;
                    }}
                    id={tabId}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={panelId}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActive(index)}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                    className={[
                      'group relative rounded-[14px] px-4 py-3 text-sm font-semibold whitespace-nowrap',
                      'transition-all duration-300 ease-out focus:outline-none',
                      'focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                      isActive
                        ? 'bg-primary text-white shadow-[0_10px_20px_rgba(0,0,0,0.14)]'
                        : 'text-foreground/70 hover:bg-surface hover:text-foreground',
                    ].join(' ')}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <span
                        className={[
                          'h-2 w-2 rounded-full transition-all duration-300',
                          isActive
                            ? 'bg-white/90'
                            : 'bg-border group-hover:bg-primary/40',
                        ].join(' ')}
                        aria-hidden="true"
                      />
                      <span>{tab.label}</span>
                    </span>

                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-[14px] ring-1 ring-white/10"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={bodyClasses}>
          <div
            id={`${baseId}-panel-${active}`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${active}`}
            className="min-w-0 animate-fade-in"
          >
            {shouldFramePanel ? (
              <div className={framedPanelClasses}>{activeTab?.content}</div>
            ) : (
              <div className={unframedPanelClasses}>{activeTab?.content}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
